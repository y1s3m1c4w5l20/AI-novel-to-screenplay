# AI 小说转剧本工具

&gt; 不只是"格式转换器"，而是 AI 编剧助手 —— 理解小说叙事逻辑，主动发现戏剧冲突，辅助创作者完成从文学到影像的思维跃迁。

## 核心功能

- 智能场景切分：自动识别章节转折点
- 角色管理：提取角色信息，生成冲突热力图
- 剧本生成：输出标准 YAML 格式剧本
- 节奏分析：情绪曲线、场景时长统计
- 镜头建议：每场景附拍摄指导

## 快速开始

### 前端启动
    cd frontend
    npm install
    npm start

### 后端启动
    cd backend
    pip install -r requirements.txt
    uvicorn main:app --reload

## 项目结构

- backend/：FastAPI 后端（模型、服务、Prompt）
- frontend/：React 前端（组件、页面、Hooks）
- docs/：文档（YAML Schema、API 文档）

## 团队成员

- 前端开发：余胜梅（React 前端、可视化编辑器）
- 后端开发：段明静（Python 核心、AI 生成、Prompt 工程）

## License

MIT License
