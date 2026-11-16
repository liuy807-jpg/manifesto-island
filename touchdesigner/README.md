# TouchDesigner ↔ Approach: Island

两种接法。作品集和日常打开用第一种；期末展可以再加第二种。

This folder is a starter, not a `.toe` project. You already know TouchDesigner, so these are the pieces you paste in.

---

## 1. 把着色器搬进网页（始终可用）

网站里的海面和天空已经是 GLSL，和这里的文件共用同一套观感。

- 网页版：`../src/shaders/`（three.js 直接跑，手机也能开）
- TD 版：`shaders/sky.frag.glsl`、`shaders/water.frag.glsl`（给 GLSL TOP 用）
- 兼容层：`shaders/port.h.glsl`（说明 Web / TD 的 UV、分辨率、输出怎么对应）

在 TouchDesigner 里：

1. 新建 GLSL TOP，把对应的 `*.frag.glsl` 贴进 Pixel Shader。
2. 在 Vectors / Uniforms 页加上：
   - `uTime` ← `absTime.seconds`（或一个递增的 CHOP）
   - `uProgress` ← 0–1，控制从夜到日出
   - `uCalm`（海面）← 0–1，1 是更静的海
   - `uSunAmount`（天空）← 0–1
3. 需要的话再加颜色向量 `uZenith`、`uHorizon`、`uHaze`、`uSun`、`uDeep`、`uShallow`。不设的话，着色器会按 `uProgress` 自己渐变。
4. 文件顶部已写 `#define TOUCHDESIGNER`。如果要在别的环境试，去掉这行即可。

网站本身不依赖 TD 是否打开，作品集链接可以一直用。

---

## 2. 现场联机（可选）

浏览器和 TouchDesigner 通过一个很小的 WebSocket 中继交换 JSON。参观者在手机上靠近某条宣言时，投影或装置可以跟着亮、跟着变。

### 启动中继

在项目根目录：

```bash
npm install
npm run relay
```

默认地址是 `ws://127.0.0.1:8081`。把电脑和手机放在同一网络时，把 `127.0.0.1` 换成电脑的局域网 IP。

### 打开带直播参数的网页

```
https://你的网站/?live=ws://127.0.0.1:8081
```

或本地：`http://127.0.0.1:4173/?live=1`（`?live=1` 等于连本地 8081 端口）。

**不要把带 `?live=` 的地址当作作品集主链接。** 主链接应该始终能单独打开。联机是展览模式。

### 在 TouchDesigner 里接收

1. 新建 WebSocket DAT。
   - Network Address：`127.0.0.1`（或中继所在的 IP）
   - Network Port：`8081`
   - Callbacks DAT：指向 `websocket_callbacks.py`（把这个文件放到工程旁边，或把内容贴进 Callbacks DAT）
   - Active：On
2. 新建 Table DAT，命名为 `approach_state`。回调会把最新数值写进去：
   - `station` `clarity` `distance` `revealed` `sky` `x` `y` `z` `yaw`
3. 用 Select CHOP / DAT to CHOP 把 `clarity`、`sky` 接到前面 GLSL TOP 的 `uProgress`、`uCalm`，或接到灯光、粒子。

### 从 TD 发回网页

在 Textport 或 CHOP Execute 里可以调用回调文件里的辅助函数：

```python
send_params(op('websocket1'), sky_progress=0.8, intensity=1.2)
send_cue(op('websocket1'), 'sunrise')
```

网页会听：

- `params.skyProgress` 推动天空进度
- `params.intensity` 调整太阳光强度
- `cue: sunrise` 把天空拉到日出

### 协议（都是一行 JSON）

网站发出：

| type | 字段 | 何时 |
| --- | --- | --- |
| `hello` | `role: "site"` | 连上时 |
| `approach` | `station`, `distance`, `clarity` | 靠近一个地点 |
| `reveal` | `station` | 一条宣言被看清 |
| `sky` | `progress` | 天空进度变化 |
| `presence` | `id`, `x`, `y`, `z`, `yaw` | 参观者位置（约每 180ms） |
| `drift` | `id`, `text`, `name` | 有人寄出一幅新画面，海上多了一座岛 |

TD 可发：`hello`（`role: "td"`）、`params`、`cue`。同中继里的其他浏览器也会收到 `presence`，用来画别人的柔光点。同中继里的其他网页也会收到 `drift`，用来立刻长出一座新岛。

### 漂流事件（第二章）

参观者在小船边写下「被困住时想看到的画面」并寄出后，网站会发一条：

```json
{"type":"drift","id":"d-xxxx","text":"日出时，海上只有一艘小船。","name":"","seed":false}
```

回调会把最新一条写进 `approach_state` 的 `drift_id`、`drift_text`、`drift_name`。如果工程里有一张叫 `drift_log` 的 Table DAT，还会按行追加，方便在展览现场用文字、粒子或新的岛屿模型跟上群岛。

把 `drift_text` 接到 Text DAT / Text TOP，就可以在投影上显示刚漂来的那句话。用 `drift_id` 当随机种子，给每座岛一个稳定的位置。

同一台机器上先开中继，再开 TD，再开带 `?live=` 的网页。防火墙请放行 8081。

---

## 3. 录一段循环 MP4，放到 New Art City（免费方案推荐）

New Art City **免费方案不能直播**，付费方案才可以走 OBS / Spout 把 TD 直接推进展厅。免费方案请把 TD 画面录成一段短的循环视频，当作展厅里的一件 Video piece 上传。

建议规格（为了把整个展厅包控制在约 35MB 以内）：

- 格式：H.264，`.mp4`
- 分辨率：1280×720 或 1920×1080
- 帧率：24 或 30 fps
- 时长：8–20 秒，能无缝循环（海面、天空、灯塔光）
- 体积：单条约 4–8MB；如果有两段，合计不要超过约 12MB
- 不要音轨，或把音量做成很小的环境声（展厅里会另放环境声）

在 TouchDesigner 里录制：

1. 把要展出的画面接到一个 Movie File Out TOP。
2. Type / Codec 选 **MP4 / H.264**（有的版本要先经 Movie File Out 再交给系统编码器）。
3. 录 10 秒左右，停掉，用播放器检查首尾能不能接上。
4. 如果文件太大，用系统自带的压缩，或用 ffmpeg：

```bash
ffmpeg -i input.mov -an -c:v libx264 -pix_fmt yuv420p -crf 26 -preset slow -movflags +faststart -t 15 loop.mp4
```

然后把 `loop.mp4` 按 `newartcity/README.md` 的说明上传为 Video piece，设成循环播放。

付费方案如果以后要直播：用 OBS 采集 TD（Spout / NDI / 窗口采集），再按 New Art City 的 Livestream 说明推流。那一步不是免费方案的一部分。
