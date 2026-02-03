import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Clock, User, Loader2, Calendar } from 'lucide-react';

export default function MyChatsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ACTIVE'); // ACTIVE, COMPLETED, ALL

    useEffect(() => {
        fetchSessions();
    }, [filter]);

    const fetchSessions = async () => {
        try {
            let query = supabase
                .from('chat_sessions')
                .select(`
                    *,
                    user:profiles!chat_sessions_user_id_fkey(id, full_name, avatar_url),
                    mentor:profiles!chat_sessions_mentor_id_fkey(id, full_name, avatar_url)
                `)
                .or(`user_id.eq.${user.id},mentor_id.eq.${user.id}`)
                .order('created_at', { ascending: false });

            if (filter !== 'ALL') {
                query = query.eq('status', filter);
            }

            const { data, error } = await query;

            if (error) throw error;
            setSessions(data || []);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTimeRemaining = (expiresAt) => {
        if (!expiresAt) return null;
        const now = new Date();
        const expires = new Date(expiresAt);
        const diff = expires - now;

        if (diff <= 0) return 'Expired';

        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const getStatusBadge = (status) => {
        const styles = {
            ACTIVE: 'bg-green-500/20 text-green-400 border-green-500/30',
            COMPLETED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            EXPIRED: 'bg-red-500/20 text-red-400 border-red-500/30',
            PENDING_PAYMENT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        };
        return styles[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold mb-2">My Chats 💬</h1>
                <p className="text-gray-400">View and manage your mentor chat sessions</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-4 border-b border-white/10">
                {['ACTIVE', 'COMPLETED', 'ALL'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`px-4 py-2 font-medium transition-all ${filter === tab
                                ? 'text-brand-400 border-b-2 border-brand-400'
                                : 'text-gray-400 hover:text-gray-300'
                            }`}
                    >
                        {tab === 'ALL' ? 'All Sessions' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

            {/* Sessions List */}
            {sessions.length === 0 ? (
                <div className="glass-card p-12 rounded-2xl text-center">
                    <MessageSquare size={64} className="mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-bold mb-2">No Chat Sessions</h3>
                    <p className="text-gray-400 mb-6">
                        {filter === 'ACTIVE'
                            ? "You don't have any active chat sessions."
                            : "You haven't started any chat sessions yet."}
                    </p>
                    <button
                        onClick={() => navigate('/mentors')}
                        className="px-6 py-3 bg-brand-600 hover:bg-brand-500 rounded-xl font-medium transition-all"
                    >
                        Find a Mentor
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {sessions.map((session) => {
                        const isUserRole = session.user_id === user.id;
                        const otherPerson = isUserRole ? session.mentor : session.user;
                        const timeLeft = session.status === 'ACTIVE' ? getTimeRemaining(session.expires_at) : null;

                        return (
                            <div
                                key={session.id}
                                onClick={() => session.status === 'ACTIVE' && navigate(`/chat/${session.id}`)}
                                className={`glass-card p-6 rounded-2xl transition-all ${session.status === 'ACTIVE'
                                        ? 'hover:bg-white/10 cursor-pointer'
                                        : 'opacity-60'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1">
                                        {/* Avatar */}
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-lg font-bold">
                                            {otherPerson?.full_name?.[0] || 'U'}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-bold text-lg">
                                                    {otherPerson?.full_name || 'Unknown User'}
                                                </h3>
                                                <span
                                                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(
                                                        session.status
                                                    )}`}
                                                >
                                                    {session.status}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                                <div className="flex items-center gap-1">
                                                    <Clock size={14} />
                                                    <span>{session.duration_minutes} min session</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={14} />
                                                    <span>
                                                        {new Date(session.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <User size={14} />
                                                    <span>{isUserRole ? 'Student' : 'Mentor'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Time/Action */}
                                    <div className="text-right">
                                        {session.status === 'ACTIVE' && timeLeft && (
                                            <div
                                                className={`px-4 py-2 rounded-lg font-mono font-bold text-lg ${timeLeft.startsWith('0:') || timeLeft === 'Expired'
                                                        ? 'bg-red-500/20 text-red-400'
                                                        : 'bg-brand-500/20 text-brand-400'
                                                    }`}
                                            >
                                                {timeLeft}
                                            </div>
                                        )}
                                        {session.status === 'ACTIVE' && (
                                            <p className="text-xs text-gray-400 mt-2">Click to continue →</p>
                                        )}
                                        {session.status === 'COMPLETED' && (
                                            <p className="text-sm text-gray-400">Session ended</p>
                                        )}
                                        {session.status === 'EXPIRED' && (
                                            <p className="text-sm text-red-400">Time expired</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
