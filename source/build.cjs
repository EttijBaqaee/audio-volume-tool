/* SPDX-License-Identifier: AGPL-3.0-only */
const fs = require('node:fs');
const path = require('node:path');
const here = __dirname;
const read = name => fs.readFileSync(path.join(here, name), 'utf8');
const script = source => source.replace(/<\/script/gi, '<\\/script');
const output = path.resolve(process.argv[2] || path.join(here, '../index.html'));
const lame = read('vendor/lame.min.js');
const core = read('vendor/ffmpeg-core.js');
const wasmPath = path.join(here, 'vendor/ffmpeg-core.wasm');
let wasm;
if (fs.existsSync(wasmPath)) wasm = fs.readFileSync(wasmPath).toString('base64');
else {
  // The distributed HTML already contains the unchanged 32 MB binary.
  // Reuse it when rebuilding to keep the source package compact.
  const previous = fs.readFileSync(output, 'utf8');
  const embedded = previous.match(/id="audio-decoder-wasm">([A-Za-z0-9+/=]+)<\/script>/);
  if (!embedded) throw new Error('找不到内置解码器，请保留原始 index.html，或在 source/vendor 中提供 ffmpeg-core.wasm。');
  wasm = embedded[1];
}
let html = read('template.html');
const replacements = {
  '/*__CSS__*/': read('styles.css'),
  '/*__THEME__*/': script(read('theme.js')),
  '/*__I18N__*/': script(read('i18n.js')),
  '/*__DSP__*/': script(read('dsp.js')),
  '/*__WORKER__*/': script(read('dsp.js') + '\n' + lame + '\n' + read('worker.js')),
  '/*__DECODER__*/': script(core + '\n' + read('decoder.js')),
  '/*__WASM__*/': wasm,
  '/*__APP__*/': script(read('app.js'))
};
for (const [marker, replacement] of Object.entries(replacements)) html = html.replace(marker, () => replacement);
fs.writeFileSync(output, html, 'utf8');
console.log(JSON.stringify({ output, bytes: Buffer.byteLength(html), embeddedWasmBytes: Buffer.from(wasm, 'base64').byteLength }));
