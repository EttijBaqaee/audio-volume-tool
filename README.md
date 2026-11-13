# 在线音频音量增强器

在浏览器本地降低、增强或均衡音频音量。无需安装、无需上传，断网也能使用。

## 页面预览

![中文浅色界面](screenshots/zh-light.png)

<details>
<summary>查看深色界面和英文界面</summary>

![中文深色界面](screenshots/zh-dark.png)

![English interface](screenshots/en-light.png)

</details>

## 功能

- **音量调节**：50%–400%，提供减半、原音、适中、强力和极强预设。100% 保持原音量，50% 将信号幅度减半。
- **音量均衡**：轻柔、标准、明显三档，提升较轻片段并降低过响片段，可与音量调节叠加。
- **突出人声**：独立开关，减轻低频轰鸣、减少浑浊感并提升语音清晰度，可与均衡叠加使用。
- **峰值保护**：默认开启，减少削波失真。
- **本地试听**：对比原始与处理后的音频，支持暂停和定位，显示波形、峰值及 RMS 平均电平。
- **导出**：MP3（128 / 192 / 320 kbps）、WAV（16-bit / 24-bit PCM）。
- **中英文界面**：首次按浏览器首选语言匹配，手动选择后记住偏好。
- **明暗主题**：默认跟随浏览器，偏好变化时自动更新，也可手动选择。

English: A fully local audio volume tool with 50%–400% gain, automatic volume leveling, voice enhancement, clipping protection, waveform preview, and MP3/WAV export. Includes English/Chinese interfaces and automatic light/dark themes.

## 使用

下载仓库或压缩包后，使用新版 Chrome、Edge 或 Firefox 打开根目录的 **`index.html`**。也可以部署到任意静态网站托管服务。

网页已经内嵌全部样式、脚本、编码器和格式解码器，不需要启动本地服务器或额外下载依赖。“载入示例”会直接在页面内合成音频，便于试听。

### 支持的输入格式

MP3、WAV、WMA、OGG、M4R、M4A、AAC、FLAC、AIF / AIFF，并兼容 OPUS、APE、AC3、AMR、WebM 等常见格式。

优先使用浏览器原生解码；不支持的格式自动切换至内嵌的单线程 FFmpeg WebAssembly 解码器，不依赖 SharedArrayBuffer 或服务器。损坏、加密或受 DRM 保护的文件无法保证读取，多声道音频会混合为立体声。

单个输入文件上限 100 MB，解码后的 PCM 数据上限 384 MB。高于 MP3 支持范围的采样率会在导出 MP3 时转换为 44.1 kHz。均衡使用动态 RMS 电平调整，并非 LUFS 母带标准化。

“突出人声”通过高通及均衡滤波改善语音清晰度，适合讲话、课程和会议录音；它不进行人声分离或伴奏去除。

## 隐私与离线

音频只在当前浏览器内存中处理，不上传、不写入服务器，也不保存到浏览器持久存储。关闭页面后释放音频；仅主题和语言偏好保存在本机。

页面通过 `connect-src 'none'` 禁止联网请求，不使用 CDN、远程字体、统计代码或外部 API。由于完整内嵌本地解码器，单文件网页约 42 MB。

## 从源码构建

需要 Node.js。在仓库根目录执行：

```sh
node source/build.cjs
```

脚本默认重新生成 `index.html`，也可传入输出路径：

```sh
node source/build.cjs index.html
```

构建时会复用现有 `index.html` 中的 FFmpeg 二进制，因此请保留该文件。也可以自行在 `source/vendor/ffmpeg-core.wasm` 提供对应版本的解码器。

## 许可证

本项目原创源码采用 **GNU Affero General Public License v3.0（AGPL-3.0-only）**，详见 [LICENSE](LICENSE)。修改版本通过网络向用户提供服务时，应依照 AGPL 向这些用户提供相应源代码。

第三方 FFmpeg 和 lamejs / LAME 保留各自许可证，未进行修改。版本、源码地址及许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 和 [licenses/](licenses/)。
