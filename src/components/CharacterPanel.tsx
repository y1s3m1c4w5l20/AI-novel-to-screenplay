import React from 'react';
import { User, Users } from 'lucide-react';

interface Character {
  id: string;
  name: string;
  type: string;
  description: string;
  dialogue_count: number;
  scenes_appearing: string[];
}

interface CharacterPanelProps {
  characters: Character[];
}

export default function CharacterPanel({ characters }: CharacterPanelProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'protagonist': return 'bg-green-100 text-green-800';
      case 'antagonist': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'protagonist': return '主角';
      case 'antagonist': return '反派';
      case 'supporting': return '配角';
      default: return '其他';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-800">角色库</h2>
        <span className="text-sm text-gray-500">({characters.length} 人)</span>
      </div>
      
      <div className="space-y-3">
        {characters.map((char) => (
          <div key={char.id} className={`flex items-start gap-3 p-3 rounded-lg hover:bg-blue-50 transition-all duration-200 cursor-pointer transform hover:scale-[1.02]`}>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-gray-900">{char.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(char.type)}`}>
                  {getTypeLabel(char.type)}
                </span>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">{char.description}</p>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span>💬 对白 {char.dialogue_count} 句</span>
                <span>🎬 出场 {char.scenes_appearing.length} 场</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}