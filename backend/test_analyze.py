from analyzer import ScreenplayAnalyzer

yaml_text = """元信息:
  标题: 夜雨访客
  原作品标题: 夜雨访客
  作者: null
  改编者: null
  类型: []
  场景总数: 3
  预估页数: 0.0
角色库:
- 编号: char_0
  姓名: 林默
  类型: protagonist
  出场场景:
  - scene_001
  - scene_002
  - scene_003
  对白数量: 1
- 编号: char_1
  姓名: 苏婉
  类型: supporting
  出场场景:
  - scene_001
  - scene_002
  - scene_003
  对白数量: 7
场景序列:
- 编号: scene_001
  场景序号: 1
  内外景: INT
  地点: 林默昏暗的客厅
  时间: NIGHT
  来源章节: 第一章 雨夜访客
  摘要: 林默在雨夜中被前女友苏婉突然造访
  预估时长: 1.0
  在场角色:
  - char_0
  - char_1
  节拍:
  - 节拍序号: 1
    类型: action
    内容: 林默坐在沙发上
    镜头建议: 从林默的背后拍摄
  戏剧张力: 8
  情绪基调: 紧张
- 编号: scene_002
  场景序号: 2
  内外景: INT
  地点: 公寓
  时间: NIGHT
  来源章节: 第二章 旧案重提
  摘要: 苏婉透露张教授死亡的真相
  预估时长: 1.0
  在场角色:
  - char_0
  - char_1
  节拍:
  - 节拍序号: 1
    类型: dialogue
    内容: 张教授不是自杀
    说话人编号: char_1
    说话人: 苏婉
    表演提示: (直视)
    潜台词: 她知道真相
  戏剧张力: 8
  情绪基调: 紧张
- 编号: scene_003
  场景序号: 3
  内外景: INT
  地点: 实验室
  时间: NIGHT
  来源章节: 第三章 真相边缘
  摘要: 林默和苏婉发现危险逼近
  预估时长: 1.0
  在场角色:
  - char_0
  - char_1
  节拍:
  - 节拍序号: 1
    类型: dialogue
    内容: 他们来了
    说话人编号: char_1
    说话人: 苏婉
    表演提示: (低声)
    潜台词: 危险逼近
  戏剧张力: 8
  情绪基调: 紧张
结构:
  幕: []
  情节点: []
  情绪弧线: []
改编记录: []"""

analyzer = ScreenplayAnalyzer()
result = analyzer.full_analysis(yaml_text)

import json
print(json.dumps(result, ensure_ascii=False, indent=2))