# Third-party notices

Original application code is licensed under AGPL-3.0-only. This does not replace the licenses of the following unmodified components.

## FFmpeg WebAssembly

- Package: `@ffmpeg/core` 0.12.10, single-thread UMD build.
- Files: `source/vendor/ffmpeg-core.js` and the corresponding WebAssembly binary embedded in `index.html`.
- License: GPL-2.0-or-later. See [licenses/ffmpeg-GPL-2.0.txt](licenses/ffmpeg-GPL-2.0.txt).
- Project and build sources: https://github.com/ffmpegwasm/ffmpeg.wasm
- Version source: https://github.com/ffmpegwasm/ffmpeg.wasm/tree/%40ffmpeg/core%400.12.10
- Upstream FFmpeg: https://ffmpeg.org/
- Exact npm distribution: https://registry.npmjs.org/@ffmpeg/core/-/core-0.12.10.tgz

FFmpeg is a trademark of Fabrice Bellard, originator of the FFmpeg project. FFmpeg and the ffmpeg.wasm project are independent of this application.

## lamejs / LAME

- Package: `lamejs` 1.2.1.
- File: `source/vendor/lame.min.js`, also embedded in the audio worker in `index.html`.
- License: LGPL. The upstream license and distribution notice are preserved in [licenses/lame-LGPL-2.0.txt](licenses/lame-LGPL-2.0.txt) and [licenses/lamejs-LICENSE.txt](licenses/lamejs-LICENSE.txt).
- Source: https://github.com/zhuker/lamejs
- LAME project: https://lame.sourceforge.net/
- Exact npm distribution: https://registry.npmjs.org/lamejs/-/lamejs-1.2.1.tgz

No modifications have been made to the distributed third-party JavaScript or WebAssembly binaries.
