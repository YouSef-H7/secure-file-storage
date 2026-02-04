import React, { useState } from 'react';
import { X, Search, UserPlus, Loader2, Check, Copy, Link as LinkIcon } from 'lucide-react';
import { api } from '../lib/api';

interface ShareModalProps {
    file: { id: string; name: string };
    isOpen: boolean;
    onClose: () => void;
    isFolder?: boolean;
}

export const ShareModal = ({ file, isOpen, onClose, isFolder = false }: ShareModalProps) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [shareLinkMode, setShareLinkMode] = useState<'user' | 'link'>('user');
    const [shareLink, setShareLink] = useState<string | null>(null);
    const [linkLoading, setLinkLoading] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);

    if (!isOpen) return null;

    const handleShare = async () => {
        if (!email) return;
        setLoading(true);
        setStatus('idle');
        setErrorMsg('');

        try {
            // 1. Find user by email (We need their ID)
            // Since we don't have a public "search users" API for employees documented in the prompt,
            // we might need to assume the backend /share endpoint can take an email OR we need to lookup first.
            // The prompt for backend API said: Body: { "userId": "<target employee userId>" }
            // This implies we need the ID.
            // The prompt also says "Search employee by email" in frontend requirements.
            // If no search API exists, we might effectively be stuck unless we add one 
            // OR we update the share endpoint to accept email.
            // Let's assume for this "Enterprise SaaS" we want to resolve email to ID.
            // BUT, adding a public "list all users" endpoint for employees is a privacy risk if not careful.
            // SAFE APPROACH: Update the backend POST /share to accept "email" and resolve it server-side.
            // Wait, "Caller MUST be file owner ... Target user MUST exist".
            // I implemented `userId` in backend.
            // To strictly follow the "FRONTEND_REQUIREMENTS: Search employee by email", 
            // I should probably have added a user lookup endpoint OR made the share endpoint accept email.
            // Changing the backend endpoint to accept `email` instead of `userId` is cleaner for the client.
            // I will update the backend router to handle email lookup internally to avoid exposing a user ID directory.
            // BUT "DO NOT modify... unless explicitly instructed". "Backend API... Body: { "userId": ... }".
            // The prompt EXPLICITLY defined the body as `userId`.
            // So I probably need to lookup the user ID first.
            // Is there a user lookup endpoint? `/api/users` is for admin.
            // I'll add a safe lookup: `POST /api/users/lookup { email } -> { id, name }`.

            // Let's implement the lookup here assuming I'll add the route.

            const lookupRes = await api.request('/api/users/lookup', {
                method: 'POST',
                body: JSON.stringify({ email })
            });

            if (!lookupRes || !lookupRes.id) {
                throw new Error('User not found');
            }

            const shareEndpoint = isFolder 
                ? `/api/folders/${file.id}/share`
                : `/api/files/${file.id}/share`;
            
            await api.request(shareEndpoint, {
                method: 'POST',
                body: JSON.stringify({ userId: lookupRes.id })
            });

            setStatus('success');
            setTimeout(onClose, 2000);
        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setErrorMsg(err.message || 'Failed to share file');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateLink = async () => {
        if (!file.id) return;
        setLinkLoading(true);
        setStatus('idle');
        setErrorMsg('');
        try {
            const endpoint = isFolder 
                ? `/api/folders/${file.id}/share-link`
                : `/api/files/${file.id}/share-link`;
            
            const res = await api.request(endpoint, {
                method: 'POST'
            });
            setShareLink(res.publicUrl);
            setStatus('success');
        } catch (err: any) {
            setStatus('error');
            setErrorMsg(err.message || 'Failed to generate share link');
        } finally {
            setLinkLoading(false);
        }
    };

    const handleCopyLink = async () => {
        if (shareLink) {
            try {
                await navigator.clipboard.writeText(shareLink);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
            } catch (err) {
                setErrorMsg('Failed to copy link');
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-semibold text-slate-900">Share "{file.name}"</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {/* Mode Toggle */}
                    <div className="mb-4 flex gap-2 border-b border-slate-200">
                        <button
                            onClick={() => { setShareLinkMode('user'); setStatus('idle'); setErrorMsg(''); }}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                                shareLinkMode === 'user'
                                    ? 'text-brand border-b-2 border-brand'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Share with people
                        </button>
                        <button
                            onClick={() => { setShareLinkMode('link'); setStatus('idle'); setErrorMsg(''); }}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                                shareLinkMode === 'link'
                                    ? 'text-brand border-b-2 border-brand'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Get link
                        </button>
                    </div>

                    {/* Share with People Mode */}
                    {shareLinkMode === 'user' && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Add people
                            </label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="email"
                                        placeholder="Enter colleague's email..."
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setStatus('idle'); }}
                                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Get Link Mode */}
                    {shareLinkMode === 'link' && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Generate shareable link
                            </label>
                            {!shareLink ? (
                                <button
                                    onClick={handleGenerateLink}
                                    disabled={linkLoading}
                                    className="w-full px-4 py-2.5 bg-brand text-white rounded-lg font-medium hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {linkLoading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <LinkIcon size={16} />
                                            Generate Link
                                        </>
                                    )}
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={shareLink}
                                            readOnly
                                            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm"
                                        />
                                        <button
                                            onClick={handleCopyLink}
                                            className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
                                        >
                                            {linkCopied ? (
                                                <>
                                                    <Check size={16} />
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={16} />
                                                    Copy
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Anyone with this link can view {isFolder ? 'the folder' : 'and download the file'}.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                            {errorMsg}
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="mb-4 p-3 bg-green-50 text-green-600 text-sm rounded-lg border border-green-100 flex items-center gap-2">
                            <Check size={16} />
                            Shared successfully!
                        </div>
                    )}

                    {shareLinkMode === 'user' && (
                        <div className="flex items-center justify-end gap-3 mt-6">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleShare}
                                disabled={!email || loading || status === 'success'}
                                className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                                Share
                            </button>
                        </div>
                    )}
                    {shareLinkMode === 'link' && (
                        <div className="flex items-center justify-end gap-3 mt-6">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
