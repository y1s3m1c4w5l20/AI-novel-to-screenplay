from fastapi import FastAPI, UploadFile, File, Depends  # ← 加了 Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session  # ← 加这个
import io
import os
import json  # ← 加这个（解析 analysis_data 用）
import uvicorn
from parser import NovelParser
from generator import ScreenplayGenerator
from models import get_db, ScreenplayHistory  # ← 加这个

app = FastAPI(title="AI 剧本引擎")

# 跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    yaml_text: str


def extract_text_from_file(content: bytes, filename: str) -> str:
    """
    万能文本提取器：支持所有常见文本格式
    """
    ext = os.path.splitext(filename.lower())[1]

    # 1. Word 文档 (.docx)
    if ext == '.docx':
        try:
            from docx import Document
            doc = Document(io.BytesIO(content))
            paragraphs = [p.text for p in doc.paragraphs if p.text]
            result = '\n'.join(paragraphs)
            print(f"docx 解析成功，文本长度: {len(result)}")
            return result
        except ImportError:
            raise ValueError("需要安装 python-docx: pip install python-docx")
        except Exception as e:
            raise ValueError(f"docx 解析失败: {str(e)}")

    # 2. PDF (.pdf)
    elif ext == '.pdf':
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(io.BytesIO(content))
            texts = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    texts.append(text)
            result = '\n'.join(texts)
            print(f"pdf 解析成功，文本长度: {len(result)}")
            return result
        except ImportError:
            raise ValueError("需要安装 PyPDF2: pip install PyPDF2")
        except Exception as e:
            raise ValueError(f"pdf 解析失败: {str(e)}")

    # 3. 纯文本文件
    elif ext in ['.txt', '.md', '.markdown', '.html', '.htm', '.xml', '.json', '.csv',
                 '.log', '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c',
                 '.h', '.hpp', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala',
                 '.r', '.m', '.mm', '.cs', '.vb', '.fs', '.lua', '.pl', '.sh', '.bat',
                 '.cmd', '.ps1', '.sql', '.yaml', '.yml', '.ini', '.conf', '.config',
                 '.properties', '.env', '.gitignore', '.dockerfile', '.makefile',
                 '.cmake', '.gradle', '.sbt', '.toml', '.lock', '.sum', '.mod']:
        result = content.decode('utf-8', errors='ignore')
        print(f"文本文件解析成功，长度: {len(result)}")
        return result

    # 4. Word 旧格式 (.doc)
    elif ext == '.doc':
        try:
            import subprocess
            result = subprocess.run(['antiword', '-'], input=content, capture_output=True)
            if result.returncode == 0:
                return result.stdout.decode('utf-8', errors='ignore')
            else:
                raise ValueError(".doc 格式需要安装 antiword 或转换工具")
        except FileNotFoundError:
            raise ValueError(".doc 格式需要安装 antiword: apt-get install antiword (Linux/Mac) 或转换工具")
        except Exception as e:
            raise ValueError(f"doc 解析失败: {str(e)}")

    # 5. EPUB 电子书 (.epub)
    elif ext == '.epub':
        try:
            import zipfile
            import re

            with zipfile.ZipFile(io.BytesIO(content)) as z:
                texts = []
                for name in z.namelist():
                    if name.endswith(('.html', '.xhtml', '.htm')):
                        html = z.read(name).decode('utf-8', errors='ignore')
                        text = re.sub(r'<[^>]+>', '', html)
                        text = re.sub(r'&\w+;', ' ', text)
                        texts.append(text)
                result = '\n'.join(texts)
                print(f"epub 解析成功，文本长度: {len(result)}")
                return result
        except Exception as e:
            raise ValueError(f"epub 解析失败: {str(e)}")

    # 6. RTF 格式 (.rtf)
    elif ext == '.rtf':
        try:
            from striprtf.striprtf import rtf_to_text
            result = rtf_to_text(content.decode('utf-8', errors='ignore'))
            print(f"rtf 解析成功，文本长度: {len(result)}")
            return result
        except ImportError:
            raise ValueError("需要安装 striprtf: pip install striprtf")
        except Exception as e:
            raise ValueError(f"rtf 解析失败: {str(e)}")

    # 7. ODT 格式 (.odt)
    elif ext == '.odt':
        try:
            import zipfile
            from xml.etree import ElementTree as ET

            with zipfile.ZipFile(io.BytesIO(content)) as z:
                xml = z.read('content.xml')
                root = ET.fromstring(xml)
                texts = []
                for elem in root.iter():
                    if elem.text and elem.text.strip():
                        texts.append(elem.text)
                result = '\n'.join(texts)
                print(f"odt 解析成功，文本长度: {len(result)}")
                return result
        except Exception as e:
            raise ValueError(f"odt 解析失败: {str(e)}")

    # 8. 图片 OCR
    elif ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp']:
        try:
            from PIL import Image
            import pytesseract

            image = Image.open(io.BytesIO(content))
            result = pytesseract.image_to_string(image, lang='chi_sim+eng')
            print(f"OCR 识别成功，文本长度: {len(result)}")
            return result
        except ImportError:
            raise ValueError("需要安装 pytesseract 和 Tesseract-OCR: pip install pytesseract pillow")
        except Exception as e:
            raise ValueError(f"OCR 识别失败: {str(e)}")

    # 9. 默认：尝试当纯文本处理
    else:
        try:
            result = content.decode('utf-8', errors='ignore')
            print(f"默认解析成功，文本长度: {len(result)}")
            return result
        except:
            raise ValueError(f"不支持的文件格式: {ext}")


@app.post("/convert")
async def convert_novel(file: UploadFile = File(...), title: str = "未命名", download: bool = False):
    try:
        content = await file.read()
        print(f"收到文件: {file.filename}, 大小: {len(content)} bytes")

        text = extract_text_from_file(content, file.filename)

        print(f"提取的文本长度: {len(text)}")
        print(f"文本前200字: {text[:200]}")

        if not text or not text.strip():
            return {"error": "无法从文件中提取文本，文件可能为空或损坏"}

        parser = NovelParser()
        chapters = parser.split_chapters(text)

        print(f"切分章节数: {len(chapters)}")
        print(f"章节类型: {type(chapters)}")

        # 详细检查每个章节
        for i, item in enumerate(chapters):
            print(f"  章节{i+1} 类型: {type(item)}")
            if isinstance(item, tuple) and len(item) == 2:
                print(f"    标题: {item[0][:50]}...")
                print(f"    内容长度: {len(item[1])}")
            else:
                print(f"    错误: 不是正确的 (title, content) 格式")
                print(f"    实际内容: {str(item)[:100]}")

        # 确保 chapters 格式正确
        valid_chapters = []
        for item in chapters:
            if isinstance(item, tuple) and len(item) == 2:
                valid_chapters.append(item)
            else:
                print(f"警告: 跳过无效章节数据: {type(item)}")

        if not valid_chapters:
            return {"error": "无法识别章节结构，请检查文件内容是否包含章节标题（如'第一章'）"}

        generator = ScreenplayGenerator()
        screenplay = generator.generate_full(valid_chapters, title)

        yaml_content = screenplay.to_yaml()

        if download:
            return StreamingResponse(
                io.StringIO(yaml_content),
                media_type="text/yaml",
                headers={"Content-Disposition": "attachment; filename=screenplay.yaml"}
            )
        return StreamingResponse(io.StringIO(yaml_content), media_type="text/yaml")

    except ValueError as e:
        print(f"值错误: {str(e)}")
        return {"error": str(e)}
    except Exception as e:
        import traceback
        print(f"错误详情: {traceback.format_exc()}")
        return {"error": f"处理失败: {str(e)}"}


@app.post("/analyze")
async def analyze_screenplay(request: AnalyzeRequest):
    try:
        from analyzer import ScreenplayAnalyzer
        analyzer = ScreenplayAnalyzer()
        result = analyzer.full_analysis(request.yaml_text)
        return result
    except Exception as e:
        import traceback
        print(f"分析错误: {traceback.format_exc()}")
        return {"error": f"分析失败: {str(e)}"}


# ========== 历史记录接口 ==========

class SaveHistoryRequest(BaseModel):
    title: str
    novel_content: str
    yaml_content: str
    analysis_data: str = "{}"


@app.post("/history/save")
async def save_history(request: SaveHistoryRequest, db: Session = Depends(get_db)):
    """保存历史记录"""
    try:
        record = ScreenplayHistory(
            user_id="default",
            title=request.title,
            novel_content=request.novel_content,
            yaml_content=request.yaml_content,
            analysis_data=request.analysis_data
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return {"id": record.id, "message": "保存成功"}
    except Exception as e:
        db.rollback()
        return {"error": f"保存失败: {str(e)}"}


@app.get("/history/list")
async def get_history_list(limit: int = 20, db: Session = Depends(get_db)):
    """获取历史列表（按时间倒序）"""
    try:
        records = db.query(ScreenplayHistory) \
            .order_by(ScreenplayHistory.updated_at.desc()) \
            .limit(limit) \
            .all()
        return [{
            "id": r.id,
            "title": r.title,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M"),
            "updated_at": r.updated_at.strftime("%Y-%m-%d %H:%M")
        } for r in records]
    except Exception as e:
        return {"error": f"查询失败: {str(e)}"}


@app.get("/history/{history_id}")
async def get_history_detail(history_id: int, db: Session = Depends(get_db)):
    """获取单条历史详情"""
    try:
        record = db.query(ScreenplayHistory) \
            .filter(ScreenplayHistory.id == history_id) \
            .first()
        if not record:
            return {"error": "记录不存在"}

        analysis = {}
        try:
            analysis = json.loads(record.analysis_data) if record.analysis_data else {}
        except:
            analysis = {}

        return {
            "id": record.id,
            "title": record.title,
            "novel_content": record.novel_content,
            "yaml_content": record.yaml_content,
            "analysis_data": analysis,
            "created_at": record.created_at.strftime("%Y-%m-%d %H:%M"),
            "updated_at": record.updated_at.strftime("%Y-%m-%d %H:%M")
        }
    except Exception as e:
        return {"error": f"查询失败: {str(e)}"}


@app.delete("/history/{history_id}")
async def delete_history(history_id: int, db: Session = Depends(get_db)):
    """删除历史记录"""
    try:
        record = db.query(ScreenplayHistory) \
            .filter(ScreenplayHistory.id == history_id) \
            .first()
        if record:
            db.delete(record)
            db.commit()
            return {"message": "删除成功"}
        return {"error": "记录不存在"}
    except Exception as e:
        db.rollback()
        return {"error": f"删除失败: {str(e)}"}


@app.get("/")
async def root():
    return {
        "message": "AI剧本引擎运行中",
        "docs": "/docs",
        "supported_formats": [
            ".txt", ".md", ".docx", ".pdf", ".epub",
            ".rtf", ".odt", ".html", ".xml", ".json",
            ".csv", ".py", ".js", ".ts", ".java", ".cpp"
        ]
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)