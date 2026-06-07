import re
from typing import List, Tuple


class NovelParser:
    """只负责切分章节，角色提取交给 AI"""

    def split_chapters(self, text: str) -> List[Tuple[str, str]]:
        """切分章节"""
        pattern = r'(第[一二三四五六七八九十百零\d]+章[：:\s]*.+?)(?=(?:第[一二三四五六七八九十百零\d]+章[：:\s]*|$))'
        matches = list(re.finditer(pattern, text, re.DOTALL))

        if len(matches) >= 3:
            result = []
            for m in matches:
                content = m.group(1).strip()
                title = content.split('\n')[0].strip()
                result.append((title, content))
            return result

        # 回退
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        chunks = []
        current_chunk = []
        current_len = 0

        for p in paragraphs:
            current_chunk.append(p)
            current_len += len(p)
            if current_len > 3000:
                chunks.append('\n\n'.join(current_chunk))
                current_chunk = []
                current_len = 0

        if current_chunk:
            chunks.append('\n\n'.join(current_chunk))

        # 确保返回 Tuple[str, str] 格式
        return [(f"Chapter_{i + 1}", chunk) for i, chunk in enumerate(chunks)]

    def extract_characters(self, text: str) -> List[dict]:
        """不再使用，返回空列表"""
        return []