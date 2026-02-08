import React, { useState, useEffect, useMemo } from 'react';
import PageTransition from '../components/PageTransition';
import { FileText, Download, Clock, Image as ImageIcon, Search, Grid3x3, List, File, Loader2, FileQuestion } from 'lucide-react';
import { FileMetadata } from '../types/file';
import { api } from '../lib/api';

const EmployeeRecent = () => {
    const [files, setFiles] = useState<FileMetadata[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

    useEffect(() => {
        const fetchFiles = async () => {
            setFiles([]); // Clear stale state
            setLoading(true);
            try {
                const data = await api.request('/api/files', { method: 'GET' });
                if (Array.isArray(data)) {
                    const normalizeFile = (item: any) => ({
                        ...item,
                        id: item.id,
                        name: item.name ?? item.filename ?? '',
                        mimeType: item.mimeType ?? 'application/octet-stream',
                        createdAt: item.createdAt ?? item.created_at,
                        size: item.size ?? 0
                    });
                    const normalized = data.map(normalizeFile);
                    const sorted = normalized.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
                    setFiles(sorted.slice(0, 20));
                }
            } catch (err) {
                setError("Failed to load recent files");
            } finally {
                setLoading(false);
            }
        };
        fetchFiles();
    }, []);

    const formatSize = (bytes: number) => {
        const units = ['B', 'KB', 'MB', 'GB'];
        let val = bytes;
        let unitIdx = 0;
        while (val >= 1024 && unitIdx < units.length - 1) {
            val /= 1024;
            unitIdx++;
        }
        return `${val.toFixed(1)} ${units[unitIdx]}`;
    };

    const getFileTypeColor = (mimeType: string | undefined) => {
        const m = mimeType ?? '';
        if (m.includes('pdf')) return 'bg-red-100 text-red-700';
        if (m.includes('word') || m.includes('document')) return 'bg-blue-100 text-blue-700';
        if (m.includes('sheet') || m.includes('excel')) return 'bg-green-100 text-green-700';
        if (m.includes('image')) return 'bg-purple-100 text-purple-700';
        return 'bg-slate-100 text-slate-700';
    };

    return (
        <PageTransition><div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight font-heading">Recent Files</h1>
                <p className="text-slate-500 text-sm">Your most recently active documents</p>
            </div>

            <div className="flex items-center justify-end gap-2">
                <div className="flex items-center gap-1 bg-white border-2 border-gray-200 rounded-lg p-1 shadow-sm">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-md transition-all duration-200 ${viewMode === 'grid' ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <Grid3x3 size={16} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md transition-all duration-200 ${viewMode === 'list' ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <List size={18} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand" size={32} /></div>
            ) : error ? (
                <div className="text-center py-20 text-error">{error}</div>
            ) : !loading && files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <FileText size={48} className="text-slate-300 mb-4 opacity-50" />
                    <p className="text-slate-500">No recent files found.</p>
                </div>
            ) : viewMode === 'list' ? (
                <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50/80 border-b border-slate-200">
                            <tr>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-brand uppercase">File Name</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-brand uppercase">Modified</th>
                                <th className="text-right py-4 px-6 text-xs font-semibold text-brand uppercase">Size</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {files.map(file => (
                                <tr key={file.id} className="even:bg-slate-50/40 hover:bg-[#f0f9f4] transition-colors duration-150">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold ${getFileTypeColor(file.mimeType)}`}>
                                                <FileText size={16} />
                                            </div>
                                            <span className="text-sm font-medium text-slate-900">{file.name ?? file.filename}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-sm text-slate-500">
                                        {new Date(file.createdAt ?? file.created_at ?? 0).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="py-4 px-6 text-right text-sm text-slate-500 font-mono">
                                        {formatSize(file.size ?? 0)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {files.map(file => (
                        <div key={file.id} className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                            <div className="flex items-start justify-between mb-3">
                                <div className={`p-2 rounded ${getFileTypeColor(file.mimeType)}`}>
                                    <FileText size={20} />
                                </div>
                                <span className="text-xs text-slate-500">{formatSize(file.size ?? 0)}</span>
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900 truncate mb-1">{file.name ?? file.filename}</h3>
                            <p className="text-xs text-slate-500">
                                {new Date(file.createdAt ?? file.created_at ?? 0).toLocaleDateString()}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div></PageTransition>
    );
};

export default EmployeeRecent;
