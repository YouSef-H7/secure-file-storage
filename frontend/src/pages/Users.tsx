import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Search, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

interface User {
    id: string;
    email: string;
    role: 'admin' | 'employee';
    createdAt: string;
    lastLogin: string | null;
}

const UsersPage = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            setPage(1); // Reset to first page when search changes
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                setError(null);
                const params = new URLSearchParams({
                    page: page.toString(),
                    limit: '50',
                    ...(debouncedSearchQuery && { search: debouncedSearchQuery })
                });
                const data = await api.request(`/api/admin/users?${params}`);
                if (data && Array.isArray(data.users)) {
                    setUsers(data.users);
                    setTotalPages(data.totalPages || 1);
                    setTotal(data.total || 0);
                }
            } catch (err) {
                setError('Failed to load users');
                console.error('Users fetch failed:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [page, debouncedSearchQuery]);

    if (loading && users.length === 0) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary mb-1 tracking-tight">Users</h1>
                    <p className="text-text-secondary text-sm">Manage user accounts and permissions</p>
                </div>
                <div className="flex h-96 items-center justify-center">
                    <Loader2 className="text-text-secondary animate-spin" size={32} />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-text-primary mb-1 tracking-tight">Users</h1>
                <p className="text-text-secondary text-sm">Manage user accounts and permissions</p>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                    />
                </div>
            </div>

            {error ? (
                <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-100">
                    <h3 className="font-semibold mb-2">Error</h3>
                    <p>{error}</p>
                </div>
            ) : users.length === 0 ? (
                <div className="bg-surface rounded-xl shadow-sm border border-border p-16">
                    <div className="text-center max-w-md mx-auto">
                        <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <UsersIcon size={32} className="text-brand" />
                        </div>
                        <h3 className="text-xl font-bold text-text-primary mb-2">No Users Found</h3>
                        <p className="text-text-secondary">
                            {searchQuery ? 'No users match your search criteria.' : 'No users have been registered yet.'}
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50/80 border-b border-border">
                                    <tr>
                                        <th className="text-left py-3 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">Email</th>
                                        <th className="text-left py-3 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">Role</th>
                                        <th className="text-left py-3 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">Created</th>
                                        <th className="text-left py-3 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">Last Login</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-4 px-6 text-sm text-text-primary font-medium">{user.email}</td>
                                            <td className="py-4 px-6">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                    user.role === 'admin' 
                                                        ? 'bg-purple-100 text-purple-700' 
                                                        : 'bg-slate-100 text-slate-700'
                                                }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-text-secondary">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 px-6 text-sm text-text-secondary">
                                                {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-text-secondary">
                                Showing {((page - 1) * 50) + 1} to {Math.min(page * 50, total)} of {total} users
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 bg-surface border border-border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-4 py-2 bg-surface border border-border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default UsersPage;
