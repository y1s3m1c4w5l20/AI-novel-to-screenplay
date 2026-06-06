from pydantic import BaseModel, Field
# 英文字段 → 中文字段 映射表
_KEY_MAP = {
    # 顶层
    "metadata": "元信息",
    "characters": "角色库",
    "scenes": "场景序列",
    "structure": "结构",
    "adaptation_log": "改编记录",
    # 元信息
    "title": "标题",
    "source_title": "原作品标题",
    "author": "作者",
    "adapter": "改编者",
    "genre": "类型",
    "total_scenes": "场景总数",
    "total_pages_estimate": "预估页数",
    "generation_info": "生成信息",
    # 角色
    "id": "编号",
    "name": "姓名",
    "aliases": "别名",
    "type": "类型",
    "age_estimate": "预估年龄",
    "description": "简介",
    "motivation": "核心动机",
    "arc_type": "弧线类型",
    "scenes_appearing": "出场场景",
    "dialogue_count": "对白数量",
    "key_traits": "关键特质",
    # 场景
    "scene_number": "场景序号",
    "int_ext": "内外景",
    "location": "地点",
    "time_of_day": "时间",
    "sub_location": "子地点",
    "chapter_source": "来源章节",
    "synopsis": "摘要",
    "estimated_duration": "预估时长",
    "characters_present": "在场角色",
    "beats": "节拍",
    "dramatic_tension": "戏剧张力",
    "emotional_tone": "情绪基调",
    "pacing_suggestion": "节奏建议",
    "potential_issues": "潜在问题",
    "adaptation_notes": "改编备注",
    # 节拍
    "beat_number": "节拍序号",
    "content": "内容",
    "speaker": "说话人编号",
    "speaker_name": "说话人",
    "parenthetical": "表演提示",
    "emotion_detected": "检测情绪",
    "subtext": "潜台词",
    "camera_suggestion": "镜头建议",
    "visual_notes": "视觉备注",
    "props": "道具",
    # 结构
    "acts": "幕",
    "act_number": "幕序号",
    "summary": "摘要",
    "plot_points": "情节点",
    "emotional_arc": "情绪弧线",
    "valence": "效价",
    "arousal": "唤醒度",
    # 改编记录
    "timestamp": "时间戳",
    "operation": "操作",
    "source_text": "原文",
    "adapted_to": "改编为",
    "reasoning": "理由",
    "confidence": "置信度",
}


def _translate_keys(obj):
    """递归把字典的 key 从英文换成中文"""
    if isinstance(obj, dict):
        return {_KEY_MAP.get(k, k): _translate_keys(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_translate_keys(item) for item in obj]
    return obj
from typing import List, Optional, Literal
import yaml


# ========== 元信息 ==========
class Metadata(BaseModel):
    title: str
    source_title: str
    author: Optional[str] = None
    adapter: Optional[str] = None
    genre: List[str] = []
    total_scenes: int = 0
    total_pages_estimate: float = 0.0


# ========== 角色 ==========
class Character(BaseModel):
    id: str
    name: str
    aliases: List[str] = []
    type: Literal["protagonist", "antagonist", "supporting", "extra"] = "supporting"
    age_estimate: Optional[int] = None
    description: str = ""
    motivation: str = ""
    arc_type: Literal["flat", "rising", "falling", "transformation"] = "flat"
    scenes_appearing: List[str] = []
    dialogue_count: int = 0
    key_traits: List[str] = []


# ========== 节拍 ==========
class Beat(BaseModel):
    beat_number: int
    type: Literal["action", "dialogue", "transition", "sound", "vfx", "note"]
    content: str
    speaker: Optional[str] = None
    speaker_name: Optional[str] = None
    parenthetical: Optional[str] = None
    emotion_detected: Optional[str] = None
    subtext: Optional[str] = None
    camera_suggestion: Optional[str] = None
    visual_notes: Optional[str] = None
    props: List[str] = []


# ========== 场景 ==========
class Scene(BaseModel):
    id: str
    scene_number: int
    int_ext: Literal["INT", "EXT", "INT./EXT."]
    location: str
    time_of_day: Literal["DAY", "NIGHT", "DAWN", "DUSK", "LATER", "CONTINUOUS"]
    sub_location: Optional[str] = None
    chapter_source: str
    synopsis: str
    estimated_duration: float = 1.0
    characters_present: List[str] = []
    beats: List[Beat] = []
    dramatic_tension: int = Field(5, ge=1, le=10)
    emotional_tone: str = "neutral"
    pacing_suggestion: str = ""
    potential_issues: List[str] = []
    adaptation_notes: str = ""


# ========== 结构 ==========
class Act(BaseModel):
    act_number: int
    title: str
    scenes: List[str] = []
    summary: str = ""


class PlotPoint(BaseModel):
    type: str
    scene_id: str
    description: str


class EmotionalNode(BaseModel):
    scene_id: str
    valence: float = Field(0.0, ge=-1.0, le=1.0)
    arousal: float = Field(0.5, ge=0.0, le=1.0)


class Structure(BaseModel):
    acts: List[Act] = []
    plot_points: List[PlotPoint] = []
    emotional_arc: List[EmotionalNode] = []


# ========== 改编记录 ==========
class AdaptationLog(BaseModel):
    timestamp: str
    operation: str
    source_text: str
    adapted_to: str
    reasoning: str
    confidence: float = Field(0.8, ge=0.0, le=1.0)


# ========== 完整剧本 ==========
class Screenplay(BaseModel):
    metadata: Metadata
    characters: List[Character] = []
    scenes: List[Scene] = []
    structure: Structure = Structure()
    adaptation_log: List[AdaptationLog] = []

    def to_yaml(self) -> str:
        data = self.model_dump()
        translated = _translate_keys(data)
        return yaml.dump(translated, allow_unicode=True, sort_keys=False)

    def save(self, path: str):
        with open(path, 'w', encoding='utf-8') as f:
            f.write(self.to_yaml())