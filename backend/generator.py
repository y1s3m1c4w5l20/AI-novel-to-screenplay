import os
import yaml
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from schema import Screenplay, Scene, Character, Beat, Metadata, Act, PlotPoint, EmotionalNode

load_dotenv()

SYSTEM_PROMPT = """你是一位资深电影编剧，擅长将小说改编为专业剧本。
规则：
1. 场景时长不超过3分钟
2. 对白口语化，去除书面语
3. 心理描写转化为动作或潜台词
4. 每个场景标注戏剧张力（1-10）
5. 输出必须是合法YAML，不要markdown代码块
6. 角色ID用 char_0, char_1, char_2... 按出场顺序分配
7. 只有真正的人名才能作为角色，物品、动词、形容词绝对不能当角色"""

USER_TEMPLATE = """请将以下小说章节改编为剧本。

小说原文：
{chapter_text}

要求：
1. 先列出本章出现的【真实人名角色】（只有人名，排除物品、动词、形容词），格式：
   characters:
     - id: char_0
       name: 林默
     - id: char_1
       name: 苏婉
2. 再生成场景，严格使用上面的角色ID
3. 在场角色必须用角色ID列表
4. 对白标注说话人（必须用角色ID）和表演提示
5. 动作描述加镜头建议

输出格式：
characters:
  - id: char_0
    name: 角色名
scenes:
  - id: scene_001
    scene_number: 1
    int_ext: INT
    location: 地点
    time_of_day: NIGHT
    chapter_source: {chapter_title}
    synopsis: 摘要
    characters_present: [char_0, char_1]
    beats:
      - beat_number: 1
        type: action
        content: 动作描述
        camera_suggestion: 镜头建议
      - beat_number: 2
        type: dialogue
        content: 对白内容
        speaker: char_0
        speaker_name: 角色名
        parenthetical: (低声)
        subtext: 潜台词
    dramatic_tension: 5
    emotional_tone: 紧张
    pacing_suggestion: 节奏建议"""


class ScreenplayGenerator:
    def __init__(self, model: str = "moonshot-v1-8k"):
        api_key = os.getenv("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_API_BASE")

        kwargs = {
            "model": model,
            "api_key": api_key,
            "temperature": 0.7,
            "max_tokens": 4000
        }

        if base_url:
            kwargs["base_url"] = base_url

        self.llm = ChatOpenAI(**kwargs)

    def generate_scene(self, chapter_text: str, chapter_title: str, scene_idx: int, title: str) -> tuple:
        """返回 (场景, 角色列表)"""

        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=USER_TEMPLATE.format(
                chapter_text=chapter_text[:4000],
                chapter_title=chapter_title,
                title=title
            ))
        ]

        try:
            response = self.llm.invoke(messages)
            content = response.content.strip()

            # 清理markdown
            if content.startswith("```yaml"):
                content = content[7:]
            elif content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

            # 如果还有 ``` 在中间
            if "```" in content:
                parts = content.split("```")
                if len(parts) >= 2:
                    content = parts[1].strip()

            data = yaml.safe_load(content)

            # 提取角色
            raw_chars = data.get("characters", [])
            char_list = [{"id": c["id"], "name": c["name"]} for c in raw_chars if "name" in c and len(c["name"]) >= 2]

            # 提取场景
            scene_data = data.get("scenes", [{}])[0]
            scene = Scene(
                id=f"scene_{scene_idx:03d}",
                scene_number=scene_idx,
                int_ext=scene_data.get("int_ext", "INT"),
                location=scene_data.get("location", "未知地点"),
                time_of_day=scene_data.get("time_of_day", "DAY"),
                chapter_source=chapter_title,
                synopsis=scene_data.get("synopsis", ""),
                characters_present=scene_data.get("characters_present", []),
                dramatic_tension=scene_data.get("dramatic_tension", 5),
                emotional_tone=scene_data.get("emotional_tone", "neutral"),
                pacing_suggestion=scene_data.get("pacing_suggestion", ""),
                beats=self._parse_beats(scene_data.get("beats", []))
            )

            return scene, char_list

        except Exception as e:
            print(f"生成失败: {e}")
            fallback_scene = self._fallback(chapter_title, scene_idx)
            return fallback_scene, []

    def _parse_beats(self, beats_data: list) -> list:
        beats = []
        for i, b in enumerate(beats_data or []):
            beats.append(Beat(
                beat_number=i + 1,
                type=b.get("type", "action"),
                content=b.get("content", ""),
                speaker=b.get("speaker"),
                speaker_name=b.get("speaker_name"),
                parenthetical=b.get("parenthetical"),
                subtext=b.get("subtext"),
                camera_suggestion=b.get("camera_suggestion"),
                props=b.get("props", [])
            ))
        return beats

    def _fallback(self, chapter_title: str, idx: int) -> Scene:
        return Scene(
            id=f"scene_{idx:03d}",
            scene_number=idx,
            int_ext="INT",
            location="未指定",
            time_of_day="DAY",
            chapter_source=chapter_title,
            synopsis="（AI生成失败，请手动编辑）",
            beats=[Beat(beat_number=1, type="note", content="生成异常，请检查API或重试")]
        )

    def generate_full(self, chapters: list, title: str = "未命名剧本") -> Screenplay:
        """主入口：逐章生成，收集角色"""
        all_scenes = []
        all_characters = {}  # id -> name
        scene_idx = 1

        for ch_title, ch_text in chapters:
            scene, chars = self.generate_scene(ch_text, ch_title, scene_idx, title)
            all_scenes.append(scene)

            # 合并角色（去重）
            for c in chars:
                if c["id"] not in all_characters:
                    all_characters[c["id"]] = c["name"]

            scene_idx += 1

        # 构建角色对象
        character_objs = []
        for cid, name in sorted(all_characters.items()):
            # 统计出场和对白
            scenes_appearing = [s.id for s in all_scenes if cid in s.characters_present]
            dialogue_count = sum(
                1 for s in all_scenes for b in s.beats
                if b.type == "dialogue" and b.speaker == cid
            )

            char_type = "protagonist" if len(character_objs) == 0 else "supporting"

            character_objs.append(Character(
                id=cid,
                name=name,
                type=char_type,
                scenes_appearing=scenes_appearing,
                dialogue_count=dialogue_count
            ))

        # 修正 beats 里的 speaker_name
        name_map = {c.id: c.name for c in character_objs}
        for scene in all_scenes:
            for beat in scene.beats:
                if beat.type == "dialogue" and beat.speaker and beat.speaker in name_map:
                    beat.speaker_name = name_map[beat.speaker]

        # 填充结构分析
        screenplay = Screenplay(
            metadata=Metadata(
                title=title,
                source_title=title,
                total_scenes=len(all_scenes)
            ),
            characters=character_objs,
            scenes=all_scenes
        )

        self._analyze_structure(screenplay)

        return screenplay

    def _analyze_structure(self, sp: Screenplay):
        """用规则填充三幕结构和情绪弧线"""
        n = len(sp.scenes)
        if n == 0:
            return

        act1_end = max(1, n // 3)
        act2_end = max(2, 2 * n // 3)

        sp.structure.acts = [
            Act(act_number=1, title="第一幕：铺垫",
                scenes=[s.id for s in sp.scenes[:act1_end]],
                summary="建立人物关系，引入核心悬念"),
            Act(act_number=2, title="第二幕：对抗",
                scenes=[s.id for s in sp.scenes[act1_end:act2_end]],
                summary="冲突升级，真相逐步揭露"),
            Act(act_number=3, title="第三幕：高潮",
                scenes=[s.id for s in sp.scenes[act2_end:]],
                summary="危机爆发，推向最终对决")
        ]

        sp.structure.emotional_arc = [
            EmotionalNode(
                scene_id=s.id,
                valence=0.0,
                arousal=s.dramatic_tension / 10.0
            ) for s in sp.scenes
        ]

        if n >= 3:
            sp.structure.plot_points = [
                PlotPoint(type="inciting_incident", scene_id=sp.scenes[0].id,
                          description="悬念触发：雨夜访客带来惊天秘密"),
                PlotPoint(type="midpoint", scene_id=sp.scenes[n // 2].id,
                          description="真相揭示：日记暴露上司涉案"),
                PlotPoint(type="climax", scene_id=sp.scenes[-1].id,
                          description="高潮危机：停电暗示杀手已至")
            ]