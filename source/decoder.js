/* SPDX-License-Identifier: AGPL-3.0-only */
/* Single-thread FFmpeg, with an embedded wasmBinary. No fetching is needed. */
'use strict';
self.onmessage = async function (event) {
  const data = event.data;
  let core;
  try {
    self.postMessage({ type: 'status', message: '正在启动本地格式解码器…' });
    core = await createFFmpegCore({ wasmBinary: new Uint8Array(data.wasm) });
    const input = '/input.' + (data.extension || 'audio').replace(/[^a-zA-Z0-9]/g, '');
    core.FS.writeFile(input, new Uint8Array(data.bytes));
    const messages = [];
    core.setLogger(({ type, message }) => { if (type === 'stdout') messages.push(message); });
    const probeResult = core.ffprobe('-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate,channels:format=duration', '-of', 'json', input);
    // This core leaves ret at -1 on successful ffprobe runs; validate its JSON too.
    if (probeResult > 0 || !messages.length) throw new Error('无法识别音频格式，文件可能已损坏或受保护。');
    let metadata;
    try { metadata = JSON.parse(messages.join('\n')); }
    catch (error) { throw new Error('无法识别音频信息，文件可能已损坏或受保护。'); }
    if (!metadata.streams || !metadata.streams.length) throw new Error('文件中没有可读取的音轨。');
    const info = metadata.streams[0];
    const channels = Number(info.channels) === 1 ? 1 : 2;
    const sampleRate = Math.max(8000, Math.min(96000, Number(info.sample_rate) || 44100));
    const duration = Number(metadata.format && metadata.format.duration);
    if (Number.isFinite(duration) && duration * sampleRate * channels * 4 > 384 * 1024 * 1024) throw new Error('音频解码后过大，请使用更短的音频文件。');
    core.reset();
    let lastMessage = '';
    core.setLogger(({ type, message }) => { if (type === 'stderr') lastMessage = message; });
    core.setProgress(({ progress }) => self.postMessage({ type: 'progress', value: Math.max(0, Math.min(100, progress * 100)) }));
    core.setTimeout(120000);
    self.postMessage({ type: 'status', message: '正在本地解码音频…' });
    const result = core.exec('-v', 'error', '-i', input, '-map', '0:a:0', '-vn', '-ac', String(channels), '-ar', String(sampleRate), '-c:a', 'pcm_f32le', '-f', 'f32le', '/decoded.pcm');
    if (result !== 0) throw new Error('该文件无法解码。' + (lastMessage.includes('Invalid') ? '请检查文件是否损坏。' : '请确认文件未加密且包含有效音轨。'));
    const pcmBytes = core.FS.readFile('/decoded.pcm');
    if (pcmBytes.byteLength > 384 * 1024 * 1024) throw new Error('音频解码后过大，请使用更短的音频文件。');
    const interleaved = new Float32Array(pcmBytes.buffer, pcmBytes.byteOffset, Math.floor(pcmBytes.byteLength / 4));
    const length = Math.floor(interleaved.length / channels);
    if (!length) throw new Error('音频不包含有效采样。');
    const output = Array.from({ length: channels }, () => new Float32Array(length));
    for (let c = 0; c < channels; c++) for (let i = 0; i < length; i++) output[c][i] = interleaved[i * channels + c];
    core.FS.unlink(input); core.FS.unlink('/decoded.pcm');
    self.postMessage({ type: 'complete', channels: output, sampleRate }, output.map(channel => channel.buffer));
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message || '本地解码失败，请尝试其他音频。' });
  }
};
