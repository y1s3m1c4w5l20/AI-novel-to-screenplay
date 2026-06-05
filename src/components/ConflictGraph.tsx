import React from 'react';
import { Network } from 'lucide-react';

interface CharacterNode {
  id: string;
  name: string;
  type: string;
  dialogue_count: number;
}

interface ConflictEdge {
  source: string;
  target: string;
  strength: number;
}

interface ConflictGraphProps {
  characters: CharacterNode[];
  edges: ConflictEdge[];
}

export default function ConflictGraph({ characters, edges }: ConflictGraphProps) {
  const radius = 120;
  const centerX = 200;
  const centerY = 150;

  const getNodePosition = (index: number, total: number) => {
    const angle = (2 * Math.PI * index) / total - Math.PI / 2;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'protagonist': return '#22c55e';
      case 'antagonist': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Network className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-800">角色冲突网络</h2>
      </div>
      
      <svg width="100%" height="300" viewBox="0 0 400 300">
        {/* 连线 */}
        {edges.map((edge, i) => {
          const sourceIdx = characters.findIndex(c => c.id === edge.source);
          const targetIdx = characters.findIndex(c => c.id === edge.target);
          const sourcePos = getNodePosition(sourceIdx, characters.length);
          const targetPos = getNodePosition(targetIdx, characters.length);
          
          return (
            <line
              key={i}
              x1={sourcePos.x}
              y1={sourcePos.y}
              x2={targetPos.x}
              y2={targetPos.y}
              stroke="#cbd5e1"
              strokeWidth={edge.strength * 5}
              opacity={0.6}
            />
          );
        })}

        {/* 节点 */}
        {characters.map((char, i) => {
          const pos = getNodePosition(i, characters.length);
          const nodeSize = Math.max(20, Math.min(40, char.dialogue_count * 3));
          
          return (
            <g key={char.id}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={nodeSize}
                fill={getNodeColor(char.type)}
                opacity={0.8}
              />
              <text
                x={pos.x}
                y={pos.y + 5}
                textAnchor="middle"
                fill="white"
                fontSize="12"
                fontWeight="bold"
              >
                {char.name}
              </text>
            </g>
          );
        })}
      </svg>
      
      <div className="flex gap-4 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>主角</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>反派</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-500"></div>
          <span>其他</span>
        </div>
      </div>
    </div>
  );
}