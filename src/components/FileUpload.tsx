import React, { useState } from 'react';
import { Upload, FileText, File } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (content: string, fileName: string) => void;
}

const API_BASE = 'http://172.20.10.3:8000';


export default function FileUpload({ onFileUpload }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = async (file: File) => {
    const supportedExts = ['.txt', '.md', '.doc', '.docx', '.pdf'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

    if (!supportedExts.includes(ext)) {
      alert('请上传 .txt, .md, .doc, .docx, .pdf 格式的文件');
      return;
    }

    // .txt/.md：读成文本，传给 onFileUpload（原始文本）
    if (ext === '.txt' || ext === '.md') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onFileUpload(content, file.name);  // 传原始文本 + 文件名
      };
      reader.readAsText(file);
      return;
    }

    // .docx/.pdf 等：直接上传后端，拿到 YAML 传给 onFileUpload
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);  // 保留文件名

      const res = await fetch(`${API_BASE}/convert`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`后端解析失败: ${res.status}`);
      }

      const yamlText = await res.text();
      onFileUpload(yamlText, file.name);  // 传 YAML + 文件名

    } catch (err) {
      alert('文件解析失败: ' + (err as Error).message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
        isDragging 
          ? 'border-blue-500 bg-blue-50 shadow-lg scale-[1.02]' 
          : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-md'
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 rounded-2xl pointer-events-none" />
      
      <div className="relative">
        {isLoading ? (
          <div className="text-blue-600">
            <div className="animate-spin w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="font-medium">正在解析文件...</p>
          </div>
        ) : (
          <>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${
              isDragging ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              {isDragging ? (
                <FileText className="w-8 h-8 text-blue-600" />
              ) : (
                <Upload className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {isDragging ? '松开以上传文件' : '拖拽文件到这里'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              或者点击按钮选择文件
            </p>
            <label className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl cursor-pointer hover:bg-blue-700 transition shadow-md hover:shadow-lg">
              <File className="w-4 h-4" />
              选择文件
              <input type="file" accept=".txt,.md,.doc,.docx,.pdf" className="hidden" onChange={handleInputChange} />
            </label>
          </>
        )}
      </div>
    </div>
  );
}