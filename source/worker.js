/* SPDX-License-Identifier: AGPL-3.0-only */
'use strict';
let originalChannels = null;
let originalSampleRate = 44100;
let generation = 0;
const pauseWorker = () => new Promise(resolve => setTimeout(resolve, 0));
self.onmessage = async function (event) {
  const data = event.data;
  const id = data.id;
  if (data.op === 'cancel' || data.op === 'clear') {
    generation++;
    if (data.op === 'clear') originalChannels = null;
    return;
  }
  const token = ++generation;
  const hooks = {
    yield: pauseWorker,
    cancelled: () => token !== generation,
    progress: value => self.postMessage({ id, type: 'progress', value })
  };
  try {
    if (data.op === 'load') {
      originalChannels = data.channels;
      originalSampleRate = data.sampleRate;
      const analysis = AudioDSP.analyze(originalChannels, originalSampleRate);
      self.postMessage({ id, type: 'complete', payload: { analysis } });
    } else if (data.op === 'render') {
      if (!originalChannels) throw new Error('请先选择音频文件。');
      const result = await AudioDSP.process(originalChannels, originalSampleRate, data.settings, hooks);
      if (token !== generation) return;
      self.postMessage({ id, type: 'complete', payload: result }, result.channels.map(channel => channel.buffer));
    } else if (data.op === 'export') {
      let buffer;
      if (data.format === 'wav') buffer = await AudioDSP.encodeWav(data.channels, data.sampleRate, Number(data.quality), hooks);
      else {
        const channels = data.channels, n = channels[0].length;
        const encoder = new lamejs.Mp3Encoder(channels.length, data.sampleRate, Number(data.quality));
        const chunks = [];
        const pcm = channels.map(() => new Int16Array(1152));
        for (let start = 0; start < n; start += 1152) {
          if (hooks.cancelled()) { const e = new Error('导出已取消'); e.name = 'AbortError'; throw e; }
          const length = Math.min(1152, n - start);
          for (let c = 0; c < channels.length; c++) for (let i = 0; i < length; i++) {
            const sample = AudioDSP.clamp(channels[c][start + i], -1, 1);
            pcm[c][i] = Math.round(sample * (sample < 0 ? 32768 : 32767));
          }
          const left = pcm[0].subarray(0, length);
          const encoded = channels.length === 1 ? encoder.encodeBuffer(left) : encoder.encodeBuffer(left, pcm[1].subarray(0, length));
          if (encoded.length) chunks.push(new Uint8Array(encoded));
          if (start % (1152 * 32) === 0) { hooks.progress(start / n * 100); await hooks.yield(); }
        }
        const last = encoder.flush();
        if (last.length) chunks.push(new Uint8Array(last));
        const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
        buffer = bytes.buffer;
      }
      if (token !== generation) return;
      self.postMessage({ id, type: 'complete', payload: { buffer } }, [buffer]);
    }
  } catch (error) {
    if (token === generation) self.postMessage({ id, type: 'error', name: error.name, message: error.message || '音频处理失败。' });
  }
};
