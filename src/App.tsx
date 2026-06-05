import React, { useState, useEffect } from 'react';
import { BookOpen, Film, Download, Sparkles } from 'lucide-react';
import FileUpload from './components/FileUpload';
import CharacterPanel from './components/CharacterPanel';
import SceneCard from './components/SceneCard';
import EmotionChart from './components/EmotionChart';
import ConflictGraph from './components/ConflictGraph';

// 模拟数据（等 A 同学的后端好了，替换为真实 API 调用）
const mockScreenplay = {
  metadata: {
    title: "示例剧本",
    source_title: "示例小说",
    total_scenes: 3,
  },
  characters: [
    {
      id: "char_001",
      name: "李明",
      type: "protagonist",
      description: "年轻侦探，冷静理智",
      dialogue_count: 12,
      scenes_appearing: ["scene_001", "scene_002"]
    },
    {
      id: "char_002",
      name: "王芳",
      type: "antagonist",
      description: "神秘女子，身份成谜",
      dialogue_count: 8,
      scenes_appearing: ["scene_001", "scene_003"]
    },
    {
      id: "char_003",
      name: "老张",
      type: "supporting",
      description: "李明的搭档，经验丰富",
      dialogue_count: 5,
      scenes_appearing: ["scene_002"]
    }
  ],
  scenes: [
    {
      id: "scene_001",
      scene_number: 1,
      heading: {
        int_ext: "INT",
        location: "废弃工厂",
        time_of_day: "NIGHT"
      },
      content: {
        synopsis: "李明追踪线索来到废弃工厂，与王芳首次对峙",
        estimated_duration: 3.5,
        characters_present: ["李明", "王芳"],
        beats: [
          {
            beat_number: 1,
            type: "action",
            content: "李明推开生锈的铁门，手电筒的光束扫过积满灰尘的地面。",
            action: {
              text: "李明推开生锈的铁门，手电筒的光束扫过积满灰尘的地面。",
              camera_suggestion: "跟拍镜头，从李明的背后拍摄，营造紧张感"
            }
          },
          {
            beat_number: 2,
            type: "dialogue",
            content: "对话内容",
            dialogue: {
              speaker: "王芳",
              text: "你终于来了，我等你很久了。",
              parenthetical: "从阴影中走出，声音低沉"
            }
          },
          {
            beat_number: 3,
            type: "action",
            content: "李明的手电筒照向声音来源。",
            action: {
              text: "李明的手电筒照向声音来源。",
              camera_suggestion: "快速变焦到王芳的脸，逆光剪影"
            }
          }
        ]
      },
      ai_analysis: {
        dramatic_tension: 9,
        emotional_tone: "紧张、悬疑",
        pacing_suggestion: "保持当前节奏，可在对话间增加环境音效"
      }
    },
    {
      id: "scene_002",
      scene_number: 2,
      heading: {
        int_ext: "EXT",
        location: "城市街道",
        time_of_day: "DAY"
      },
      content: {
        synopsis: "李明与老张讨论案情",
        estimated_duration: 2.0,
        characters_present: ["李明", "老张"],
        beats: [
          {
            beat_number: 1,
            type: "dialogue",
            content: "对话",
            dialogue: {
              speaker: "老张",
              text: "这个案子没那么简单。",
              parenthetical: "点燃一支烟"
            }
          }
        ]
      },
      ai_analysis: {
        dramatic_tension: 4,
        emotional_tone: "沉稳、思考",
        pacing_suggestion: "可适当加快，为下一场高潮铺垫"
      }
    },
    {
      id: "scene_003",
      scene_number: 3,
      heading: {
        int_ext: "INT",
        location: "警察局",
        time_of_day: "NIGHT"
      },
      content: {
        synopsis: "李明发现关键证据",
        estimated_duration: 4.0,
        characters_present: ["李明", "王芳"],
        beats: [
          {
            beat_number: 1,
            type: "action",
            content: "李明在档案室翻找文件。",
            action: {
              text: "李明在档案室翻找文件。",
              camera_suggestion: "俯拍，文件散落一桌"
            }
          }
        ]
      },
      ai_analysis: {
        dramatic_tension: 7,
        emotional_tone: "兴奋、紧迫",
        pacing_suggestion: "加快剪辑节奏，配合紧张配乐"
      }
    }
  ],
  structure: {
    emotional_arc: [
      { scene_id: "scene_001", scene_number: 1, valence: -0.8, arousal: 0.9, dramatic_tension: 9 },
      { scene_id: "scene_002", scene_number: 2, valence: 0.2, arousal: 0.3, dramatic_tension: 4 },
      { scene_id: "scene_003", scene_number: 3, valence: 0.6, arousal: 0.8, dramatic_tension: 7 }
    ]
  }
};

const mockEdges = [
  { source: "char_001", target: "char_002", strength: 0.9 },
  { source: "char_001", target: "char_003", strength: 0.5 },
  { source: "char_002", target: "char_003", strength: 0.2 }
];

function App() {
  const [screenplay, setScreenplay] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'scenes' | 'characters' | 'analysis'>('scenes');
  // 添加页面加载动画
useEffect(() => {
  document.body.style.opacity = '0';
  setTimeout(() => {
    document.body.style.transition = 'opacity 0.5s ease-in-out';
    document.body.style.opacity = '1';
  }, 100);
}, []);
  const handleFileUpload = (content: string) => {
    // 这里以后会调用 A 同学的后端 API
    // 现在先用模拟数据展示效果
    console.log('收到小说内容:', content.substring(0, 100) + '...');
    setScreenplay(mockScreenplay);
  };

  const exportYAML = () => {
  if (!screenplay) return;
  
  // 手动构建 YAML 字符串
  const toYAML = (obj: any, indent = 0): string => {
    const spaces = '  '.repeat(indent);
    let yaml = '';
    
    if (Array.isArray(obj)) {
      obj.forEach(item => {
        if (typeof item === 'object' && item !== null) {
          yaml += `${spaces}- ${toYAML(item, indent + 1).trimStart()}\n`;
        } else {
          yaml += `${spaces}- ${item}\n`;
        }
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          yaml += `${spaces}${key}: null\n`;
        } else if (typeof value === 'object') {
          yaml += `${spaces}${key}:\n${toYAML(value, indent + 1)}`;
        } else if (typeof value === 'string') {
          // 处理多行字符串
          if (value.includes('\n') || value.includes('"') || value.includes("'")) {
            yaml += `${spaces}${key}: |\n${value.split('\n').map(line => `${spaces}  ${line}`).join('\n')}\n`;
          } else {
            yaml += `${spaces}${key}: ${value}\n`;
          }
        } else {
          yaml += `${spaces}${key}: ${value}\n`;
        }
      });
    } else {
      yaml += `${spaces}${obj}\n`;
    }
    
    return yaml;
  };
  
  const yamlContent = `screenplay:\n${toYAML(screenplay, 1)}`;
  
  const blob = new Blob([yamlContent], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'screenplay.yaml';
  a.click();
};

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI 小说转剧本工具</h1>
              <p className="text-sm text-gray-500">智能改编 · 可视化编辑 · 专业输出</p>
            </div>
          </div>
          {screenplay && (
            <button
              onClick={exportYAML}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Download className="w-4 h-4" />
              导出 YAML
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!screenplay ? (
          /* 上传页面 */
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                将小说转化为专业剧本
              </h2>
              <p className="text-gray-600">
                上传你的小说文本，AI 将自动分析结构、提取角色、生成结构化剧本
              </p>
            </div>
            <FileUpload onFileUpload={handleFileUpload} />
            
            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl text-center">
                <Sparkles className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-800">智能场景切分</h3>
                <p className="text-sm text-gray-500 mt-1">自动识别章节转折点</p>
              </div>
              <div className="bg-white p-4 rounded-xl text-center">
                <Film className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-800">镜头语言建议</h3>
                <p className="text-sm text-gray-500 mt-1">每一场景附拍摄指导</p>
              </div>
              <div className="bg-white p-4 rounded-xl text-center">
                <BookOpen className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-800">YAML 标准格式</h3>
                <p className="text-sm text-gray-500 mt-1">兼容专业编剧软件</p>
              </div>
            </div>
          </div>
        ) : (
          /* 剧本编辑页面 */
          <div className="grid grid-cols-12 gap-6">
            {/* 左侧边栏 */}
            <div className="col-span-3 space-y-6">
              <CharacterPanel characters={screenplay.characters} />
              <ConflictGraph 
                characters={screenplay.characters} 
                edges={mockEdges} 
              />
            </div>

            {/* 中间内容区 */}
            <div className="col-span-9">
              {/* 标签页 */}
              <div className="flex gap-2 mb-6 bg-white p-1 rounded-lg shadow-sm">
                {(['scenes', 'characters', 'analysis'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
                      activeTab === tab
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {tab === 'scenes' && '场景列表'}
                    {tab === 'characters' && '角色详情'}
                    {tab === 'analysis' && '剧本分析'}
                  </button>
                ))}
              </div>

              {activeTab === 'scenes' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800">
                      场景列表 ({screenplay.scenes.length})
                    </h2>
                    <span className="text-sm text-gray-500">
                      总时长约 {screenplay.scenes.reduce((sum: number, s: any) => sum + s.content.estimated_duration, 0).toFixed(1)} 分钟
                    </span>
                  </div>
                  {screenplay.scenes.map((scene: any) => (
                    <SceneCard key={scene.id} scene={scene} />
                  ))}
                </div>
              )}

              {activeTab === 'analysis' && (
                <div className="space-y-6">
                  <EmotionChart data={screenplay.structure.emotional_arc} />
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">剧本统计</h3>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{screenplay.scenes.length}</div>
                        <div className="text-sm text-gray-600">场景数</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{screenplay.characters.length}</div>
                        <div className="text-sm text-gray-600">角色数</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {screenplay.characters.reduce((sum: number, c: any) => sum + c.dialogue_count, 0)}
                        </div>
                        <div className="text-sm text-gray-600">对白数</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {Math.max(...screenplay.scenes.map((s: any) => s.ai_analysis.dramatic_tension))}
                        </div>
                        <div className="text-sm text-gray-600">最高张力</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'characters' && (
  <div className="space-y-6">
    {screenplay.characters.map((char: any) => (
      <div key={char.id} className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-blue-600">{char.name[0]}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-gray-900">{char.name}</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                char.type === 'protagonist' ? 'bg-green-100 text-green-800' :
                char.type === 'antagonist' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {char.type === 'protagonist' ? '主角' : 
                 char.type === 'antagonist' ? '反派' : '配角'}
              </span>
            </div>
            <p className="text-gray-600 mb-4">{char.description}</p>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{char.dialogue_count}</div>
                <div className="text-xs text-gray-600">对白数量</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-600">{char.scenes_appearing.length}</div>
                <div className="text-xs text-gray-600">出场场景</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round((char.dialogue_count / screenplay.characters.reduce((sum: number, c: any) => sum + c.dialogue_count, 0)) * 100)}%
                </div>
                <div className="text-xs text-gray-600">戏份占比</div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">出场场景</h4>
              <div className="flex flex-wrap gap-2">
                {char.scenes_appearing.map((sceneId: string) => {
                  const scene = screenplay.scenes.find((s: any) => s.id === sceneId);
                  return scene ? (
                    <span key={sceneId} className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                      场景 {scene.scene_number}: {scene.content.synopsis.substring(0, 20)}...
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
)}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;