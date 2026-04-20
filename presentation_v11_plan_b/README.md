# Presentation v11 — Plan B(已冻结)

**状态:归档,不再改动。** 如果要加功能或改视觉,请先复制整个文件夹再动,保持本版可用。

---

## 这是什么

Senior Project · Scene 03 — Behavioral Extraction System 的演示版本。

一个 Three.js + MediaPipe 的交互可视化场景:
- 950 个字符粒子组成 3D 球体,表面字符实时显示摄像头识别到的手部 + 面部数据(20 个字段,如 POINTER_X、HEAD_YAW、EYE_OPENNESS 等)
- 球体可用鼠标拖拽或手部捏合(pinch)旋转
- 球面上有 6 个目标标签(ATTENTION / REACTION / DWELL / PATTERN / 87 / 42),光标悬停一段时间会被"收集"
- 左右两侧 HUD 面板:扫描波形、行为指数、信号置信度、已采集标记、会话指标等
- Web Audio 合成的环境音 + 交互音效

文件入口:[scene3_v11.html](scene3_v11.html)(单文件,所有 HTML/CSS/JS 都在里面)

---

## 怎么启动

**必须通过本地 HTTP 服务器打开**,不要直接双击。浏览器的 `getUserMedia`(摄像头)在 `file://` 协议下会被拒绝。

在 `presentation_v11_plan_b/` 目录里运行任一:

```bash
# Python 3
python -m http.server 8000

# Node(如果装了 http-server)
npx http-server -p 8000
```

然后浏览器打开 `http://localhost:8000/scene3_v11.html`,同意摄像头权限。

VSCode 用户也可以直接在文件上右键 → "Open with Live Server"。

**外部依赖**(运行时从 CDN 拉取,需联网):
- Three.js r128
- @mediapipe/hands
- @mediapipe/face_mesh
- @mediapipe/camera_utils

---

## 功能一览

| 模块 | 说明 |
|---|---|
| 3D 粒子球体 | 950 个字符粒子,Fibonacci 球面分布 + 内部随机填充;按 20 个 CAM_FIELD 分组显示实时数据 |
| 手势识别(Hands) | 食指指尖做光标;拇指+食指捏合 = 按住旋转球体 |
| 面部识别(FaceMesh) | 输出 FACE_X/Y、HEAD_YAW/PITCH、EYE_OPENNESS、MOUTH_OPEN、FACE_STABILITY、PROXIMITY_INDEX 等 |
| 目标收集 | 悬停 ≈1.5s 采集一个目标,6/6 后播放 all-clear 音效 |
| HUD 面板 | 扫描波形、行为指数、活动向量、信号置信度、采集状态、会话指标、归档节点 |
| 球体装置 | 弧形支架 + 赤道 48 段 + 极点标记(v11 已移除三角形底座) |
| 音频引擎 | 环境 hum、悬停 tick、采集音、all-clear 和弦 |

---

## v11 做了什么(相对 v10)

性能冻结点 —— 相对 [../scene3_v10.html](../scene3_v10.html) 做了 6 项优化:

1. **共享纹理池**:20 张共享 CanvasTexture 代替 950 张独立纹理,`lastText` 缓存跳过无变化重绘。纹理 GPU 上传量约 −99%
2. FaceMesh 隔 3 帧跑;摄像头 320×240 → 240×180
3. `updateLighting()` 隔帧执行
4. `drawScan()` 隔帧执行
5. `pixelRatio` 上限 2 → 1.5
6. 缓存 DOM 引用(主要是 800ms interval 里的 `querySelectorAll`)

视觉与交互行为与 v10 等价(已移除装饰性三角底座 + [REDACTED] 标签)。

---

## 为什么当 Plan B

这个版本是一个独立完整的作品:球体为主角,用户用手势把它当游戏玩,
收集六个行为标记后触发完成音效。视觉、交互、性能都已经打磨到位,
可以直接在展会/答辩现场演示,不需要任何额外开发。

冻结它的原因是主线项目方向变了 —— 从"球是主角"转向了三页叙事
(人脸扫描 → 指纹验证 → 赛博小镇),用户创造的 avatar 成为主角,
球降级为装饰。主线项目在 `../cyber_soul/`(或主项目文件夹)。

**什么时候回来用这个版本:**
- 主线项目在 deadline 前没做完
- 展会现场网络/摄像头有问题,主线项目的 MediaPipe 管线跑不起来
- 评委/观众体验时间很短,想要一个 30 秒能看懂的东西

**回来用的时候怎么启动:**
见上面"怎么启动"一节。单文件,拖进浏览器就行(记得开本地 HTTP)。

---

## 冻结约定

- **本文件夹内的代码不再改动**
- 要尝试新方向,先复制整个文件夹(例如 `presentation_v12_plan_a/`)再在副本里改
- 若发现严重 bug 必须修,在 commit message 里明确标注 "plan B hotfix"
