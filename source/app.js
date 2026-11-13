/* SPDX-License-Identifier: AGPL-3.0-only */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const text = (element, value, literal = false) => window.AudioI18n.setText(element, value, literal);
  const state = {
    context: null, buffer: null, processed: null, inputAnalysis: null, outputAnalysis: null,
    fileName: '', fileSize: 0, loading: false, rendering: false, exporting: false,
    previewMode: 'processed', source: null, playing: false, offset: 0, startedAt: 0,
    raf: 0, playRevision: 0, loadRevision: 0, renderRevision: 0, exportRevision: 0,
    downloadUrl: null, renderTimer: null, decoder: null, decoderReject: null, worker: null,
    jobId: 0, jobs: new Map(), unavailable: false
  };
  const time = seconds => { if (!Number.isFinite(seconds)) return '--:--'; const s = Math.max(0, Math.floor(seconds)); return (Math.floor(s / 60)).toString().padStart(2, '0') + ':' + (s % 60).toString().padStart(2, '0'); };
  const bytes = size => size >= 1048576 ? (size / 1048576).toFixed(2) + ' MB' : (size / 1024).toFixed(1) + ' KB';
  const db = value => Number.isFinite(value) ? value.toFixed(1) : '−∞';
  const abortError = () => Object.assign(new Error('操作已取消'), { name: 'AbortError' });
  function log(message, level = '信息') {
    const row = document.createElement('tr');
    const timestamp = document.createElement('td'), type = document.createElement('td'), content = document.createElement('td');
    text(timestamp, new Date().toLocaleTimeString('zh-CN', { hour12: false }));
    text(type, level); type.className = level === '完成' ? 'green' : level === '错误' ? 'red' : level === '提示' ? 'yellow' : 'blue';
    text(content, message); row.append(timestamp, type, content); $('log-body').append(row);
    while ($('log-body').children.length > 60) $('log-body').firstElementChild.remove();
    const scroll = document.querySelector('.log-scroll'); scroll.scrollTop = scroll.scrollHeight;
  }
  function setStatus(message, kind = 'ready') { text($('status-text'), message); $('system-status').dataset.state = kind; }
  function report(error) { if (error.name === 'AbortError') return; const message = error.message || '操作失败，请重试。'; setStatus(message, 'error'); log(message, '错误'); }
  function settings() { return { boostEnabled: $('boost-enabled').checked, gain: Number($('gain-range').value) / 100, balanceEnabled: $('balance-enabled').checked, balanceStrength: $('balance-strength').value, voiceEnabled: $('voice-enabled').checked, limiterEnabled: $('limiter-enabled').checked }; }
  function updateControls() {
    const loaded = !!state.buffer && !!state.inputAnalysis;
    const locked = state.exporting || state.unavailable;
    for (const id of ['choose-file', 'load-demo', 'drop-zone']) $(id).disabled = locked;
    $('clear-file').disabled = locked || (!state.buffer && !state.loading);
    for (const id of ['boost-enabled', 'balance-enabled', 'voice-enabled', 'limiter-enabled', 'export-format', 'export-quality']) $(id).disabled = locked;
    $('gain-range').disabled = locked || !$('boost-enabled').checked;
    $('gain-number').disabled = locked || !$('boost-enabled').checked;
    for (const button of document.querySelectorAll('[data-gain]')) button.disabled = locked || !$('boost-enabled').checked;
    $('balance-strength').disabled = locked || !$('balance-enabled').checked;
    text($('balance-state'), $('balance-enabled').checked ? '已启用' : '未启用');
    $('balance-state').className = 'small ' + ($('balance-enabled').checked ? 'green' : 'muted');
    text($('limiter-state'), $('limiter-enabled').checked ? '峰值保护已启用' : '关闭保护可能导致失真');
    $('limiter-state').className = 'small ' + ($('limiter-enabled').checked ? 'green' : 'red');
    $('play-button').disabled = !loaded || state.loading || (state.previewMode === 'processed' && (!state.processed || state.rendering));
    text($('play-button'), state.playing ? 'Ⅱ 暂停' : '▶ 播放');
    $('stop-button').disabled = !loaded;
    $('mode-original').disabled = !loaded;
    $('mode-processed').disabled = !loaded || !state.processed || state.rendering;
    $('seek-range').disabled = !loaded;
    $('export-button').disabled = !loaded || !state.processed || state.rendering || state.exporting || state.loading;
    $('cancel-button').hidden = !state.exporting;
    $('export-button').hidden = state.exporting;
    for (const mode of ['original', 'processed']) { $('mode-' + mode).classList.toggle('selected', state.previewMode === mode); $('mode-' + mode).setAttribute('aria-pressed', String(state.previewMode === mode)); }
  }
  function getContext() {
    if (!state.context) { const AudioContextClass = window.AudioContext || window.webkitAudioContext; if (!AudioContextClass) throw new Error('当前浏览器不支持音频处理，请使用新版 Chrome、Edge 或 Firefox。'); state.context = new AudioContextClass(); }
    return state.context;
  }
  function makeWorker(sourceId) { const url = URL.createObjectURL(new Blob([$(sourceId).textContent], { type: 'text/javascript' })); const worker = new Worker(url); URL.revokeObjectURL(url); return worker; }
  function initWorker() {
    state.worker = makeWorker('audio-worker-source');
    state.worker.onmessage = event => {
      const data = event.data, pending = state.jobs.get(data.id); if (!pending) return;
      if (data.type === 'progress') { if (pending.progress) pending.progress(data.value); return; }
      state.jobs.delete(data.id);
      if (data.type === 'error') pending.reject(Object.assign(new Error(data.message), { name: data.name || 'Error' }));
      else pending.resolve(data.payload);
    };
    state.worker.onerror = event => { const error = new Error('本地音频处理线程异常，请重新打开页面。'); for (const pending of state.jobs.values()) pending.reject(error); state.jobs.clear(); report(error); state.unavailable = true; updateControls(); event.preventDefault(); };
  }
  function job(op, payload, progress, transfer = []) {
    return new Promise((resolve, reject) => { const id = ++state.jobId; state.jobs.set(id, { resolve, reject, progress }); try { state.worker.postMessage({ id, op, ...payload }, transfer); } catch (error) { state.jobs.delete(id); reject(error); } });
  }
  function cancelJobs(clear = false) { if (state.worker) state.worker.postMessage({ op: clear ? 'clear' : 'cancel' }); for (const pending of state.jobs.values()) pending.reject(abortError()); state.jobs.clear(); }
  function cancelDecoder() { if (state.decoder) { state.decoder.terminate(); state.decoder = null; } if (state.decoderReject) { state.decoderReject(abortError()); state.decoderReject = null; } }
  function clearDownload() { if (state.downloadUrl) URL.revokeObjectURL(state.downloadUrl); state.downloadUrl = null; $('download-result').hidden = true; $('download-link').removeAttribute('href'); }
  function updateFile() {
    const buffer = state.buffer;
    text($('file-name'), buffer ? state.fileName : '未选择', !!buffer); $('file-name').title = buffer ? state.fileName : '';
    text($('file-duration'), buffer ? time(buffer.duration) : '--:--');
    text($('file-rate'), buffer ? buffer.sampleRate.toLocaleString('en-US') + ' Hz' : '-- Hz');
    text($('file-channels'), buffer ? (buffer.numberOfChannels === 1 ? '单声道' : '立体声') : '--');
    text($('drop-title'), buffer ? state.fileName : '拖放音频文件到这里', !!buffer);
    text($('drop-subtitle'), buffer ? '点击或拖入另一个文件' : '或点击选择本地文件');
    text($('file-size'), buffer ? bytes(state.fileSize) + ' · ' + time(buffer.duration) : '单文件 ≤ 100 MB');
    text($('axis-mid'), buffer ? time(buffer.duration / 2) : '--:--'); text($('axis-end'), buffer ? time(buffer.duration) : '--:--');
    $('waveform-empty').hidden = !!buffer;
    window.AudioI18n.setAttribute($('waveform'), 'aria-label', buffer ? state.fileName + ' 音频波形' : '音频波形，载入音频后显示');
    paintPlayback();
  }
  function wavePath(peaks) {
    if (!peaks || !peaks.length) return '';
    const top = [], bottom = [];
    for (let i = 0; i < peaks.length; i++) { const x = i / Math.max(1, peaks.length - 1) * 1000, y = Math.min(1, peaks[i]) * 86; top.push(x.toFixed(1) + ',' + (100 - y).toFixed(1)); bottom.push(x.toFixed(1) + ',' + (100 + y).toFixed(1)); }
    return 'M' + top.join('L') + 'L' + bottom.reverse().join('L') + 'Z';
  }
  function updateAnalysis(kind, analysis) {
    const prefix = kind === 'input' ? 'input' : 'output';
    text($(prefix + '-peak'), analysis ? db(analysis.peakDb) : '--');
    text($(prefix + '-rms'), analysis ? db(analysis.rmsDb) : '--');
    text($(prefix + '-peak-label'), analysis ? db(analysis.peakDb) + ' dBFS' : '-- dBFS');
    $(prefix + '-meter').style.width = analysis ? AudioDSP.clamp((analysis.peakDb + 60) / 60 * 100, 0, 100) + '%' : '0%';
    $(kind === 'input' ? 'original-wave' : 'processed-wave').setAttribute('d', analysis ? wavePath(analysis.peaks) : '');
  }
  async function fallbackDecode(arrayBuffer, fileName, revision) {
    if (typeof WebAssembly === 'undefined') throw new Error('此格式需要 WebAssembly，本浏览器不支持，请使用新版浏览器。');
    setStatus('正在启动本地格式解码器…', 'busy'); log('原生解码不支持该格式，切换到内置本地解码器。');
    await new Promise(resolve => setTimeout(resolve, 0));
    if (revision !== state.loadRevision) throw abortError();
    const encoded = $('audio-decoder-wasm').textContent.trim();
    const raw = atob(encoded), wasm = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) wasm[i] = raw.charCodeAt(i);
    const decoder = makeWorker('audio-decoder-source'); state.decoder = decoder;
    return new Promise((resolve, reject) => {
      state.decoderReject = reject;
      const cleanup = () => { decoder.terminate(); if (state.decoder === decoder) state.decoder = null; state.decoderReject = null; };
      decoder.onmessage = event => {
        if (revision !== state.loadRevision) { cleanup(); reject(abortError()); return; }
        const data = event.data;
        if (data.type === 'status') setStatus(data.message, 'busy');
        else if (data.type === 'progress') setStatus('正在本地解码 ' + Math.round(data.value) + '%', 'busy');
        else if (data.type === 'error') { cleanup(); reject(new Error(data.message)); }
        else if (data.type === 'complete') { const buffer = getContext().createBuffer(data.channels.length, data.channels[0].length, data.sampleRate); data.channels.forEach((channel, i) => buffer.copyToChannel(channel, i)); cleanup(); log('内置解码完成，未发生网络传输。', '完成'); resolve(buffer); }
      };
      decoder.onerror = event => { cleanup(); event.preventDefault(); reject(new Error('本地解码器启动失败，或设备内存不足。请使用新版浏览器并重试。')); };
      const extension = fileName.split('.').pop().toLowerCase();
      decoder.postMessage({ bytes: arrayBuffer, wasm: wasm.buffer, extension }, [arrayBuffer, wasm.buffer]);
    });
  }
  function beginLoad() {
    const revision = ++state.loadRevision; ++state.renderRevision; ++state.exportRevision;
    clearTimeout(state.renderTimer); stopPlayback(false); cancelJobs(true); cancelDecoder(); clearDownload();
    state.loading = true; state.rendering = false; state.buffer = null; state.processed = null; state.inputAnalysis = null; state.outputAnalysis = null; state.offset = 0;
    updateFile(); updateAnalysis('input', null); updateAnalysis('output', null); updateControls();
    text($('file-state'), '正在载入…'); text($('level-note'), '正在读取本地音频…');
    setStatus('正在读取本地音频…', 'busy'); return revision;
  }
  async function adoptBuffer(buffer, name, size, revision) {
    if (revision !== state.loadRevision) return;
    if (!buffer.length || buffer.length * buffer.numberOfChannels * 4 > 384 * 1048576) throw new Error('音频解码后过大，请使用更短的音频文件。');
    if (buffer.numberOfChannels > 2) {
      const offline = new OfflineAudioContext(2, buffer.length, buffer.sampleRate), source = offline.createBufferSource(); source.buffer = buffer; source.connect(offline.destination); source.start(); buffer = await offline.startRendering();
      if (revision !== state.loadRevision) return; log('多声道音频已混合为立体声。', '提示');
    }
    state.buffer = buffer; state.fileName = name; state.fileSize = size;
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c).slice());
    const result = await job('load', { channels, sampleRate: buffer.sampleRate }, null, channels.map(c => c.buffer));
    if (revision !== state.loadRevision) return;
    state.inputAnalysis = result.analysis; state.loading = false;
    updateFile(); updateAnalysis('input', result.analysis); updateControls();
    log('已载入 ' + name + '，时长 ' + time(buffer.duration) + '，' + buffer.sampleRate + ' Hz。', '完成');
    text($('export-note'), '试听音量与系统音量有关，请先从较低的设备音量开始。');
    scheduleRender(true);
  }
  async function loadFile(file) {
    if (!file || state.exporting) return;
    if (file.size > 100 * 1048576) { report(new Error('文件超过 100 MB 上限，请选择较小的音频。')); return; }
    if (!file.size) { report(new Error('文件为空，请选择有效的音频文件。')); return; }
    const revision = beginLoad();
    try {
      const data = await file.arrayBuffer(); if (revision !== state.loadRevision) return;
      let buffer;
      try { buffer = await getContext().decodeAudioData(data.slice(0)); }
      catch (error) { if (revision !== state.loadRevision) return; buffer = await fallbackDecode(data, file.name, revision); }
      await adoptBuffer(buffer, file.name, file.size, revision);
    } catch (error) {
      if (revision !== state.loadRevision || error.name === 'AbortError') return;
      state.loading = false; state.buffer = null; state.inputAnalysis = null; updateFile(); updateControls(); text($('file-state'), '载入失败'); text($('level-note'), '请检查音频是否损坏或受加密保护。'); report(error);
    }
  }
  function clearFile() {
    ++state.loadRevision; ++state.renderRevision; ++state.exportRevision;
    clearTimeout(state.renderTimer); stopPlayback(false); cancelJobs(true); cancelDecoder(); clearDownload();
    Object.assign(state, { buffer: null, processed: null, inputAnalysis: null, outputAnalysis: null, loading: false, rendering: false, exporting: false, offset: 0, fileName: '', fileSize: 0 });
    $('file-input').value = ''; text($('file-state'), '等待载入音频'); text($('level-note'), '载入后自动分析，调整后自动更新。'); $('progress-area').hidden = true; text($('export-note'), '先选择音频，再试听或导出。导出文件直接保存到你的设备。');
    updateFile(); updateAnalysis('input', null); updateAnalysis('output', null); updateControls(); setStatus('系统就绪'); log('已释放当前音频与导出文件的内存。');
  }
  function setGain(value) {
    value = AudioDSP.clamp(Math.round(Number(value) || 100), 50, 400);
    $('gain-range').value = value; $('gain-number').value = value;
    const gainDb = 20 * Math.log10(value / 100);
    text($('gain-display'), value + '%'); text($('gain-db'), (gainDb > 0 ? '+' : '') + gainDb.toFixed(2) + ' dB');
    for (const button of document.querySelectorAll('[data-gain]')) { const active = Number(button.dataset.gain) === value; button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active)); }
    scheduleRender();
  }
  function scheduleRender(immediate = false) {
    updateControls(); if (!state.buffer || !state.inputAnalysis || state.loading || state.exporting) return;
    clearTimeout(state.renderTimer); cancelJobs(); clearDownload();
    ++state.renderRevision;
    if (state.previewMode === 'processed') stopPlayback(true);
    state.processed = null; state.outputAnalysis = null; state.rendering = true; updateAnalysis('output', null); updateControls();
    text($('file-state'), '正在计算效果…'); setStatus('正在计算音频效果…', 'busy');
    const revision = state.renderRevision;
    state.renderTimer = setTimeout(() => render(revision), immediate ? 0 : 180);
  }
  async function render(revision) {
    try {
      const selected = settings();
      const result = await job('render', { settings: selected }, value => { if (revision === state.renderRevision) setStatus('正在计算音频效果 ' + Math.round(value) + '%', 'busy'); });
      if (revision !== state.renderRevision || !state.buffer) return;
      const buffer = getContext().createBuffer(result.channels.length, result.channels[0].length, state.buffer.sampleRate);
      result.channels.forEach((channel, index) => buffer.copyToChannel(channel, index));
      state.processed = buffer; state.outputAnalysis = result.analysis; state.rendering = false;
      updateAnalysis('output', result.analysis); updateControls();
      text($('file-state'), '处理完成 · 可试听或下载');
      if (!selected.limiterEnabled && result.analysis.clipped) { text($('level-note'), '输出超过 0 dBFS，可能产生失真；建议启用峰值保护。'); $('level-note').className = 'small red level-note'; }
      else { text($('level-note'), result.analysis.rms === 0 ? '音频为静音，增强不会产生声音。' : '峰值保护: ' + (selected.limiterEnabled ? '开启' : '关闭') + ' · 音量均衡: ' + (selected.balanceEnabled ? '开启' : '关闭')); $('level-note').className = 'small muted level-note'; }
      setStatus('处理完成，可试听或下载');
      log('效果已更新：音量 ' + (selected.boostEnabled ? Math.round(selected.gain * 100) + '%' : '关闭') + '，均衡 ' + (selected.balanceEnabled ? ({ gentle: '轻柔', standard: '标准', strong: '明显' }[selected.balanceStrength]) : '关闭') + '，人声 ' + (selected.voiceEnabled ? '开启' : '关闭') + '，输出峰值 ' + db(result.analysis.peakDb) + ' dBFS。', '完成');
    } catch (error) { if (revision !== state.renderRevision || error.name === 'AbortError') return; state.rendering = false; updateControls(); text($('file-state'), '处理失败'); report(error); }
  }
  function position() { return state.buffer ? AudioDSP.clamp(state.playing ? state.context.currentTime - state.startedAt : state.offset, 0, state.buffer.duration) : 0; }
  function paintPlayback() {
    const current = position(), duration = state.buffer ? state.buffer.duration : 0;
    text($('play-time'), time(current) + ' / ' + time(duration));
    $('seek-range').value = duration ? Math.round(current / duration * 1000) : 0;
    $('playhead').toggleAttribute('hidden', !state.buffer);
    const x = duration ? current / duration * 1000 : 0; $('playhead').setAttribute('x1', x); $('playhead').setAttribute('x2', x);
    if (state.playing) state.raf = requestAnimationFrame(paintPlayback);
  }
  function stopPlayback(preserve = true) {
    ++state.playRevision; const current = preserve ? position() : 0;
    if (state.source) { const source = state.source; state.source = null; source.onended = null; try { source.stop(); } catch (error) {} source.disconnect(); }
    state.playing = false; state.offset = current; cancelAnimationFrame(state.raf); paintPlayback(); updateControls();
  }
  async function startPlayback() {
    const buffer = state.previewMode === 'original' ? state.buffer : state.processed; if (!buffer || state.loading) return;
    const revision = ++state.playRevision;
    try {
      const context = getContext(); await context.resume(); if (revision !== state.playRevision) return;
      if (state.offset >= buffer.duration - .01) state.offset = 0;
      const source = context.createBufferSource(); source.buffer = buffer; source.connect(context.destination);
      state.source = source; state.startedAt = context.currentTime - state.offset; state.playing = true;
      source.onended = () => { if (state.source !== source) return; state.source = null; source.disconnect(); state.playing = false; state.offset = 0; cancelAnimationFrame(state.raf); paintPlayback(); updateControls(); };
      source.start(0, state.offset); updateControls(); paintPlayback();
    } catch (error) { state.playing = false; updateControls(); report(error); }
  }
  function setPreviewMode(mode) { const playing = state.playing; stopPlayback(true); state.previewMode = mode; updateControls(); if (playing) startPlayback(); }
  function seek(fraction) { if (!state.buffer) return; const playing = state.playing; stopPlayback(false); state.offset = AudioDSP.clamp(fraction, 0, 1) * state.buffer.duration; paintPlayback(); if (playing) startPlayback(); }
  async function exportAudio() {
    if (!state.processed || state.rendering || state.exporting) return;
    const revision = ++state.exportRevision;
    state.exporting = true; updateControls(); clearDownload();
    $('progress-area').hidden = false; $('export-progress').value = 0; text($('progress-text'), '准备导出…');
    const format = $('export-format').value, quality = $('export-quality').value;
    setStatus('正在导出 ' + format.toUpperCase() + '…', 'busy'); log('开始本地编码 ' + format.toUpperCase() + '。');
    try {
      let buffer = state.processed;
      if (format === 'mp3' && ![8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000].includes(buffer.sampleRate)) {
        const offline = new OfflineAudioContext(buffer.numberOfChannels, Math.ceil(buffer.duration * 44100), 44100), source = offline.createBufferSource(); source.buffer = buffer; source.connect(offline.destination); source.start(); buffer = await offline.startRendering();
        if (revision !== state.exportRevision) return; log('MP3 输出已转换为 44,100 Hz。', '提示');
      }
      const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c).slice());
      const result = await job('export', { channels, sampleRate: buffer.sampleRate, format, quality }, value => {
        if (revision !== state.exportRevision) return; $('export-progress').value = value; text($('progress-text'), '编码进度 ' + Math.round(value) + '%');
      }, channels.map(channel => channel.buffer));
      if (revision !== state.exportRevision) return;
      const blob = new Blob([result.buffer], { type: format === 'mp3' ? 'audio/mpeg' : 'audio/wav' });
      state.downloadUrl = URL.createObjectURL(blob);
      const selected = settings(), reducing = selected.boostEnabled && selected.gain < 1;
      const suffixKey = selected.boostEnabled && selected.balanceEnabled ? (reducing ? '降低均衡' : '增强均衡') : selected.balanceEnabled ? '音量均衡' : selected.boostEnabled ? (reducing ? '音量降低' : '音量增强') : '处理后';
      const suffix = window.AudioI18n.translate(suffixKey) + (selected.voiceEnabled ? '_' + window.AudioI18n.translate('人声突出') : '');
      const name = state.fileName.replace(/\.[^./\\]+$/, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_') + '_' + suffix + '.' + format;
      $('download-link').href = state.downloadUrl; $('download-link').download = name; text($('download-size'), bytes(blob.size));
      $('download-result').hidden = false; $('export-progress').value = 100; text($('progress-text'), '导出完成');
      $('download-link').click(); setStatus('导出完成，文件已生成'); log('已生成 ' + name + '（' + bytes(blob.size) + '）。若未自动保存，可点击“重新下载”。', '完成');
    } catch (error) { if (revision === state.exportRevision) report(error); }
    finally { if (revision === state.exportRevision) { state.exporting = false; $('progress-area').hidden = true; updateControls(); } }
  }
  function cancelExport() { ++state.exportRevision; cancelJobs(); state.exporting = false; $('progress-area').hidden = true; updateControls(); setStatus('导出已取消，可重新导出'); log('已取消导出。', '提示'); }
  async function loadDemo() {
    if (state.exporting) return;
    const revision = beginLoad();
    try {
      const sampleRate = 44100, duration = 9, buffer = getContext().createBuffer(2, sampleRate * duration, sampleRate);
      for (let c = 0; c < 2; c++) { const channel = buffer.getChannelData(c); for (let i = 0; i < channel.length; i++) { const t = i / sampleRate; const amplitude = t < 3 ? .035 : t < 6 ? .32 : .085; const envelope = Math.min(1, t * 12, (duration - t) * 12); const pulse = .78 + .22 * Math.sin(2 * Math.PI * .8 * t); channel[i] = (Math.sin(2 * Math.PI * (220 + 55 * c) * t) + .3 * Math.sin(2 * Math.PI * 440 * t)) * amplitude * envelope * pulse; } }
      await adoptBuffer(buffer, window.AudioI18n.translate('本地示例_音量起伏.wav'), buffer.length * 4 + 44, revision);
      log('示例由当前页面直接合成，可开启音量均衡试听强弱变化。');
    } catch (error) { if (revision === state.loadRevision) { state.loading = false; updateControls(); report(error); } }
  }
  $('choose-file').addEventListener('click', () => $('file-input').click());
  $('drop-zone').addEventListener('click', () => $('file-input').click());
  $('file-input').addEventListener('change', event => { const file = event.target.files[0]; event.target.value = ''; loadFile(file); });
  for (const type of ['dragenter', 'dragover']) $('drop-zone').addEventListener(type, event => { event.preventDefault(); if (!state.exporting) $('drop-zone').classList.add('dragging'); });
  for (const type of ['dragleave', 'drop']) $('drop-zone').addEventListener(type, event => { event.preventDefault(); $('drop-zone').classList.remove('dragging'); if (type === 'drop' && !state.exporting) { const files = event.dataTransfer.files; if (files.length > 1) log('一次处理一个文件，已选择第一个文件。', '提示'); loadFile(files[0]); } });
  document.addEventListener('dragover', event => event.preventDefault());
  document.addEventListener('drop', event => event.preventDefault());
  $('load-demo').addEventListener('click', loadDemo); $('clear-file').addEventListener('click', clearFile);
  $('gain-range').addEventListener('input', event => setGain(event.target.value)); $('gain-number').addEventListener('change', event => setGain(event.target.value));
  for (const button of document.querySelectorAll('[data-gain]')) button.addEventListener('click', () => setGain(button.dataset.gain));
  for (const id of ['boost-enabled', 'balance-enabled', 'balance-strength', 'voice-enabled', 'limiter-enabled']) $(id).addEventListener('change', () => scheduleRender());
  $('play-button').addEventListener('click', () => state.playing ? stopPlayback(true) : startPlayback()); $('stop-button').addEventListener('click', () => stopPlayback(false));
  $('mode-original').addEventListener('click', () => setPreviewMode('original')); $('mode-processed').addEventListener('click', () => setPreviewMode('processed'));
  $('seek-range').addEventListener('input', event => seek(Number(event.target.value) / 1000));
  $('waveform-wrap').addEventListener('click', event => { const rect = $('waveform-wrap').getBoundingClientRect(); seek((event.clientX - rect.left) / rect.width); });
  $('export-button').addEventListener('click', exportAudio); $('cancel-button').addEventListener('click', cancelExport);
  $('export-format').addEventListener('change', () => {
    $('export-quality').replaceChildren();
    const options = $('export-format').value === 'mp3' ? [['128', '128 kbps'], ['192', '192 kbps'], ['320', '320 kbps']] : [['16', '16-bit PCM'], ['24', '24-bit PCM']];
    for (const [value, label] of options) { const option = document.createElement('option'); option.value = value; text(option, label); $('export-quality').append(option); }
    $('export-quality').value = $('export-format').value === 'mp3' ? '192' : '16'; clearDownload();
  });
  $('export-quality').addEventListener('change', clearDownload);
  $('clear-log').addEventListener('click', () => { $('log-body').replaceChildren(); log('日志已清空。'); });
  window.addEventListener('pagehide', () => { stopPlayback(false); cancelDecoder(); if (state.worker) state.worker.terminate(); clearDownload(); if (state.context) state.context.close(); state.buffer = null; state.processed = null; });
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
  try { initWorker(); log('系统就绪。选择音频后即可增强或均衡音量。'); log('本地隐私模式已启用，页面禁止联网请求。', '完成'); }
  catch (error) { state.unavailable = true; report(new Error('当前浏览器不支持本地处理线程，请使用新版 Chrome、Edge 或 Firefox。')); }
  updateControls();
})();
