import React, { useState, useEffect } from 'react';
import { BookOpen, Film, Download, Sparkles, Loader2 } from 'lucide-react';
import FileUpload from './components/FileUpload';
import CharacterPanel from './components/CharacterPanel';
import SceneCard from './components/SceneCard';
import EmotionChart from './components/EmotionChart';
import ConflictGraph from './components/ConflictGraph';
import yaml from 'js-yaml';

const API_BASE = 'http://localhost:8000';

function App() {
  const [screenplay, setScreenplay] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'scenes' | 'characters' | 'analysis'>('scenes');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.opacity = '0';
    document.body.style.transform = 'translateY(20px)';
    setTimeout(() => {
      document.body.style.transition = 'all 0.8s ease-out';
      document.body.style.opacity = '1';
      document.body.style.transform = 'translateY(0)';
    }, 200);
  }, []);

  const handleFileUpload = async (content: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const blob = new Blob([content], { type: 'text/plain' });
      const file = new File([blob], 'novel.txt', { type: 'text/plain' });
      
      // 1. 调用 /convert 生成剧本
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', '未命名剧本');
      
      const convertRes = await fetch(`${API_BASE}/convert`, {
        method: 'POST',
        body: formData
      });
      
      if (!convertRes.ok) throw new Error(`转换失败: ${convertRes.status}`);
      
      const yamlText = await convertRes.text();
      console.log('收到 YAML:', yamlText.substring(0, 200));

      // 2. 调用 /analyze 分析剧本
      const analyzeRes = await fetch(`${API_BASE}/analyze?yaml_text=${encodeURIComponent(yamlText)}`, {
        method: 'POST'
      });
      
      let analysisData = null;
      if (analyzeRes.ok) {
        analysisData = await analyzeRes.json();
        setAnalysis(analysisData);
        console.log('分析数据:', analysisData);
      }

      // 3. 解析数据并显示
      const parsed = parseData(yamlText, analysisData);
      setScreenplay(parsed);
      
    } catch (err: any) {
      console.error('上传失败:', err);
      setError(err.message || '上传失败，请检查后端是否运行');
    } finally {
      setLoading(false);
    }
  };

  // 解析后端数据为前端展示格式
  const parseData = (yamlText: string, analysisData: any): any => {
    try {
      // 真正解析 YAML
      const data = yaml.load(yamlText) as any;
      
      return {
        metadata: {
          title: data?.元信息?.标题 || "AI 生成剧本",
          source_title: data?.元信息?.原作品标题 || "上传的小说",
          total_scenes: data?.场景序列?.length || 0
        },
        characters: data?.角色库?.map((c: any, i: number) => {
          // 从场景序列中找出该角色出场的场景编号
          const appearingScenes = data?.场景序列
            ?.filter((s: any) => s.在场角色?.includes(c.编号))
            ?.map((s: any) => s.编号 || `scene_${s.场景序号}`) || [];
          
          return {
            id: c.编号 || `char_${i}`,
            name: c.姓名 || "未知角色",
            type: c.类型 === 'protagonist' ? 'protagonist' : 'supporting',
            description: c.简介 || "",
            dialogue_count: Math.round((appearingScenes.length || 1) * 2),
            scenes_appearing: appearingScenes.length > 0 ? appearingScenes : [`scene_001`]
          };
        }) || [],
        scenes: data?.场景序列?.map((s: any, i: number) => ({
          id: s.编号 || `scene_${i}`,
          scene_number: s.场景序号 || i + 1,
          heading: {
            int_ext: s.地点?.includes("内") ? "INT" : "EXT",
            location: s.地点 || "未知地点",
            time_of_day: s.时间 || "DAY"
          },
          content: {
            synopsis: s.摘要 || "场景描述",
            estimated_duration: s.预估时长 || 2.0,
            characters_present: s.在场角色 || [],
            beats: s.节拍?.map((b: any, j: number) => ({
              beat_number: j + 1,
              type: b.类型 || "action",
              content: b.内容 || "",
              action: {
                text: b.内容 || "",
                camera_suggestion: b.镜头建议 || ""
              }
            })) || []
          },
          ai_analysis: {
            dramatic_tension: s.戏剧张力 || 5,
            emotional_tone: s.情绪基调 || "未知",
            pacing_suggestion: "节奏建议"
          }
        })) || [],
        structure: {
          emotional_arc: data?.场景序列?.map((s: any) => ({
            scene_id: s.编号 || "",
            scene_number: s.场景序号 || 0,
            valence: (s.戏剧张力 || 5) > 5 ? -0.5 : 0.3,
            arousal: (s.戏剧张力 || 5) / 10,
            dramatic_tension: s.戏剧张力 || 5
          })) || []
        }
      };
    } catch (err) {
      console.error('YAML 解析失败:', err);
      // 解析失败时返回空结构
      return {
        metadata: { title: "解析失败", total_scenes: 0 },
        characters: [],
        scenes: [],
        structure: { emotional_arc: [] }
      };
    }
  };

  const exportYAML = () => {
    if (!screenplay) return;
    const yaml = JSON.stringify(screenplay, null, 2);
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'screenplay.yaml';
    a.click();
  };
  // 重新上传（清空当前数据）
  const handleReset = () => {
    setScreenplay(null);
    setAnalysis(null);
    setActiveTab('scenes');
    setError(null);
    localStorage.removeItem('screenplay_data');
    localStorage.removeItem('analysis_data');
  };

  // 保存到 localStorage（刷新不丢失）
  useEffect(() => {
    if (screenplay) {
      localStorage.setItem('screenplay_data', JSON.stringify(screenplay));
      localStorage.setItem('analysis_data', JSON.stringify(analysis));
    }
  }, [screenplay, analysis]);

  // 页面刷新时恢复数据
  useEffect(() => {
    const savedScreenplay = localStorage.getItem('screenplay_data');
    const savedAnalysis = localStorage.getItem('analysis_data');
    if (savedScreenplay) {
      try {
        setScreenplay(JSON.parse(savedScreenplay));
        if (savedAnalysis) {
          setAnalysis(JSON.parse(savedAnalysis));
        }
      } catch (e) {
        console.error('恢复数据失败:', e);
      }
    }
  }, []);

  const getConflictEdges = () => {
    if (!analysis?.角色冲突热力图) return [];
    return analysis.角色冲突热力图.map((item: any) => ({
      source: item.角色A,
      target: item.角色B,
      strength: item.冲突强度 / 30
    }));
  };

  const getEmotionData = () => {
    if (!analysis?.情绪曲线数据) return [];
    return analysis.情绪曲线数据.map((item: any) => ({
      scene_id: `scene_${item.场景编号}`,
      scene_number: item.场景编号,
      valence: item.戏剧张力 > 5 ? -0.5 : 0.3,
      arousal: item.戏剧张力 / 10,
      dramatic_tension: item.戏剧张力
    }));
  };

  return (
    <div className="min-h-screen bg-gray-100">
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
            <div className="flex items-center gap-2">
              <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
                <span>↻</span> 重新上传
              </button>
              <button onClick={exportYAML} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                <Download className="w-4 h-4" /> 导出 YAML
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!screenplay ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">将小说转化为专业剧本</h2>
              <p className="text-gray-600">上传你的小说文本，AI 将自动分析结构、提取角色、生成结构化剧本</p>
            </div>
            
            {loading ? (
              <div className="flex flex-col items-center gap-4 p-8">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="text-gray-600">AI 正在分析小说并生成剧本...</p>
              </div>
            ) : (
              <FileUpload onFileUpload={handleFileUpload} />
            )}
            
            {error && <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">❌ {error}</div>}
            
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
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-3 space-y-6">
              <CharacterPanel characters={screenplay.characters} />
              <ConflictGraph characters={screenplay.characters} edges={getConflictEdges()} />
            </div>
            <div className="col-span-9">
              <div className="flex gap-2 mb-6 bg-white p-1 rounded-lg shadow-sm">
                {(['scenes', 'characters', 'analysis'] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
                      activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}>
                    {tab === 'scenes' && '场景列表'}
                    {tab === 'characters' && '角色详情'}
                    {tab === 'analysis' && '剧本分析'}
                  </button>
                ))}
              </div>

              {activeTab === 'scenes' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800">场景列表 ({screenplay.scenes.length})</h2>
                    <span className="text-sm text-gray-500">总时长约 {screenplay.scenes.reduce((sum: number, s: any) => sum + (s.content.estimated_duration || 0), 0).toFixed(1)} 分钟</span>
                  </div>
                  {screenplay.scenes.map((scene: any) => <SceneCard key={scene.id} scene={scene} />)}
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
                              char.type === 'antagonist' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {char.type === 'protagonist' ? '主角' : char.type === 'antagonist' ? '反派' : '配角'}
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
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'analysis' && (
                <div className="space-y-6">
                  <EmotionChart data={getEmotionData()} />
                  {analysis?.节奏分析报告 && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">节奏分析</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="text-sm text-gray-600">总预估时长</div>
                          <div className="text-xl font-bold text-blue-600">{analysis.节奏分析报告.总预估时长_分钟} 分钟</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="text-sm text-gray-600">平均场景时长</div>
                          <div className="text-xl font-bold text-green-600">{analysis.节奏分析报告.平均场景时长} 分钟</div>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600">节奏诊断</div>
                        <div className="text-gray-800">{analysis.节奏分析报告.节奏诊断}</div>
                      </div>
                    </div>
                  )}
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
                        <div className="text-2xl font-bold text-purple-600">{screenplay.characters.reduce((sum: number, c: any) => sum + c.dialogue_count, 0)}</div>
                        <div className="text-sm text-gray-600">对白数</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{Math.max(...screenplay.scenes.map((s: any) => s.ai_analysis.dramatic_tension))}</div>
                        <div className="text-sm text-gray-600">最高张力</div>
                      </div>
                    </div>
                  </div>
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