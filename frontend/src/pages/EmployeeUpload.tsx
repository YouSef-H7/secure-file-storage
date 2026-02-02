import React, { useRef, useState } from 'react';
import { UploadCloud, Loader2, FileText } from 'lucide-react';
import { api, notifyFilesChanged } from '../lib/api';

const EmployeeUpload = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleUpload = async (file: File) => {
        if (!file || uploading) return;

        if (file.size > 100 * 1024 * 1024) {
            alert("File too large (Max 100MB)");
            return;
        }

        setUploading(true);
        setStatus('idle');
        try {
            const formData = new FormData();
            formData.append('folderId', '');
            formData.append('parentId', '');
            formData.append('is_deleted', 'false');
            formData.append('file', file);
            for (const [key, value] of formData.entries()) {
                console.log('[FORMDATA]', key, value);
            }
            console.log('[DEBUG] FormData Entries:', Array.from(formData.entries()));
            await api.request('/api/files/upload', {
                method: 'POST',
                body: formData,
                headers: {}
            });
            setStatus('success');
            notifyFilesChanged();
        } catch {
            setStatus('error');
        } finally {
            setUploading(false);
        }
    };

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) handleUpload(e.target.files[0]);
    };

    return (
        <div className="space-y-6 animate-in">
            <div>
                <h1 className="text-3xl font-bold text-text-primary mb-1 tracking-tight">Upload File</h1>
                <p className="text-text-secondary text-sm">Add new documents to your workspace</p>
            </div>

            <div
                className="border-2 border-dashed border-slate-300 rounded-2xl p-20 flex flex-col items-center justify-center text-center hover:border-brand/60 hover:bg-brand/5 transition-all duration-300 cursor-pointer group bg-slate-50/50"
                onClick={() => !uploading && fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={onFileSelect}
                />

                <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-brand/10">
                    {uploading ? <Loader2 size={40} className="text-brand animate-spin" /> : <UploadCloud size={40} className="text-brand" />}
                </div>

                <h3 className="text-xl font-semibold text-text-primary mb-2">
                    {uploading ? 'Uploading...' : 'Click to Upload'}
                </h3>
                <p className="text-text-secondary max-w-sm mx-auto">
                    SVG, PNG, JPG or GIF (max. 25MB)
                </p>

                {status === 'success' && (
                    <div className="mt-6 bg-green-50 text-green-700 px-4 py-2 rounded-xl text-sm font-medium shadow-sm animate-in">
                        File uploaded successfully!
                    </div>
                )}
                {status === 'error' && (
                    <div className="mt-6 bg-red-50 text-red-700 px-4 py-2 rounded-xl text-sm font-medium shadow-sm animate-in">
                        Upload failed. Please try again.
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeUpload;
