const API_BASE = 'http://172.20.10.3:8000';

export const saveHistory = async (
  title: string,
  novelContent: string,
  yamlContent: string,
  analysisData: any
) => {
  const res = await fetch(`${API_BASE}/history/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      novel_content: novelContent,
      yaml_content: yamlContent,
      analysis_data: JSON.stringify(analysisData)
    })
  });
  return res.json();
};

export const getHistoryList = async (limit = 20) => {
  const res = await fetch(`${API_BASE}/history/list?limit=${limit}`);
  return res.json();
};

export const getHistoryDetail = async (id: number) => {
  const res = await fetch(`${API_BASE}/history/${id}`);
  return res.json();
};

export const deleteHistory = async (id: number) => {
  const res = await fetch(`${API_BASE}/history/${id}`, {
    method: 'DELETE'
  });
  return res.json();
};