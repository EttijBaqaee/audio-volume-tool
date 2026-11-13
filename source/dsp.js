/* SPDX-License-Identifier: AGPL-3.0-only */
/* Local audio DSP. No network or persistent file storage. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AudioDSP = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const toDb = n => n > 0 ? 20 * Math.log10(n) : -Infinity;
  function validate(channels, sampleRate) {
    if (!channels || !channels.length || !channels[0].length || !Number.isFinite(sampleRate) || sampleRate < 1000) throw new Error('无效的音频数据。');
    if (channels.some(c => c.length !== channels[0].length)) throw new Error('音频声道长度不一致。');
  }
  function analyze(channels, sampleRate, bins = 850) {
    validate(channels, sampleRate);
    const length = channels[0].length;
    const peaks = new Float32Array(Math.min(bins, length));
    let peak = 0, sum = 0, clipped = 0;
    for (let c = 0; c < channels.length; c++) {
      const data = channels[c];
      for (let i = 0; i < length; i++) {
        const value = Number.isFinite(data[i]) ? data[i] : 0;
        const abs = Math.abs(value);
        peak = Math.max(peak, abs);
        sum += value * value;
        if (abs > 1) clipped++;
        const bin = Math.min(peaks.length - 1, Math.floor(i * peaks.length / length));
        if (abs > peaks[bin]) peaks[bin] = abs;
      }
    }
    const rms = Math.sqrt(sum / (length * channels.length));
    return { peak, rms, peakDb: toDb(peak), rmsDb: toDb(rms), clipped, duration: length / sampleRate, peaks };
  }
  const balanceModes = {
    gentle: { target: -22, maxBoost: 6, radius: 15 },
    standard: { target: -18, maxBoost: 12, radius: 10 },
    strong: { target: -16, maxBoost: 18, radius: 6 }
  };
  function speechFilters(sampleRate) {
    const biquad = (type, frequency, q, gainDb = 0) => {
      const angle = 2 * Math.PI * Math.min(frequency, sampleRate * .4) / sampleRate;
      const cosine = Math.cos(angle), alpha = Math.sin(angle) / (2 * q), a = Math.pow(10, gainDb / 40);
      let b0, b1, b2, a0, a1, a2;
      if (type === 'highpass') {
        b0 = (1 + cosine) / 2; b1 = -(1 + cosine); b2 = b0;
        a0 = 1 + alpha; a1 = -2 * cosine; a2 = 1 - alpha;
      } else {
        b0 = 1 + alpha * a; b1 = -2 * cosine; b2 = 1 - alpha * a;
        a0 = 1 + alpha / a; a1 = -2 * cosine; a2 = 1 - alpha / a;
      }
      return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
    };
    return [biquad('highpass', 100, Math.SQRT1_2), biquad('peak', 300, .7, -2), biquad('peak', 2600, .8, 4)];
  }
  async function emphasizeSpeech(channels, output, sampleRate, hooks) {
    const filters = speechFilters(sampleRate), n = channels[0].length;
    for (let c = 0; c < channels.length; c++) for (let stage = 0; stage < filters.length; stage++) {
      const input = stage === 0 ? channels[c] : output[c], target = output[c], filter = filters[stage];
      let z1 = 0, z2 = 0;
      for (let start = 0; start < n; start += 32768) {
        hooks.check();
        const end = Math.min(n, start + 32768);
        for (let i = start; i < end; i++) {
          const sample = Number.isFinite(input[i]) ? input[i] : 0;
          const value = filter.b0 * sample + z1;
          z1 = filter.b1 * sample - filter.a1 * value + z2;
          z2 = filter.b2 * sample - filter.a2 * value;
          target[i] = value;
        }
        hooks.progress(16 * (c * filters.length + stage + end / n) / (channels.length * filters.length));
        await hooks.pause();
      }
    }
  }
  async function process(channels, sampleRate, settings = {}, hooks = {}) {
    validate(channels, sampleRate);
    const n = channels[0].length;
    const output = channels.map(() => new Float32Array(n));
    const gain = settings.boostEnabled === false ? 1 : clamp(Number(settings.gain) || 1, .5, 4);
    const frame = Math.max(1, Math.round(sampleRate * .02));
    const count = Math.ceil(n / frame);
    const gainDb = new Float32Array(count);
    let lastProgress = 0;
    const notify = value => { lastProgress = Math.max(lastProgress, value); if (hooks.progress) hooks.progress(lastProgress); };
    const pause = hooks.yield || (() => Promise.resolve());
    const check = () => { if (hooks.cancelled && hooks.cancelled()) { const e = new Error('处理已取消'); e.name = 'AbortError'; throw e; } };
    check();
    if (settings.voiceEnabled) {
      await emphasizeSpeech(channels, output, sampleRate, { check, progress: notify, pause });
      channels = output;
    }
    if (settings.balanceEnabled) {
      const mode = balanceModes[settings.balanceStrength] || balanceModes.standard;
      const energy = new Float64Array(count + 1);
      for (let b = 0; b < count; b++) {
        const start = b * frame, end = Math.min(n, start + frame);
        let square = 0;
        for (const data of channels) for (let i = start; i < end; i++) { const v = Number.isFinite(data[i]) ? data[i] : 0; square += v * v; }
        energy[b + 1] = energy[b] + square / ((end - start) * channels.length);
        if (b % 512 === 0) { check(); notify(15 * b / count); await pause(); }
      }
      const desired = new Float64Array(count + 1);
      for (let b = 0; b < count; b++) {
        const start = Math.max(0, b - 4), end = Math.min(count, b + 5);
        const localDb = toDb(Math.sqrt(Math.max(0, (energy[end] - energy[start]) / (end - start))));
        // Avoid lifting silence or very quiet background noise.
        const gate = clamp((localDb + 55) / 12, 0, 1);
        const correction = clamp(mode.target - localDb, -18, mode.maxBoost);
        const safeCorrection = Number.isFinite(correction) ? correction * gate : 0;
        desired[b + 1] = desired[b] + safeCorrection;
      }
      for (let b = 0; b < count; b++) {
        const start = Math.max(0, b - mode.radius), end = Math.min(count, b + mode.radius + 1);
        gainDb[b] = (desired[end] - desired[start]) / (end - start);
      }
    }
    notify(18);
    for (let start = 0; start < n; start += 32768) {
      check();
      const end = Math.min(n, start + 32768);
      for (let i = start; i < end; i++) {
        const b = Math.min(count - 1, Math.floor(i / frame));
        const mix = (i % frame) / frame;
        const correctionDb = gainDb[b] + (gainDb[Math.min(count - 1, b + 1)] - gainDb[b]) * mix;
        const multiplier = gain * Math.pow(10, correctionDb / 20);
        for (let c = 0; c < channels.length; c++) {
          const sample = channels[c][i];
          output[c][i] = Number.isFinite(sample) ? sample * multiplier : 0;
        }
      }
      notify(18 + 46 * end / n);
      await pause();
    }
    let limitedFrames = 0;
    if (settings.limiterEnabled !== false) {
      // A stereo-linked lookahead limiter preserves the stereo image.
      const window = Math.max(1, Math.round(sampleRate * .005));
      const capacity = window + 3;
      const queueIndex = new Int32Array(capacity);
      const queuePeak = new Float32Array(capacity);
      let head = 0, tail = 0, next = 0, envelope = 1;
      const release = Math.exp(-1 / (.12 * sampleRate));
      const peakAt = i => { let peak = 0; for (const data of output) peak = Math.max(peak, Math.abs(data[i])); return peak; };
      for (let start = 0; start < n; start += 32768) {
        check();
        const end = Math.min(n, start + 32768);
        for (let i = start; i < end; i++) {
          while (head !== tail && queueIndex[head] < i) head = (head + 1) % capacity;
          const boundary = Math.min(n - 1, i + window);
          while (next <= boundary) {
            const peak = peakAt(next);
            while (head !== tail && queuePeak[(tail + capacity - 1) % capacity] <= peak) tail = (tail + capacity - 1) % capacity;
            queueIndex[tail] = next++;
            queuePeak[tail] = peak;
            tail = (tail + 1) % capacity;
          }
          const target = queuePeak[head] > .985 ? .985 / queuePeak[head] : 1;
          envelope = target < envelope ? target : release * envelope + (1 - release) * target;
          if (envelope < .999) limitedFrames++;
          for (const data of output) data[i] = clamp(data[i] * envelope, -.985, .985);
        }
        notify(64 + 34 * end / n);
        await pause();
      }
    }
    check(); notify(100);
    return { channels: output, analysis: analyze(output, sampleRate), limitedFrames };
  }
  async function encodeWav(channels, sampleRate, bits = 16, hooks = {}) {
    validate(channels, sampleRate);
    if (bits !== 16 && bits !== 24) throw new Error('WAV 仅支持 16-bit 或 24-bit PCM。');
    const n = channels[0].length, count = channels.length, bytes = bits / 8;
    const size = n * count * bytes;
    if (size > 0xffffffff - 36) throw new Error('WAV 输出超过 4 GB，请使用 MP3。');
    const result = new ArrayBuffer(44 + size), view = new DataView(result);
    const text = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
    text(0, 'RIFF'); view.setUint32(4, 36 + size, true); text(8, 'WAVE'); text(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, count, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * count * bytes, true);
    view.setUint16(32, count * bytes, true); view.setUint16(34, bits, true); text(36, 'data'); view.setUint32(40, size, true);
    let offset = 44;
    for (let start = 0; start < n; start += 32768) {
      if (hooks.cancelled && hooks.cancelled()) { const e = new Error('导出已取消'); e.name = 'AbortError'; throw e; }
      const end = Math.min(n, start + 32768);
      for (let i = start; i < end; i++) for (let c = 0; c < count; c++) {
        const v = Number.isFinite(channels[c][i]) ? clamp(channels[c][i], -1, 1) : 0;
        if (bits === 16) { view.setInt16(offset, Math.round(v * (v < 0 ? 32768 : 32767)), true); offset += 2; }
        else { const value = Math.round(v * (v < 0 ? 8388608 : 8388607)); view.setUint8(offset++, value & 255); view.setUint8(offset++, (value >> 8) & 255); view.setUint8(offset++, (value >> 16) & 255); }
      }
      if (hooks.progress) hooks.progress(end / n * 100);
      if (hooks.yield) await hooks.yield();
    }
    return result;
  }
  return { analyze, process, encodeWav, toDb, clamp, balanceModes };
});
