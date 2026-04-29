# Presentation v11 — Modular(已拆分版本)

Senior Project · Scene 03 — Behavioral Extraction System 的演示版本,从单文件 HTML 拆成了 CSS + JS + JSON 的多文件结构。

视觉、交互、性能与 `presentation_v11_plan_b/scene3_v11.html`(已删除,git 历史保留)**完全等价**,只是物理上分了文件,便于阅读和后续扩展。

---

## 这是什么

一个 Three.js + MediaPipe 的交互可视化场景:

- 950 个字符粒子组成 3D 球体,每个粒子表面字符实时显示摄像头识别到的手部 + 面部数据(20 个字段:POINTER_X、HEAD_YAW、EYE_OPENNESS……)
- 球体可用鼠标拖拽或手部捏合(pinch)旋转
- 球面上 6 个目标标签(ATTENTION / REACTION / DWELL / PATTERN / 87 / 42),光标悬停 ≈1.5s 被"收集"
- 左右两侧 HUD 面板:扫描波形、行为指数、信号置信度、已采集标记、会话指标
- Web Audio 合成的环境音 + 交互音效

入口文件:[index.html](index.html)

---

## 怎么启动

**必须通过本地 HTTP 服务器打开**,不要直接双击 `index.html`。两个原因:
1. 浏览器的 `getUserMedia`(摄像头)在 `file://` 协议下被拒
2. 拆出来的 `data/targets.json` 是用 `fetch()` 加载的,`file://` 下 fetch 会被 CORS 拦掉

在 `presentation_v11_modular/` 目录里运行任一:

```bash
# Python 3
python3 -m http.server 8000

# Node(如果装了 http-server)
npx http-server -p 8000
```

然后浏览器打开 `http://localhost:8000/`,同意摄像头权限。

VSCode 用户也可以直接在 `index.html` 上右键 → "Open with Live Server"。

---

## 文件结构

```
presentation_v11_modular/
├── index.html              # 纯骨架:DOM 元素 + <link>/<script> 引用
├── css/
│   ├── core.css            # reset、body、#s3 容器、画布、十字准星
│   ├── hud-panels.css      # 左 #scan-panel + 右 #right-panel 全部样式
│   └── corners.css         # 四角 HUD 文字 + 摄像头预览 + #hand-dot
├── js/                     # 加载顺序就是依赖顺序(见 index.html 底部)
│   ├── config.js           # window.S3 命名空间 + 常量(RADIUS / N / GLYPHS / CAM_FIELDS / LIGHT_DIR)
│   ├── camera-data.js      # CAM_DATA 实时数据池(20 路字段)
│   ├── scene.js            # Three.js renderer / scene / camera / globe group / viewport
│   ├── texture-pool.js     # makeCharTex / makeWordTex + v11 OPT 1 共享纹理池
│   ├── sphere.js           # 950 粒子 + 3 轨道环 + 48 段赤道 + 2 极点 + 装置弧支架
│   ├── audio.js            # ensureAudio + 5 种音效合成
│   ├── input.js            # 鼠标拖拽 + setPointer + S3.input 共享状态
│   ├── hands.js            # MediaPipe Hands + FaceMesh,写入 CAM_DATA
│   ├── lighting.js         # 每 2 帧一次的面/背 shading
│   ├── targets.js          # fetch data/targets.json + dwell 收集逻辑
│   ├── hud.js              # 扫描波形 + 800ms 指标 tick
│   └── main.js             # bootstrap(await fetch → 排定 hand init → animate)+ resize
└── data/
    └── targets.json        # 6 个可收集目标的定义(label / color / glow / rgb)
```

---

## 命名空间约定

所有跨文件共享的状态都挂在全局 `window.S3` 上,例如 `S3.particles`、`S3.input.rotVel`、`S3.CAM_DATA`。每个 JS 文件用 IIFE 包住,内部辅助变量保持私有,只把需要被别人读写的东西 `S3.foo = bar` 暴露出去。

**重要规则:对象引用永远不要重赋,只 mutate 内部字段。**
比如 `S3.input.rotVel.x *= 0.88` 是对的,`S3.input.rotVel = {x:0,y:0}` 会断掉其他文件持有的引用。

`S3.particles` 在 sphere.js 里同步填好,`S3.targetSprites` 由 targets.js 异步从 JSON 加载后填充 —— main.js 的 bootstrap `await S3.loadTargets()` 完成后才 `animate()`,所以第一帧渲染时两个数组都已就绪。

---

## v11 的 6 项性能优化(从单文件版本继承)

| # | 优化 | 现在所在文件 |
|---|---|---|
| 1 | **共享纹理池**:20 张共享 CanvasTexture 代替 950 张独立纹理,`lastText` 缓存跳过无变化重绘。GPU 上传量约 −99% | [texture-pool.js](js/texture-pool.js) + [sphere.js](js/sphere.js) 的 200ms `setInterval` |
| 2 | FaceMesh 隔 3 帧跑;摄像头 320×240 → 240×180 | [hands.js](js/hands.js) 末尾的 `Camera.onFrame` |
| 3 | `updateLighting()` 隔帧执行 | 调度在 [main.js](js/main.js);函数本体在 [lighting.js](js/lighting.js) |
| 4 | `drawScan()` 隔帧执行 | 调度在 [main.js](js/main.js);函数本体在 [hud.js](js/hud.js) |
| 5 | `pixelRatio` 上限 2 → 1.5 | [scene.js](js/scene.js) |
| 6 | 缓存 800ms HUD interval 里的 `querySelectorAll` | [hud.js](js/hud.js) 顶部 |

---

## 外部依赖(运行时从 CDN 拉取,需联网)

- Three.js r128
- @mediapipe/hands
- @mediapipe/face_mesh
- @mediapipe/camera_utils

CDN 链接在 [index.html](index.html) 最下面,顺序:`camera_utils → hands → three → face_mesh`。

---

## 想改/扩展时

- **加常量** → 写到 [config.js](js/config.js) 的 `S3.xxx`
- **加新音效** → [audio.js](js/audio.js) 加函数,挂 `S3.playMyThing = ...`
- **加新球体装置** → [sphere.js](js/sphere.js) 的某个 `(function(){ ... })()` 块照抄
- **加新 HUD 数据** → 在 HTML 里加元素,在 [hud.js](js/hud.js) 的 `setInterval` 里更新
- **改目标列表** → [data/targets.json](data/targets.json) 直接改,不用碰代码

新模块加 `<script src="js/xxx.js">` 时注意:它依赖谁就排在谁之后(参考 index.html 底部的注释)。

---

## 与单文件版本的差异

唯一行为差异:打开瞬间需要等 `data/targets.json` 的 fetch 完成才开始动画,localhost 上大概多 50–200ms,肉眼几乎看不出。运行起来的帧率和原版完全一样。
