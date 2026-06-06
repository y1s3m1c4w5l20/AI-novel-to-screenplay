import yaml
from collections import defaultdict, Counter


class ScreenplayAnalyzer:
    """剧本分析引擎：冲突热力图、节奏分析、镜头建议、戏份平衡"""

    def full_analysis(self, yaml_text: str) -> dict:
        """主入口：传入 YAML 文本，返回完整分析数据"""
        data = yaml.safe_load(yaml_text)
        return {
            "角色冲突热力图": self.conflict_heatmap(data),
            "节奏分析报告": self.pacing_analysis(data),
            "镜头语言汇总": self.camera_suggestions(data),
            "角色戏份平衡": self.role_balance(data),
            "情绪曲线数据": self.emotion_curve(data)
        }

    def conflict_heatmap(self, data: dict) -> list:
        """分析角色间冲突强度"""
        scenes = data.get("场景序列", [])
        edges = defaultdict(lambda: {"weight": 0, "scenes": set()})

        for scene in scenes:
            chars = scene.get("在场角色", [])
            tension = scene.get("戏剧张力", 5)
            for i, c1 in enumerate(chars):
                for c2 in chars[i + 1:]:
                    key = tuple(sorted([c1, c2]))
                    edges[key]["weight"] += tension
                    edges[key]["scenes"].add(scene.get("编号", ""))

        # 获取角色名映射
        chars = data.get("角色库", [])
        name_map = {c["编号"]: c["姓名"] for c in chars}

        result = []
        for (c1, c2), info in edges.items():
            result.append({
                "角色A": name_map.get(c1, c1),
                "角色B": name_map.get(c2, c2),
                "冲突强度": info["weight"],
                "同场次数": len(info["scenes"])
            })

        return sorted(result, key=lambda x: x["冲突强度"], reverse=True)

    def pacing_analysis(self, data: dict) -> dict:
        """节奏分析报告"""
        scenes = data.get("场景序列", [])
        tensions = [s.get("戏剧张力", 5) for s in scenes]
        durations = [s.get("预估时长", 1.0) for s in scenes]

        dialogue_count = sum(
            1 for s in scenes for b in s.get("节拍", [])
            if b.get("类型") == "dialogue"
        )
        action_count = sum(
            1 for s in scenes for b in s.get("节拍", [])
            if b.get("类型") == "action"
        )

        if tensions and tensions[0] > tensions[-1] * 1.5:
            verdict = "前紧后松，建议第三幕加强张力"
        elif len(durations) > 3 and max(durations) > min(durations) * 3:
            verdict = "场景时长不均，建议精简过长场景"
        else:
            verdict = "节奏平稳，符合标准三幕结构"

        return {
            "总预估时长_分钟": round(sum(durations), 1),
            "平均场景时长": round(sum(durations) / len(durations), 1) if durations else 0,
            "张力曲线": tensions,
            "对白动作比": f"{dialogue_count}:{action_count}",
            "节奏诊断": verdict
        }

    def camera_suggestions(self, data: dict) -> list:
        """汇总所有镜头建议"""
        suggestions = []
        for scene in data.get("场景序列", []):
            for beat in scene.get("节拍", []):
                if beat.get("镜头建议"):
                    suggestions.append({
                        "场景编号": scene.get("场景序号"),
                        "场景地点": scene.get("地点"),
                        "节拍类型": beat.get("类型"),
                        "镜头建议": beat.get("镜头建议"),
                        "上下文": beat.get("内容", "")[:40] + "..."
                    })
        return suggestions

    def role_balance(self, data: dict) -> list:
        """角色戏份平衡分析"""
        scenes = data.get("场景序列", [])
        counter = Counter()
        for scene in scenes:
            for char in scene.get("在场角色", []):
                counter[char] += 1

        chars = data.get("角色库", [])
        name_map = {c["编号"]: c["姓名"] for c in chars}
        total = sum(counter.values())

        return [{
            "角色": name_map.get(cid, cid),
            "出场次数": count,
            "占比_百分比": round(count / total * 100, 1) if total else 0,
            "诊断": "主角戏份充足" if count == max(counter.values()) else "配角"
        } for cid, count in counter.most_common()]

    def emotion_curve(self, data: dict) -> list:
        """情绪曲线数据（给前端画折线图）"""
        return [{
            "场景编号": s.get("场景序号"),
            "场景摘要": s.get("摘要", "")[:20],
            "戏剧张力": s.get("戏剧张力", 5),
            "情绪基调": s.get("情绪基调", "中性")
        } for s in data.get("场景序列", [])]