import React from 'react';
import { Trash2 } from 'lucide-react';

const EmployeeTrash = () => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-text-primary mb-1 tracking-tight">Trash</h1>
                <p className="text-text-secondary text-sm">Deleted files (30-day retention)</p>
            </div>

            <div className="flex flex-col items-center justify-center py-32 bg-surface rounded-xl border border-border border-dashed">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                    <Trash2 size={32} className="text-slate-400" />
                </div>
                <h2 className="text-xl font-semibold text-text-primary mb-2">Trash is empty</h2>
                <p className="text-text-secondary text-center max-w-sm">
                    Items moved to trash will be permanently deleted after 30 days.
                </p>
            </div>
        </div>
    );
};

export default EmployeeTrash;
