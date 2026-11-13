/* SPDX-License-Identifier: AGPL-3.0-only */
(function () {
  'use strict';
  const storageKey = 'audio-volume-language';
  const strings = {
    '在线音频音量增强器 · 本地处理': 'Online Audio Volume Booster · Local Processing',
    '在线音频音量增强器': 'Online Audio Volume Booster',
    '完全在浏览器本地完成音量增强和音量均衡。音频无需上传，支持试听及 MP3、WAV 导出，可离线使用。': 'Adjust and level audio volume locally in your browser. No uploads. Preview and export MP3 or WAV, even offline.',
    '处理位置:': 'Processing:', '浏览器本地': 'In your browser', '文件传输:': 'Audio uploaded:', '隐私保护已启用': 'Privacy protection enabled',
    '音频操作': 'Audio controls', '主题模式': 'Theme mode', '界面语言': 'Interface language',
    '◐ 主题：跟随浏览器': '◐ Theme: Browser default', '☀ 主题：浅色模式': '☀ Theme: Light', '☾ 主题：深色模式': '☾ Theme: Dark',
    '＋ 选择音频': '＋ Choose audio', '载入示例': 'Load demo', '清空音频': 'Clear audio',
    '支持拖放文件 · 单文件上限 100 MB': 'Drag and drop supported · Max. 100 MB per file',
    '系统就绪': 'Ready', '音频概览': 'Audio overview', '文件:': 'File:', '未选择': 'No file selected', '时长:': 'Duration:', '采样率:': 'Sample rate:', '声道:': 'Channels:',
    '等待载入音频': 'Waiting for audio', '音频波形': 'Waveform', '原始': 'Original', '处理后': 'Processed',
    '音频波形，载入音频后显示': 'Audio waveform, available after loading a file', '选择音频后显示波形': 'Load audio to display its waveform',
    '可点击波形定位试听位置': 'Click the waveform to seek', '本地音频输入': 'Local audio input', '选择或拖入音频文件': 'Choose or drop an audio file',
    '拖放音频文件到这里': 'Drop an audio file here', '或点击选择本地文件': 'Or click to choose a local file', '点击或拖入另一个文件': 'Click or drop to replace the file',
    '单文件 ≤ 100 MB': 'Max. 100 MB per file', 'M4A / AAC / FLAC / AIF / AIFF 等': 'M4A / AAC / FLAC / AIF / AIFF, etc.',
    '音量分析': 'Level analysis', '指标': 'Metric', '峰值': 'Peak', '平均响度': 'Average level', '原始峰值': 'Original peak', '处理后峰值': 'Processed peak',
    '载入后自动分析，调整后自动更新。': 'Analyzed on load; updated when settings change.', '音量调节': 'Volume adjustment', '降低或增强整段音频的音量': 'Reduce or boost the volume of the entire audio',
    '启用调节': 'Enable adjustment', '输出音量': 'Output volume', '输出音量百分比': 'Output volume percentage', '输入输出音量百分比': 'Enter output volume percentage',
    '50% 最小音量': '50% minimum', '100% 原音量 · 400% 最大增强': '100% original · 400% maximum', '音量调节预设': 'Volume presets',
    '减半': 'Half', '原音': 'Original', '适中': 'Moderate', '强力': 'High', '极强': 'Maximum',
    '100% 保持原音量，低于 100% 降低音量，高于 100% 增强音量。可与音量均衡同时使用。': '100% keeps the original volume. Lower values reduce it; higher values boost it. Can be combined with leveling.',
    '音量均衡': 'Volume leveling', '让轻声和大声更一致': 'Make quiet and loud passages more consistent', '启用均衡': 'Enable leveling', '均衡强度': 'Leveling strength',
    '突出人声': 'Highlight voice', '人声突出': 'voice_enhanced', '减轻低频轰鸣，提升语音清晰度': 'Reduce low-frequency rumble and improve speech clarity',
    '未启用': 'Disabled', '已启用': 'Enabled', '开启': 'On', '关闭': 'Off', '轻柔': 'Gentle', '标准': 'Standard', '明显': 'Strong',
    '轻柔 · 保留更多动态': 'Gentle · Retain more dynamics', '标准 · 均衡音量与动态': 'Standard · Balance volume and dynamics', '明显 · 更一致的听感': 'Strong · More consistent loudness',
    '自动提升较轻片段、降低过响片段，适合人声录音、课程和音量起伏较大的音频。': 'Lift quiet passages and reduce loud ones. Useful for voice recordings, lessons, and audio with uneven levels.',
    '防止削波失真': 'Prevent clipping', '峰值保护已启用': 'Peak protection enabled', '关闭保护可能导致失真': 'Clipping may occur without protection',
    '先均衡片段响度，再应用整体音量调节；静音片段不会被直接放大。': 'Level passages first, then apply overall volume adjustment. Silence is not amplified.',
    '试听与导出': 'Preview & export', '对比效果后保存到设备': 'Compare the result, then save to your device', '▶ 播放': '▶ Play', 'Ⅱ 暂停': 'Ⅱ Pause', '■ 停止': '■ Stop',
    '试听音频版本': 'Preview version', '原始音频': 'Original audio', '处理后音频': 'Processed audio', '试听进度': 'Playback position',
    '输出格式': 'Format', '音质': 'Quality', '输出音质': 'Output quality', '↓ 处理并下载': '↓ Process & download', '取消导出': 'Cancel export', '导出进度': 'Export progress',
    '准备导出…': 'Preparing export…', '✓ 文件已生成': '✓ File generated', '重新下载': 'Download again',
    '先选择音频，再试听或导出。导出文件直接保存到你的设备。': 'Choose audio to preview or export. The output is saved directly to your device.',
    '处理日志': 'Processing log', '仅在当前页面内保留': 'Kept only in this page', '清空日志': 'Clear log', '时间': 'Time', '状态': 'Status', '事件': 'Event',
    '信息': 'Info', '完成': 'Done', '错误': 'Error', '提示': 'Note',
    '✓ 本地隐私模式': '✓ Local privacy mode', '音频只在当前浏览器内存中处理，不上传、不联网、不持久保存；关闭页面后自动释放。': 'Audio is processed only in browser memory. No uploads, network requests, or persistent storage. Closing the page releases it.',
    '在线音频音量增强器 · 音量调节 / 音量均衡': 'Online Audio Volume Booster · Volume adjustment / Leveling',
    '源代码 · AGPL-3.0': 'Source code · AGPL-3.0',
    '纯静态 · 可离线使用 · 建议使用新版 Chrome / Edge / Firefox': 'Fully static · Works offline · Modern Chrome / Edge / Firefox recommended',
    '请启用 JavaScript。所有音频处理都在浏览器本地完成。': 'Please enable JavaScript. All audio processing runs locally in your browser.',
    '单声道': 'Mono', '立体声': 'Stereo', '操作已取消': 'Operation cancelled', '操作失败，请重试。': 'Operation failed. Please try again.',
    '当前浏览器不支持音频处理，请使用新版 Chrome、Edge 或 Firefox。': 'Audio processing is unavailable. Please use a modern Chrome, Edge, or Firefox browser.',
    '本地音频处理线程异常，请重新打开页面。': 'The local audio worker failed. Please reopen this page.',
    '此格式需要 WebAssembly，本浏览器不支持，请使用新版浏览器。': 'This format requires WebAssembly. Please use a modern browser.',
    '正在启动本地格式解码器…': 'Starting the local format decoder…', '原生解码不支持该格式，切换到内置本地解码器。': 'Native decoding is unavailable for this format. Using the built-in local decoder.',
    '正在本地解码音频…': 'Decoding audio locally…', '内置解码完成，未发生网络传输。': 'Local decoding complete. No audio was uploaded.',
    '本地解码器启动失败，或设备内存不足。请使用新版浏览器并重试。': 'The local decoder could not start, or memory is insufficient. Try a modern browser.',
    '正在载入…': 'Loading…', '正在读取本地音频…': 'Reading local audio…', '音频解码后过大，请使用更短的音频文件。': 'Decoded audio is too large. Please choose a shorter file.',
    '多声道音频已混合为立体声。': 'Multichannel audio has been mixed down to stereo.',
    '试听音量与系统音量有关，请先从较低的设备音量开始。': 'Playback depends on your system volume. Start with a low device volume.',
    '文件超过 100 MB 上限，请选择较小的音频。': 'The file exceeds 100 MB. Please choose a smaller audio file.', '文件为空，请选择有效的音频文件。': 'The file is empty. Please choose valid audio.',
    '载入失败': 'Loading failed', '请检查音频是否损坏或受加密保护。': 'Check whether the audio is damaged or encrypted.', '已释放当前音频与导出文件的内存。': 'Released the current audio and export from memory.',
    '正在计算效果…': 'Processing…', '正在计算音频效果…': 'Processing audio…', '处理完成 · 可试听或下载': 'Ready to preview or download', '处理完成，可试听或下载': 'Ready to preview or download',
    '输出超过 0 dBFS，可能产生失真；建议启用峰值保护。': 'Output exceeds 0 dBFS and may clip. Enable peak protection.', '音频为静音，增强不会产生声音。': 'The audio is silent. Increasing volume cannot create sound.',
    '处理失败': 'Processing failed', 'MP3 输出已转换为 44,100 Hz。': 'MP3 output has been resampled to 44,100 Hz.', '导出完成': 'Export complete', '导出完成，文件已生成': 'Export complete. Your file is ready.',
    '导出已取消，可重新导出': 'Export cancelled. You can export again.', '已取消导出。': 'Export cancelled.', '增强均衡': 'boosted_leveled', '降低均衡': 'reduced_leveled', '音量增强': 'volume_boosted', '音量降低': 'volume_reduced',
    '本地示例_音量起伏.wav': 'local_demo_uneven_volume.wav', '示例由当前页面直接合成，可开启音量均衡试听强弱变化。': 'This demo is synthesized locally. Enable leveling to compare quiet and loud sections.',
    '一次处理一个文件，已选择第一个文件。': 'One file at a time. The first file has been selected.', '日志已清空。': 'Log cleared.',
    '系统就绪。选择音频后即可增强或均衡音量。': 'Ready. Choose audio to adjust or level its volume.', '本地隐私模式已启用，页面禁止联网请求。': 'Local privacy mode enabled. Network requests are blocked.',
    '当前浏览器不支持本地处理线程，请使用新版 Chrome、Edge 或 Firefox。': 'Local workers are unavailable. Please use a modern Chrome, Edge, or Firefox browser.',
    '无法识别音频格式，文件可能已损坏或受保护。': 'Audio format not recognized. The file may be damaged or protected.', '无法识别音频信息，文件可能已损坏或受保护。': 'Audio metadata could not be read. The file may be damaged or protected.',
    '文件中没有可读取的音轨。': 'No readable audio track was found.', '该文件无法解码。请检查文件是否损坏。': 'The file cannot be decoded. Check whether it is damaged.',
    '该文件无法解码。请确认文件未加密且包含有效音轨。': 'The file cannot be decoded. Check that it is unencrypted and contains valid audio.', '音频不包含有效采样。': 'The audio contains no valid samples.',
    '本地解码失败，请尝试其他音频。': 'Local decoding failed. Please try another file.', '请先选择音频文件。': 'Choose an audio file first.', '音频处理失败。': 'Audio processing failed.',
    '无效的音频数据。': 'Invalid audio data.', '音频声道长度不一致。': 'Audio channels have inconsistent lengths.', 'WAV 仅支持 16-bit 或 24-bit PCM。': 'WAV supports 16-bit or 24-bit PCM only.', 'WAV 输出超过 4 GB，请使用 MP3。': 'WAV output exceeds 4 GB. Please use MP3.'
  };
  const patterns = [
    [/^正在本地解码 (\d+)%$/, m => 'Decoding locally ' + m[1] + '%'],
    [/^正在计算音频效果 (\d+)%$/, m => 'Processing audio ' + m[1] + '%'],
    [/^正在导出 (\w+)…$/, m => 'Exporting ' + m[1] + '…'],
    [/^开始本地编码 (\w+)。$/, m => 'Encoding ' + m[1] + ' locally.'],
    [/^编码进度 (\d+)%$/, m => 'Encoding ' + m[1] + '%'],
    [/^已载入 (.*)，时长 (.*)，(.*) Hz。$/, m => 'Loaded ' + m[1] + '. Duration ' + m[2] + ', ' + m[3] + ' Hz.'],
    [/^峰值保护: (开启|关闭) · 音量均衡: (开启|关闭)$/, m => 'Peak protection: ' + translate(m[1]) + ' · Leveling: ' + translate(m[2])],
    [/^效果已更新：音量 (.*)，均衡 (.*)，人声 (.*)，输出峰值 (.*) dBFS。$/, m => 'Updated: volume ' + translate(m[1]) + ', leveling ' + translate(m[2]) + ', voice ' + translate(m[3]) + ', output peak ' + m[4] + ' dBFS.'],
    [/^效果已更新：音量 (.*)，均衡 (.*)，输出峰值 (.*) dBFS。$/, m => 'Updated: volume ' + translate(m[1]) + ', leveling ' + translate(m[2]) + ', output peak ' + m[3] + ' dBFS.'],
    [/^已生成 (.*)（(.*)）。若未自动保存，可点击“重新下载”。$/, m => 'Generated ' + m[1] + ' (' + m[2] + '). If saving did not start, select Download again.'],
    [/^(.*) 音频波形$/, m => m[1] + ' waveform']
  ];
  function browserLanguage() {
    const languages = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];
    for (const language of languages) { if (/^zh(?:-|$)/i.test(language)) return 'zh-CN'; if (/^en(?:-|$)/i.test(language)) return 'en'; }
    return 'en';
  }
  let language = browserLanguage();
  try { const saved = localStorage.getItem(storageKey); if (saved === 'zh-CN' || saved === 'en') language = saved; } catch (error) {}
  function translate(source) {
    source = String(source);
    if (language === 'zh-CN') return source;
    const trimmed = source.trim();
    let translated = strings[trimmed];
    if (translated === undefined) for (const [pattern, render] of patterns) { const match = trimmed.match(pattern); if (match) { translated = render(match); break; } }
    return translated === undefined ? source : source.replace(trimmed, () => translated);
  }
  const textSources = [], attributeSources = [], dynamic = new WeakMap(), dynamicAttributes = new WeakMap();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement && !node.parentElement.closest('script,style,#language-mode') && /[\u3400-\u9fff]/.test(node.data)) textSources.push([node, node.data]);
  }
  for (const element of document.querySelectorAll('[aria-label],[title]')) for (const name of ['aria-label', 'title']) {
    const value = element.getAttribute(name); if (value && /[\u3400-\u9fff]/.test(value)) attributeSources.push([element, name, value]);
  }
  const titleSource = document.title, description = document.querySelector('meta[name="description"]'), descriptionSource = description ? description.content : '';
  function setText(element, source, literal = false) { dynamic.set(element, { source: String(source), literal }); element.setAttribute('data-i18n-dynamic', ''); element.textContent = literal ? String(source) : translate(source); }
  function setAttribute(element, name, source) {
    let entries = dynamicAttributes.get(element); if (!entries) { entries = new Map(); dynamicAttributes.set(element, entries); }
    entries.set(name, String(source)); element.setAttribute('data-i18n-attributes', ''); element.setAttribute(name, translate(source));
  }
  function apply() {
    document.documentElement.lang = language; document.title = translate(titleSource); if (description) description.content = translate(descriptionSource);
    for (const [node, source] of textSources) if (node.isConnected) node.data = translate(source);
    for (const [element, name, source] of attributeSources) if (element.isConnected) element.setAttribute(name, translate(source));
    for (const element of document.querySelectorAll('[data-i18n-dynamic]')) { const entry = dynamic.get(element); if (entry) element.textContent = entry.literal ? entry.source : translate(entry.source); }
    for (const element of document.querySelectorAll('[data-i18n-attributes]')) for (const [name, source] of dynamicAttributes.get(element) || []) element.setAttribute(name, translate(source));
    document.getElementById('language-mode').value = language;
  }
  document.getElementById('language-mode').addEventListener('change', event => {
    language = event.target.value === 'en' ? 'en' : 'zh-CN';
    try { localStorage.setItem(storageKey, language); } catch (error) {}
    apply(); document.dispatchEvent(new CustomEvent('audio-language-change', { detail: language }));
  });
  window.AudioI18n = { translate, setText, setAttribute, get language() { return language; } };
  apply();
})();
