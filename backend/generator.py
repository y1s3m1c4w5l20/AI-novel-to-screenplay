import os
import re
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
5. 输出格式必须是下面示例的纯文本标记格式，禁止使用 YAML/JSON
6. 角色ID用 char_0, char_1... 按出场顺序分配
7. time_of_day 只能是 DAY/NIGHT/DAWN/DUSK/LATER/CONTINUOUS 之一
8. 如果章节内容太短，也必须输出最小场景
9. 同一角色在不同章节必须使用相同的角色ID和名字"""

USER_TEMPLATE = """请将以下小说章节改编为剧本。

小说原文：
{chapter_text}

【角色列表】：
char_0: 角色A
char_1: 角色B

【输出格式】：
[SCENE]
scene_number: 1
int_ext: INT
location: 地点
time_of_day: NIGHT
synopsis: 摘要
dramatic_tension: 5
emotional_tone: 紧张
characters_present: [char_0, char_1]
[/SCENE]

[BEAT:action]
content: 动作
camera_suggestion: 镜头
[/BEAT]

[BEAT:dialogue]
speaker: char_0
speaker_name: 角色A
content: 对白
parenthetical: (低声)
subtext: 潜台词
[/BEAT]

[SCENE_END]
[/SCENE_END]

注意：
- 每个场景以 [SCENE] 开始，[SCENE_END] 结束
- 每个节拍以 [BEAT:类型] 开始，[/BEAT] 结束
- 必须输出至少一个场景
- 同一角色在不同章节必须使用相同的ID和名字
- 对白尽量简洁，不要过长"""


class ScreenplayGenerator:
    def __init__(self, model: str = "moonshot-v1-8k"):
        api_key = os.getenv("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_API_BASE")

        kwargs = {
            "model": model,
            "api_key": api_key,
            "temperature": 0.7,
            "max_tokens": 8000
        }

        if base_url:
            kwargs["base_url"] = base_url

        self.llm = ChatOpenAI(**kwargs)

    def _parse_text_format(self, text: str, chapter_title: str, scene_idx: int) -> tuple:
        """解析 AI 返回的纯文本标记格式"""
        scenes = []
        characters = {}

        # 提取角色
        char_section = re.search(r'【角色列表】.*?(?=\[SCENE\]|##|$)', text, re.DOTALL)
        if char_section:
            for line in char_section.group().split('\n'):
                match = re.match(r'(char_\d+)[:\s]+(.+)', line.strip())
                if match:
                    characters[match.group(1)] = match.group(2).strip()

        # 统一标签
        text = text.replace('[/SCENE]', '[SCENE_END]')

        # 找到第一个 [SCENE] 的位置
        first_scene_start = text.find('[SCENE]')
        if first_scene_start == -1:
            print("警告: 未找到 [SCENE] 标签")
            return scenes, characters

        # 只处理第一个场景
        scene_text = text[first_scene_start:]

        # 找到 [SCENE_END]
        scene_end_pos = scene_text.find('[SCENE_END]')
        if scene_end_pos != -1:
            header = scene_text[len('[SCENE]'):scene_end_pos].strip()
            beats_text = scene_text[scene_end_pos + len('[SCENE_END]'):].strip()
        else:
            first_beat = re.search(r'\[BEAT:', scene_text)
            if first_beat:
                header = scene_text[len('[SCENE]'):first_beat.start()].strip()
                beats_text = scene_text[first_beat.start():].strip()
            else:
                header = scene_text[len('[SCENE]'):].strip()
                beats_text = ""

        print(f"场景头部长度: {len(header)}, beats长度: {len(beats_text)}")

        # 解析头部
        scene_num = int(re.search(r'scene_number:\s*(\d+)', header).group(1)) if re.search(r'scene_number:\s*(\d+)', header) else scene_idx

        int_ext = re.search(r'int_ext:\s*(INT|EXT|INT\./EXT\.)', header)
        int_ext = int_ext.group(1) if int_ext else "INT"

        location = re.search(r'location:\s*(.+?)(?=\n|$)', header)
        location = location.group(1).strip() if location else "未指定地点"

        time = re.search(r'time_of_day:\s*(DAY|NIGHT|DAWN|DUSK|LATER|CONTINUOUS)', header)
        time = time.group(1) if time else "DAY"

        synopsis = re.search(r'synopsis:\s*(.+?)(?=\n|$)', header)
        synopsis = synopsis.group(1).strip() if synopsis else ""

        tension = re.search(r'dramatic_tension:\s*(\d+)', header)
        tension = int(tension.group(1)) if tension else 5

        tone = re.search(r'emotional_tone:\s*(.+?)(?=\n|$)', header)
        tone = tone.group(1).strip() if tone else "中性"

        chars_present = re.findall(r'characters_present:\s*\[(.*?)\]', header)
        chars_present = [c.strip() for c in chars_present[0].split(',')] if chars_present else []

        # 解析 BEAT
        beats = []
        beat_blocks = re.findall(r'\[BEAT:(\w+)\](.*?)\[/BEAT\]', beats_text, re.DOTALL)
        print(f"找到 {len(beat_blocks)} 个 BEAT 块")

        for j, (beat_type, beat_content) in enumerate(beat_blocks):
            content = re.search(r'content:\s*(.+?)(?=\n\w+:|$)', beat_content, re.DOTALL)
            content = content.group(1).strip() if content else ""

            speaker = re.search(r'speaker:\s*(char_\d+)', beat_content)
            speaker = speaker.group(1) if speaker else None

            speaker_name = re.search(r'speaker_name:\s*(.+?)(?=\n|$)', beat_content)
            speaker_name = speaker_name.group(1).strip() if speaker_name else None

            parenthetical = re.search(r'parenthetical:\s*(.+?)(?=\n|$)', beat_content)
            parenthetical = parenthetical.group(1).strip() if parenthetical else None

            subtext = re.search(r'subtext:\s*(.+?)(?=\n|$)', beat_content)
            subtext = subtext.group(1).strip() if subtext else None

            camera = re.search(r'camera_suggestion:\s*(.+?)(?=\n|$)', beat_content)
            camera = camera.group(1).strip() if camera else None

            beats.append(Beat(
                beat_number=j + 1,
                type=beat_type,
                content=content,
                speaker=speaker,
                speaker_name=speaker_name,
                parenthetical=parenthetical,
                subtext=subtext,
                camera_suggestion=camera
            ))

        if header:
            scenes.append(Scene(
                id=f"scene_{scene_idx:03d}",
                scene_number=scene_num,
                int_ext=int_ext,
                location=location,
                time_of_day=time,
                chapter_source=chapter_title,
                synopsis=synopsis,
                characters_present=chars_present,
                beats=beats,
                dramatic_tension=tension,
                emotional_tone=tone,
                pacing_suggestion="保持紧凑" if tension > 7 else "适当留白"
            ))
            print(f"生成场景: {len(beats)} 个 beats")

        return scenes, characters

    def generate_scene(self, chapter_text: str, characters: list, chapter_title: str, scene_idx: int, title: str) -> tuple:
        """带重试的生成"""
        valid_chars = [c for c in characters if isinstance(c, dict) and 'id' in c and 'name' in c]
        char_desc = "\n".join([f"{c['id']}: {c['name']}" for c in valid_chars]) if valid_chars else "无预设角色"

        for attempt in range(2):
            try:
                messages = [
                    SystemMessage(content=SYSTEM_PROMPT),
                    HumanMessage(content=USER_TEMPLATE.format(
                        characters=char_desc,
                        chapter_text=chapter_text[:4000],
                        chapter_title=chapter_title,
                        title=title
                    ))
                ]

                response = self.llm.invoke(messages)
                content = response.content.strip()

                print(f"AI 返回内容前500字:\n{content[:500]}")
                print(f"AI 返回内容总长度: {len(content)}")

                # 解析纯文本格式
                scenes, new_chars = self._parse_text_format(content, chapter_title, scene_idx)

                if scenes:
                    print(f"解析成功: {len(scenes)} 个场景, 第一个场景 beats: {len(scenes[0].beats)}")
                    return scenes[0], [{"id": k, "name": v} for k, v in new_chars.items()]
                else:
                    raise ValueError("未解析到场景")

            except Exception as e:
                print(f"生成失败 (尝试 {attempt + 1}/2): {e}")
                if attempt == 1:
                    return self._fallback(chapter_title, scene_idx), []

        return self._fallback(chapter_title, scene_idx), []

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
            # 构建正确的角色列表格式传给 AI
            char_list = [{"id": cid, "name": name} for cid, name in all_characters.items()]

            scene, chars = self.generate_scene(ch_text, char_list, ch_title, scene_idx, title)

            # 合并 AI 返回中解析的角色
            for c in chars:
                if isinstance(c, dict) and "id" in c and "name" in c:
                    if c["id"] not in all_characters:
                        all_characters[c["id"]] = c["name"]

            all_scenes.append(scene)
            scene_idx += 1

        # 从所有场景的 beats 中反向扫描角色
        for scene in all_scenes:
            for beat in scene.beats:
                if beat.type == "dialogue" and beat.speaker and beat.speaker_name:
                    if beat.speaker not in all_characters:
                        all_characters[beat.speaker] = beat.speaker_name
                    elif all_characters[beat.speaker] != beat.speaker_name:
                        all_characters[beat.speaker] = beat.speaker_name

        print(f"最终收集到角色: {all_characters}")

        # 【关键修复】收集所有 beats 中的唯一角色名
        all_names = set()
        for scene in all_scenes:
            for beat in scene.beats:
                if beat.type == "dialogue" and beat.speaker_name:
                    all_names.add(beat.speaker_name)

        print(f"发现角色名: {all_names}")

        # 建立名字到ID的映射（以第一次出现的ID为准）
        name_to_id = {}
        id_mapping = {}

        for cid, name in sorted(all_characters.items()):
            if name not in name_to_id:
                name_to_id[name] = cid
                id_mapping[cid] = cid
            else:
                id_mapping[cid] = name_to_id[name]

        # 如果 beats 中有新名字但不在 all_characters 中，添加
        for name in all_names:
            if name not in name_to_id:
                new_id = f"char_{len(name_to_id)}"
                name_to_id[name] = new_id
                id_mapping[new_id] = new_id

        # 构建唯一角色字典
        unique_characters = {}
        for name, cid in name_to_id.items():
            unique_characters[cid] = name

        all_characters = unique_characters

        # 修正所有 beats 里的 speaker（把旧 id 换成新 id）
        for scene in all_scenes:
            for beat in scene.beats:
                if beat.type == "dialogue" and beat.speaker:
                    if beat.speaker in id_mapping:
                        beat.speaker = id_mapping[beat.speaker]

            # 修正 characters_present
            scene.characters_present = [
                id_mapping.get(c, c) for c in scene.characters_present
            ]

        print(f"去重后角色: {all_characters}")

        # 构建角色对象
        character_objs = []
        for cid, name in sorted(all_characters.items()):
            # 统计该角色的出场场景
            scenes_appearing = [s.id for s in all_scenes if cid in s.characters_present]

            # 如果 AI 没填 characters_present，就从 beats 里反推
            if not scenes_appearing:
                scenes_appearing = [s.id for s in all_scenes
                                    if any(b.type == "dialogue" and b.speaker == cid for b in s.beats)]

            # 统计对白数量
            dialogue_count = sum(
                1 for s in all_scenes for b in s.beats
                if b.type == "dialogue" and b.speaker == cid
            )

            # 第一个角色默认主角，其余配角
            char_type = "protagonist" if len(character_objs) == 0 else "supporting"

            character_objs.append(Character(
                id=cid,
                name=name,
                type=char_type,
                scenes_appearing=scenes_appearing,
                dialogue_count=dialogue_count
            ))

        # 修正所有 beats 里的 speaker_name（确保和角色库一致）
        name_map = {c.id: c.name for c in character_objs}
        for scene in all_scenes:
            # 同时修正场景的 characters_present
            present_chars = set()
            for beat in scene.beats:
                if beat.type == "dialogue" and beat.speaker:
                    present_chars.add(beat.speaker)
                    if beat.speaker in name_map:
                        beat.speaker_name = name_map[beat.speaker]
            # 如果场景没记录在场角色，补上
            if not scene.characters_present:
                scene.characters_present = list(present_chars)

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
        """用规则填充三幕结构"""
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
                          description="悬念触发：核心事件引入"),
                PlotPoint(type="midpoint", scene_id=sp.scenes[n // 2].id,
                          description="真相揭示：关键转折"),
                PlotPoint(type="climax", scene_id=sp.scenes[-1].id,
                          description="高潮危机：最终对决")
            ]


# 避免循环导入，放在文件末尾
from parser import NovelParser