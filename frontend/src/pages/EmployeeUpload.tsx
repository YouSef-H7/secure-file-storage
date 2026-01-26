import React, { useRef, useState } from 'react';
import { UploadCloud, Loader2, FileText } from 'lucide-react';
import { api } from '../lib/api';

const EmployeeUpload = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleUpload = async (file: File) => {
        if (!file || uploading) return;

        // Size check 25MB
        if (file.size > 25 * 1024 * 1024) {
            alert("File too large (Max 25MB)");
            return;
        }

        setUploading(true);
        setStatus('idle');
        try {
            await new Promise(r => setTimeout(r, 1000));
            const formData = new FormData();
            formData.append('file', file);
            await api.request('/api/files/upload', {
                method: 'POST',
                body: formData,
                headers: {}
            });
            setStatus('success');
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
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-text-primary mb-1 tracking-tight">Upload File</h1>
                <p className="text-text-secondary text-sm">Add new documents to your workspace</p>
            </div>

            <div
                className="border-2 border-dashed border-border rounded-xl p-20 flex flex-col items-center justify-center text-center hover:border-brand/50 hover:bg-brand/5 transition-all cursor-pointer group"
                onClick={() => !uploading && fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={onFileSelect}
                />

                <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    {uploading ? <Loader2 size={40} className="text-brand animate-spin" /> : <UploadCloud size={40} className="text-brand" />}
                </div>

                <h3 className="text-xl font-semibold text-text-primary mb-2">
                    {uploading ? 'Uploading...' : 'Click to Upload'}
                </h3>
                <p className="text-text-secondary max-w-sm mx-auto">
                    SVG, PNG, JPG or GIF (max. 25MB)
                </p>

                {status === 'success' && (
                    <div className="mt-6 bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
                        File uploaded successfully!
                    </div>
                )}
                {status === 'error' && (
                    <div className="mt-6 bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
                        Upload failed. Please try again.
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeUpload;
