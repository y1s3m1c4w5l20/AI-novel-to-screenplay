from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import io
import uvicorn
from parser import NovelParser
from generator import ScreenplayGenerator

app = FastAPI(title="AI 剧本引擎")

# 允许前端跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/convert")
async def convert_novel(file: UploadFile = File(...), title: str = "未命名"):
    """上传小说文件，返回 YAML 剧本（强制下载）"""
    content = await file.read()
    text = content.decode("utf-8")

    parser = NovelParser()
    chapters = parser.split_chapters(text)

    generator = ScreenplayGenerator()
    screenplay = generator.generate_full(chapters, title)

    # 生成 YAML 内容
    yaml_content = screenplay.to_yaml()

    # 文件名用英文，避免中文编码问题
    safe_title = "screenplay" if not title or title == "未命名" else title.encode('utf-8').decode('latin-1', 'ignore')
    filename = f"{safe_title}.yaml"

    return StreamingResponse(
        io.StringIO(yaml_content),
        media_type="text/yaml",
        headers={"Content-Disposition": f"attachment; filename=screenplay.yaml"}
    )

@app.post("/analyze")
async def analyze_screenplay(yaml_text: str):
    """对已有剧本做扩展分析（冲突/节奏/镜头/戏份）"""
    from analyzer import ScreenplayAnalyzer
    analyzer = ScreenplayAnalyzer()
    result = analyzer.full_analysis(yaml_text)
    return result

@app.get("/")
async def root():
    return {"message": "AI剧本引擎运行中", "docs": "/docs"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)