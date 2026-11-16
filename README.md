# Approach: Island（靠近）

Yuting Liu 宣言 zine 的第一、二段。访客以第三人称走入一座柔和的 pastel toon 小岛，七条信念是岛上的七个地方。靠近、停下，字才会从雾里走出来；找到的句子会收进图鉴。走到小船边，可以把一句「被困住时想看到的画面」折成纸船，送到海上的共享群岛，并收到别人写下的一句。天空会从浅色的清晨，慢慢走到小船边的金色日出。

Part 1 of the manifesto zine: a third-person pastel island. Walk up to a place and stay; the words clear only then, and a journal keeps what you have found.

**Live site:** [https://liuy807-jpg.github.io/manifesto-island/](https://liuy807-jpg.github.io/manifesto-island/)

The site is published from this repository with GitHub Actions and GitHub Pages. After you push to `main`, the workflow builds the Vite app and deploys it. The Vite `base` is `/manifesto-island/` so fonts, audio, and other assets resolve on that path.

## 本地运行

```sh
npm install
npm run dev          # http://localhost:5173
npm run build && npm run preview
```

不要用 `file://` 打开，浏览器会拦截模块。

## 操作

- 桌面：点击地面走路，或用 WASD / 方向键；Q/E 或拖动环视，滚轮缩放，Shift 跑。支持手柄。
- 手机：轻点地面走路，或用左下角摇杆；拖动屏幕环视。
- 靠近一个地方并停下，宣言才会变清楚。走得太快，字会散开。已经看清过的地方，再来会更快显形。
- 右上角「图鉴」或按 J，查看已收集的句子（0/7）。点扬声器可以听朗读；静音在右上角。
- 在小船边读完第七条后，点「继续 · 漂流」，留下一幅画面。海上会出现别人的小岛，点一下就能读。右上角「群岛」显示目前的岛数。

## 文件

- `src/experience/` — 小岛、天空、海面、地点、行走、显形、声音、后期、TouchDesigner 桥
- `src/shaders/` — 可移植的海面 / 天空 GLSL
- `touchdesigner/` — 着色器、WebSocket 回调、接入说明（没有假的 `.toe` 文件）
- `server/relay.mjs` — 可选的现场联机中继：`npm run relay`
- `newartcity/` — 免费方案可用的 New Art City 展厅素材包（约 35MB 上限内）
- `CASE_STUDY.md` — 作品集过程说明（英文）
- `docs/shots/warm/` — pastel toon 版截图
- `docs/shots/drift/` — 第二章「漂流」截图
- `docs/DRIFT.md` — 群岛存储、限制、管理员隐藏条目的说明

## TouchDesigner

网站本身用移植后的 GLSL，**不需要**打开 TD 也能用，适合作品集链接。

展览时可以加现场联机：先 `npm run relay`，再用

```
https://你的网站/?live=ws://电脑的局域网IP:8081
```

打开页面，并按 `touchdesigner/README.md` 把 WebSocket DAT 接到同一个中继。主链接不要带 `?live=`。

New Art City **免费方案不能直播**。请把 TD 画面录成一段短的循环 H.264 MP4，当作 Video piece 上传。步骤写在 `touchdesigner/README.md` 第 3 节和 `newartcity/README.md`。付费方案才支持直播。

## 发布地址（作品集请用这个）

正式地址已经发布在 GitHub Pages，不会过期，页面上也没有临时徽章：

**https://liuy807-jpg.github.io/manifesto-island/**

仓库是公开的：https://github.com/liuy807-jpg/manifesto-island

推送到 `main` 后，`.github/workflows/pages.yml` 会自动构建并更新网站。本地预览可以用 `npm run build && npm run preview`。如果以后把仓库改名，记得同步修改 `vite.config.js` 里的 `base`。
- **Vercel：** 在项目根目录运行 `npx vercel --prod`，或把仓库导入 Vercel。构建命令 `npm run build`，输出目录 `dist`。
- **Netlify：** 同样，build `npm run build`，publish `dist`。也可以把 `dist` 拖到 [app.netlify.com/drop](https://app.netlify.com/drop)。

需要 HTTPS。网站本身是静态的。第二章的群岛句子存在免费的 MantleDB 上，细节见 `docs/DRIFT.md`。联机中继只在展览时自己电脑上跑。


## Language and music

The on-site experience is in English: the journal, the seven statements, Drift, and every button and label.

Background music: **First Light on the Water**, an original solo piano piece written for this island. F major, 68 BPM, about 2 minutes 43 seconds, composed to loop. It begins after the first tap, fades in, sits under the existing shore ambience, and swells a little as the sky reaches sunrise. Mute it with the handmade sound toggle.

- `public/audio/first-light-on-the-water.mp3` (also `.ogg`)
- MIDI source: `docs/music/first-light-on-the-water.mid`

This is an original composition. It is not based on any copyrighted melody. The recording was made from that MIDI score with Fluid R3 GM acoustic-grand piano samples and a short hall reverb.
