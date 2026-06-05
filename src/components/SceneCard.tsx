import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Film, Clock, Zap, Edit2, Check, X } from 'lucide-react';

interface Beat {
  beat_number: number;
  type: string;
  content: string;
  dialogue?: {
    speaker: string;
    text: string;
    parenthetical?: string;
  };
  action?: {
    text: string;
    camera_suggestion?: string;
  };
}

interface Scene {
  id: string;
  scene_number: number;
  heading: {
    int_ext: string;
    location: string;
    time_of_day: string;
  };
  content: {
    synopsis: string;
    estimated_duration: number;
    characters_present: string[];
    beats: Beat[];
  };
  ai_analysis: {
    dramatic_tension: number;
    emotional_tone: string;
    pacing_suggestion: string;
  };
}

interface SceneCardProps {
  scene: Scene;
}

// 可编辑文本组件
function EditableText({ text, onSave, className = "" }: { text: string; onSave: (newText: string) => void; className?: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(text);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(text);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-start gap-2">
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="flex-1 p-2 border border-blue-300 rounded-lg text-sm min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <div className="flex flex-col gap-1">
          <button onClick={handleSave} className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={handleCancel} className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`cursor-pointer group relative ${className}`}
      onClick={() => setIsEditing(true)}
    >
      <span>{text}</span>
      <Edit2 className="w-3 h-3 inline-block ml-2 opacity-0 group-hover:opacity-50 text-gray-400" />
    </div>
  );
}

export default function SceneCard({ scene }: SceneCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [beats, setBeats] = useState(scene.content.beats);

  const getTensionColor = (tension: number) => {
    if (tension >= 8) return 'bg-red-500';
    if (tension >= 5) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const updateBeatText = (beatIndex: number, newText: string) => {
    const newBeats = [...beats];
    if (newBeats[beatIndex].dialogue) {
      newBeats[beatIndex].dialogue!.text = newText;
    } else if (newBeats[beatIndex].action) {
      newBeats[beatIndex].action!.text = newText;
    }
    setBeats(newBeats);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* 场景头部 */}
      <div 
        className="p-4 cursor-pointer hover:bg-blue-50 transition-colors duration-200 border-l-4 border-transparent hover:border-blue-500"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-blue-600">#{scene.scene_number}</span>
            <div>
              <div className="font-semibold text-gray-900">
                {scene.heading.int_ext}. {scene.heading.location} - {scene.heading.time_of_day}
              </div>
              <div className="text-sm text-gray-500">{scene.content.synopsis}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>{scene.content.estimated_duration}min</span>
            </div>
            <div className={`w-8 h-8 rounded-full ${getTensionColor(scene.ai_analysis.dramatic_tension)} flex items-center justify-center text-white text-xs font-bold`}>
              {scene.ai_analysis.dramatic_tension}
            </div>
            {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </div>
        </div>
      </div>

      {/* 展开内容 */}
      {expanded && (
        <div className="border-t border-gray-100 p-4">
          {/* 角色标签 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {scene.content.characters_present.map((char) => (
              <span key={char} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                {char}
              </span>
            ))}
          </div>

          {/* 节拍列表 */}
          <div className="space-y-3">
            {beats.map((beat, index) => (
              <div key={beat.beat_number} className="pl-4 border-l-2 border-gray-200">
                {beat.type === 'dialogue' && beat.dialogue ? (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="font-semibold text-gray-800 mb-1">
                      {beat.dialogue.speaker}
                      {beat.dialogue.parenthetical && (
                        <span className="text-gray-500 font-normal text-sm ml-2">
                          ({beat.dialogue.parenthetical})
                        </span>
                      )}
                    </div>
                    <EditableText 
                      text={beat.dialogue.text} 
                      onSave={(newText) => updateBeatText(index, newText)}
                      className="text-gray-700"
                    />
                  </div>
                ) : beat.type === 'action' && beat.action ? (
                  <div className="text-gray-600">
                    <EditableText 
                      text={beat.action.text} 
                      onSave={(newText) => updateBeatText(index, newText)}
                      className="italic"
                    />
                    {beat.action.camera_suggestion && (
                      <div className="mt-1 text-xs text-blue-600 flex items-center gap-1">
                        <Film className="w-3 h-3" />
                        镜头建议: {beat.action.camera_suggestion}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-600">{beat.content}</div>
                )}
              </div>
            ))}
          </div>

          {/* AI 分析 */}
          <div className="mt-4 p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-semibold text-purple-800">AI 分析</span>
            </div>
            <div className="text-sm text-purple-700">
              <p>情绪基调: {scene.ai_analysis.emotional_tone}</p>
              <p>节奏建议: {scene.ai_analysis.pacing_suggestion}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}