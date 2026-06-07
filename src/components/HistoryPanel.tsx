import React, { useState, useEffect } from 'react';
import { Clock, Trash2, BookOpen } from 'lucide-react';

interface HistoryPanelProps {
  onLoadHistory: (yamlContent: string, analysisData: any) => void;
}

const API_BASE = 'http://172.20.10.3:8000';

const getHistoryList = async (limit = 20) => {
  const res = await fetch(`${API_BASE}/history/list?limit=${limit}`);
  return res.json();
};

const getHistoryDetail = async (id: number) => {
  const res = await fetch(`${API_BASE}/history/${id}`);
  return res.json();
};

const deleteHistory = async (id: number) => {
  const res = await fetch(`${API_BASE}/history/${id}`, {
    method: 'DELETE'
  });
  return res.json();
};

export default function HistoryPanel({ onLoadHistory }: HistoryPanelProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await getHistoryList();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('加载历史失败:', err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showPanel) {
      loadHistory();
    }
  }, [showPanel]);

  const handleLoad = async (id: number) => {
    try {
      const detail = await getHistoryDetail(id);
      if (!detail.error) {
        onLoadHistory(detail.yaml_content, detail.analysis_data);
      }
    } catch (err) {
      console.error('加载详情失败:', err);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteHistory(id);
      loadHistory();
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 transition"
      >
        <Clock className="w-4 h-4 text-gray-600" />
        <span>历史记录</span>
        {history.length > 0 && (
          <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
            {history.length}
          </span>
        )}
      </button>

      {showPanel && (
        <div className="absolute top-12 right-0 bg-white rounded-xl shadow-lg border p-4 w-80 max-h-96 overflow-y-auto z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-lg">解析历史</h3>
            <button 
              onClick={loadHistory}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              刷新
            </button>
          </div>
          
          {loading ? (
            <p className="text-gray-500 text-center py-4">加载中...</p>
          ) : !Array.isArray(history) || history.length === 0 ? (
            <p className="text-gray-500 text-center py-4">暂无历史记录</p>
          ) : (
            <div className="space-y-2">
              {history.map((record) => (
                <div 
                  key={record.id}
                  onClick={() => handleLoad(record.id)}
                  className="border rounded-lg p-3 hover:bg-gray-50 transition cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium flex items-center gap-2 truncate">
                        <BookOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{record.title}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {record.created_at}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleDelete(record.id, e)}
                      className="text-red-400 hover:text-red-600 p-1 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}