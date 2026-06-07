import React, { useState, useEffect } from 'react';
import { BookOpen, Film, Download, Sparkles, Loader2 } from 'lucide-react';
import FileUpload from './components/FileUpload';
import CharacterPanel from './components/CharacterPanel';
import SceneCard from './components/SceneCard';
import EmotionChart from './components/EmotionChart';
import ConflictGraph from './components/ConflictGraph';
import HistoryPanel from './components/HistoryPanel';
import { saveHistory } from './services/history';
import yaml from 'js-yaml';

const timeMap: Record<string, string> = {
  'DAY': '白天',
  'NIGHT': '夜晚',
  'DAWN': '黎明',
  'DUSK': '黄昏',
  'MORNING': '早晨',
  'EVENING': '傍晚'
};

const API_BASE = 'http://172.20.10.3:8000';

function App() {
  const [screenplay, setScreenplay] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [yamlText, setYamlText] = useState<string>('');
  const [originalText, setOriginalText] = useState<string>(''); // 保存原始小说文本
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scenes' | 'characters' | 'analysis'>('scenes');

  // 页面刷新时恢复数据
  useEffect(() => {
    const savedScreenplay = localStorage.getItem('screenplay_data');
    const savedAnalysis = localStorage.getItem('analysis_data');
    const savedYaml = localStorage.getItem('screenplay_yaml');
    if (savedScreenplay) {
      try {
        setScreenplay(JSON.parse(savedScreenplay));
        if (savedAnalysis) setAnalysis(JSON.parse(savedAnalysis));
        if (savedYaml) setYamlText(savedYaml);
      } catch (e) {
        console.error('恢复数据失败:', e);
      }
    }
  }, []);

  // 保存到 localStorage
  useEffect(() => {
    if (screenplay) {
      localStorage.setItem('screenplay_data', JSON.stringify(screenplay));
      localStorage.setItem('screenplay_yaml', yamlText);
    }
    if (analysis) {
      localStorage.setItem('analysis_data', JSON.stringify(analysis));
    }
  }, [screenplay, analysis, yamlText]);

  const parseData = (yamlText: string, analysisData: any): any => {
    try {
      const data = yaml.load(yamlText) as any;
      // 加调试代码
      console.log('场景数量:', data['场景序列']?.length);
      console.log('第一个场景beats:', data['场景序列']?.[0]?.['节拍']?.length);
      console.log('第一个场景完整数据:', JSON.stringify(data['场景序列']?.[0], null, 2));
      return {
        metadata: {
          title: data?.元信息?.标题 || "AI 生成剧本",
          source_title: data?.元信息?.原作品标题 || "上传的小说",
          total_scenes: data?.场景序列?.length || 0
        },
        characters: data?.角色库?.map((c: any, i: number) => {
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
            int_ext: s.地点?.includes("内") || s.地点?.includes("别墅") || s.地点?.includes("办公室") ? "内景" : "外景",
            location: s.地点 || "未知地点",
            time_of_day: timeMap[s.时间?.toUpperCase()] || s.时间 || "白天"
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
          emotional_arc: analysisData?.emotional_arc || data?.场景序列?.map((s: any) => ({
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
      return {
        metadata: { title: "解析失败", total_scenes: 0 },
        characters: [],
        scenes: [],
        structure: { emotional_arc: [] }
      };
    }
  };

  const handleFileUpload = async (content: string, fileName: string) => {
  setLoading(true);  // 用你的 loading 状态
  setError(null);      // 用你的 error 状态
  console.log('收到内容前100字:', content.slice(0, 100));
  console.log('是否是YAML:', content.trim().startsWith('元信息:'));

  try {
    let yamlText: string;
    
    // 判断是否是 YAML（加强判断，防止开头有空格）
    const isYaml = content.trim().startsWith('元信息:') || 
                   content.trim().startsWith('---') || 
                   content.includes('角色库:') ||
                   content.includes('场景序列:');

    if (isYaml) {
      // 已经是 YAML（.docx/.pdf 后端已转换）
      yamlText = content;
      console.log('检测到 YAML 格式，直接解析');
      setOriginalText('');  // .docx 无法读取原始文本，设为空
    } else {
      // 是原始小说文本（.txt/.md），需要调 /convert
      setOriginalText(content);  // 保存原始文本用于历史记录
      
      const convertForm = new FormData();
      const blob = new Blob([content], { type: 'text/plain' });
      convertForm.append('file', blob, fileName);
      convertForm.append('title', '未命名');

      const convertRes = await fetch(`${API_BASE}/convert`, {
        method: 'POST',
        body: convertForm,
      });

      if (!convertRes.ok) {
        throw new Error(`转换失败: ${convertRes.status}`);
      }

      yamlText = await convertRes.text();
      console.log('转换成功, YAML长度:', yamlText.length);
    }

    setYamlText(yamlText);
    const parsed = parseData(yamlText, null);
    setScreenplay(parsed);
    setAnalysis(null);

    // 保存到历史记录
    try {
      await saveHistory(
        parsed?.metadata?.title || fileName || '未命名剧本',
        '',  // .docx 无法读取原始文本
        yamlText,
        {}
      );
      console.log('历史记录保存成功');
    } catch (err) {
      console.error('保存历史失败:', err);
    }

  } catch (err) {
    console.error('上传失败:', err);
    setError(err instanceof Error ? err.message : '上传失败');
  } finally {
    setLoading(false);
  }
};

  const handleAnalyze = async () => {
    if (!yamlText) {
      alert('请先上传小说');
      return;
    }

    setIsAnalyzing(true);
    try {
      // ✅ 正确的：POST + body 传参
      const analyzeRes = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yaml_text: yamlText })  // 放在 body 里
      });

      if (!analyzeRes.ok) {
        throw new Error(`分析失败: ${analyzeRes.status}`);
      }

      const analysisData = await analyzeRes.json();
      console.log('分析数据:', analysisData);
      setAnalysis(analysisData);

      // 更新 screenplay 里的情绪曲线数据
      if (screenplay && analysisData.emotional_arc) {
        setScreenplay({
          ...screenplay,
          structure: {
            ...screenplay.structure,
            emotional_arc: analysisData.emotional_arc
          }
        });
      }

      // 保存到历史记录
      if (originalText || yamlText) {
        try {
          await saveHistory(
            screenplay?.metadata?.title || '未命名剧本',
            originalText || yamlText,
            yamlText,
            analysisData
          );
          console.log('历史记录保存成功');
        } catch (err) {
          console.error('保存历史失败:', err);
        }
      }

    } catch (err) {
      console.error('分析失败:', err);
      alert('分析失败: ' + (err as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLoadHistory = (yamlContent: string, analysisData: any) => {
    setYamlText(yamlContent);
    const parsed = parseData(yamlContent, analysisData);
    setScreenplay(parsed);
    setAnalysis(analysisData);
  };

  const handleReset = () => {
    setScreenplay(null);
    setAnalysis(null);
    setYamlText('');
    setOriginalText('');
    setActiveTab('scenes');
    setError(null);
    localStorage.removeItem('screenplay_data');
    localStorage.removeItem('analysis_data');
    localStorage.removeItem('screenplay_yaml');
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

  const getConflictEdges = () => {
    if (!screenplay?.characters) return [];
    const edges: any[] = [];
    for (let i = 0; i < screenplay.characters.length; i++) {
      for (let j = i + 1; j < screenplay.characters.length; j++) {
        const char1 = screenplay.characters[i];
        const char2 = screenplay.characters[j];
        const sharedScenes = char1.scenes_appearing?.filter((s: string) => 
          char2.scenes_appearing?.includes(s)
        ) || [];
        if (sharedScenes.length > 0) {
          edges.push({
            source: char1.id,
            target: char2.id,
            strength: sharedScenes.length
          });
        }
      }
    }
    return edges;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI剧本引擎</h1>
              <p className="text-sm text-gray-500">智能改编 · 可视化编辑 · 专业输出</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <HistoryPanel onLoadHistory={handleLoadHistory} />
            
            {screenplay && (
              <>
                <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
                  <span>↻</span> 重新上传
                </button>
                <button 
                  onClick={handleAnalyze} 
                  disabled={isAnalyzing}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    isAnalyzing 
                      ? 'bg-yellow-400 text-yellow-900 cursor-wait' 
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      分析中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {analysis ? '重新分析' : '分析剧本'}
                    </>
                  )}
                </button>
                <button onClick={exportYAML} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  <Download className="w-4 h-4" /> 导出 YAML
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {!screenplay ? (
          <div className="max-w-3xl mx-auto">
            {/* 标题区域 */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg mb-6">
                <Film className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-3">
                AI剧本引擎
              </h2>
              <p className="text-lg text-gray-500 max-w-lg mx-auto">
                上传你的小说, AI 自动分析结构、提取角色、生成专业剧本
              </p>
            </div>

            {/* 功能亮点 */}
            <div className="grid grid-cols-3 gap-4 mb-10">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-800 text-sm">智能解析</h3>
                <p className="text-xs text-gray-500 mt-1">支持多种格式</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-800 text-sm">AI 分析</h3>
                <p className="text-xs text-gray-500 mt-1">情绪曲线 & 节奏</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Download className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-800 text-sm">专业输出</h3>
                <p className="text-xs text-gray-500 mt-1">YAML 剧本格式</p>
              </div>
            </div>

            {/* 上传区域 */}
            <FileUpload onFileUpload={handleFileUpload} />

            {/* 支持的格式提示 */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-400">
                支持 .txt, .md, .doc, .docx, .pdf 格式
              </p>
            </div>

            {loading && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-full shadow-md">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="text-gray-600">正在转换中...</span>
                </div>
              </div>
            )}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-center">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* Left Sidebar */}
            <div className="col-span-3 space-y-6">
              <CharacterPanel characters={screenplay.characters || []} />
              <ConflictGraph 
                characters={screenplay.characters || []} 
                edges={getConflictEdges()} 
              />
            </div>

            {/* Main Content */}
            <div className="col-span-9">
              {/* Tabs */}
              <div className="bg-white rounded-xl shadow-sm mb-6">
                <div className="flex border-b">
                  {(['scenes', 'characters', 'analysis'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-3 px-4 text-center font-medium transition ${
                        activeTab === tab
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab === 'scenes' && '场景列表'}
                      {tab === 'characters' && '角色详情'}
                      {tab === 'analysis' && '剧本分析'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              {activeTab === 'scenes' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">场景列表 ({screenplay.scenes?.length || 0})</h2>
                    <span className="text-sm text-gray-500">
                      总时长约 {screenplay.scenes?.reduce((acc: number, s: any) => acc + (s.content?.estimated_duration || 0), 0).toFixed(1)} 分钟
                    </span>
                  </div>
                  {screenplay.scenes?.map((scene: any) => (
                    <SceneCard key={scene.id} scene={scene} />
                  ))}
                </div>
              )}

              {activeTab === 'characters' && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-xl font-bold mb-4">角色详情</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {screenplay.characters?.map((char: any) => (
                      <div key={char.id} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-3 h-3 rounded-full ${
                            char.type === 'protagonist' ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                          <h3 className="font-bold">{char.name}</h3>
                          <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                            {char.type === 'protagonist' ? '主角' : '配角'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{char.description}</p>
                        <div className="text-xs text-gray-500">
                          对白 {char.dialogue_count} 句 · 出场 {char.scenes_appearing?.length || 0} 场
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'analysis' && (
                <div className="space-y-6">
                  <EmotionChart data={screenplay.structure?.emotional_arc || []} />
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-bold mb-4">节奏分析</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {screenplay.scenes?.length || 0}
                        </div>
                        <div className="text-sm text-gray-600">总场景数</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {(screenplay.scenes?.reduce((acc: number, s: any) => acc + (s.content?.estimated_duration || 0), 0) / (screenplay.scenes?.length || 1)).toFixed(1)}
                        </div>
                        <div className="text-sm text-gray-600">平均场景时长(分钟)</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {screenplay.characters?.length || 0}
                        </div>
                        <div className="text-sm text-gray-600">角色总数</div>
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