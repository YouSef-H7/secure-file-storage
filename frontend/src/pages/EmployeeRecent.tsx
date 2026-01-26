import React, { useState, useEffect, useMemo } from 'react';
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
            setLoading(true);
            try {
                const data = await api.request('/api/files', { method: 'GET' });
                if (Array.isArray(data)) {
                    // Sort by creation date desc
                    const sorted = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                    setFiles(sorted.slice(0, 20)); // Last 20 files
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

    const getFileTypeColor = (mimeType: string) => {
        if (mimeType.includes('pdf')) return 'bg-red-100 text-red-700';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'bg-blue-100 text-blue-700';
        if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'bg-green-100 text-green-700';
        if (mimeType.includes('image')) return 'bg-purple-100 text-purple-700';
        return 'bg-slate-100 text-slate-700';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-text-primary mb-1 tracking-tight">Recent Files</h1>
                <p className="text-text-secondary text-sm">Your most recently active documents</p>
            </div>

            <div className="flex items-center justify-end gap-2">
                <div className="flex items-center gap-2 bg-surface border border-border rounded-lg p-1 shadow-sm">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded transition-all ${viewMode === 'grid' ? 'bg-brand text-white shadow-sm' : 'text-text-secondary hover:bg-slate-50'}`}
                    >
                        <Grid3x3 size={18} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded transition-all ${viewMode === 'list' ? 'bg-brand text-white shadow-sm' : 'text-text-secondary hover:bg-slate-50'}`}
                    >
                        <List size={18} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand" size={32} /></div>
            ) : error ? (
                <div className="text-center py-20 text-error">{error}</div>
            ) : files.length === 0 ? (
                <div className="text-center py-20 text-text-secondary">No recent files found.</div>
            ) : viewMode === 'list' ? (
                <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50/80 border-b border-border">
                            <tr>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-text-secondary uppercase">File Name</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-text-secondary uppercase">Modified</th>
                                <th className="text-right py-4 px-6 text-xs font-semibold text-text-secondary uppercase">Size</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {files.map(file => (
                                <tr key={file.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold ${getFileTypeColor(file.mimeType)}`}>
                                                <FileText size={16} />
                                            </div>
                                            <span className="text-sm font-medium text-text-primary">{file.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-sm text-text-secondary">
                                        {new Date(file.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="py-4 px-6 text-right text-sm text-text-secondary font-mono">
                                        {formatSize(file.size)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {files.map(file => (
                        <div key={file.id} className="bg-surface p-4 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                                <div className={`p-2 rounded ${getFileTypeColor(file.mimeType)}`}>
                                    <FileText size={20} />
                                </div>
                                <span className="text-xs text-text-secondary">{formatSize(file.size)}</span>
                            </div>
                            <h3 className="text-sm font-semibold text-text-primary truncate mb-1">{file.name}</h3>
                            <p className="text-xs text-text-secondary">
                                {new Date(file.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EmployeeRecent;
