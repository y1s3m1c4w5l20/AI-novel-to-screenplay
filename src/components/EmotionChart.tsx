import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SceneEmotion {
  scene_id: string;
  scene_number: number;
  valence: number;
  arousal: number;
  dramatic_tension: number;
}

interface EmotionChartProps {
  data: SceneEmotion[];
}

export default function EmotionChart({ data }: EmotionChartProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">情绪曲线</h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="scene_number" label={{ value: '场景', position: 'insideBottom', offset: -5 }} />
          <YAxis domain={[-1, 1]} label={{ value: '情绪效价', angle: -90, position: 'insideLeft' }} />
          <Tooltip 
            formatter={(value: any) => [typeof value === 'number' ? value.toFixed(2) : value, '']}
            labelFormatter={(label) => `场景 ${label}`}
          />
          <Line type="monotone" dataKey="valence" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="情绪效价" />
          <Line type="monotone" dataKey="arousal" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="唤醒度" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}