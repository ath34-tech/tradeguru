import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Clock, CheckCircle, Loader2, DollarSign } from 'lucide-react';

export default function MentorDashboardPage() {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [sessions, setSessions] = useState([]);
    const [stats, setStats] = useState({
        totalEarnings: 0,
        activeSessions: 0,
        completedSessions: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
        fetchStats();
    }, []);

    const fetchSessions = async () => {
        try {
            const { data, error } = await supabase
                .from('chat_sessions')
                .select(`
          *,
          user:profiles!chat_sessions_user_id_fkey(id, full_name, avatar_url)
        `)
                .eq('mentor_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSessions(data || []);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            // Get earnings from payments
            const { data: payments, error: paymentsError } = await supabase
                .from('payments')
                .select('amount')
                .eq('purpose', 'CHAT')
                .eq('status', 'SUCCESS')
                .in('reference_id',
                    await supabase
                        .from('chat_sessions')
                        .select('id')
                        .eq('mentor_id', user.id)
                        .then(res => res.data?.map(s => s.id) || [])
                );

            const totalEarnings = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

            // Get session counts
            const { data: allSessions } = await supabase
                .from('chat_sessions')
                .select('status')
                .eq('mentor_id', user.id);

            const activeSessions = allSessions?.filter(s => s.status === 'ACTIVE').length || 0;
            const completedSessions = allSessions?.filter(s => s.status === 'COMPLETED').length || 0;

            setStats({
                totalEarnings,
                activeSessions,
                completedSessions,
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            PENDING_PAYMENT: { label: 'Pending Payment', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
            ACTIVE: { label: 'Active', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
            COMPLETED: { label: 'Completed', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
        };
        const badge = badges[status] || badges.ACTIVE;
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
                {badge.label}
            </span>
        );
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
                <h1 className="text-3xl font-bold mb-2">Mentor Dashboard 🎓</h1>
                <p className="text-gray-400">Manage your mentorship sessions and track your earnings.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 rounded-2xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-green-500/20 text-green-400">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Total Earnings</p>
                            <h3 className="text-2xl font-bold">₹{stats.totalEarnings}</h3>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 rounded-2xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-brand-500/20 text-brand-400">
                            <MessageSquare size={24} />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Active Sessions</p>
                            <h3 className="text-2xl font-bold">{stats.activeSessions}</h3>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 rounded-2xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Completed</p>
                            <h3 className="text-2xl font-bold">{stats.completedSessions}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Sessions */}
            <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-xl font-bold mb-6">Chat Sessions</h2>

                {sessions.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <MessageSquare className="mx-auto mb-4 text-gray-600" size={48} />
                        <p>No chat sessions yet. Students will appear here when they book sessions with you.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sessions.map((session) => (
                            <div
                                key={session.id}
                                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                                onClick={() => session.status === 'ACTIVE' && navigate(`/chat/${session.id}`)}
                            >
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-lg font-bold">
                                    {session.user?.full_name?.[0] || 'U'}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold">{session.user?.full_name || 'Student'}</h3>
                                    <p className="text-sm text-gray-400">
                                        <Clock size={14} className="inline mr-1" />
                                        {new Date(session.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    {getStatusBadge(session.status)}
                                    {session.status === 'ACTIVE' && (
                                        <button className="px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-lg text-sm font-medium transition-all">
                                            Open Chat
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
