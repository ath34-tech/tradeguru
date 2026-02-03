import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Calendar, Loader2, MessageSquare, CheckCircle, XCircle } from 'lucide-react';

export default function SubscriptionsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const fetchSubscriptions = async () => {
        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select(`
          *,
          mentor:profiles!subscriptions_mentor_id_fkey(id, full_name, avatar_url)
        `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSubscriptions(data || []);
        } catch (error) {
            console.error('Error fetching subscriptions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartChat = async (subscription) => {
        // Check if subscription is active
        if (subscription.status !== 'ACTIVE') {
            alert('This subscription is no longer active');
            return;
        }

        try {
            // Create a new subscription-based chat session
            // Subscription chats expire when the subscription expires (unlimited until then)
            const { data: session, error } = await supabase
                .from('chat_sessions')
                .insert({
                    user_id: user.id,
                    mentor_id: subscription.mentor_id,
                    session_type: 'SUBSCRIPTION',
                    subscription_id: subscription.id,
                    status: 'ACTIVE',
                    started_at: new Date().toISOString(),
                    expires_at: subscription.expires_at, // Uses subscription expiry!
                    duration_minutes: null, // No time limit for subscription chats
                    amount_paid: 0, // Already paid via subscription
                })
                .select()
                .single();

            if (error) throw error;
            navigate(`/chat/${session.id}`);
        } catch (error) {
            console.error('Error creating chat session:', error);
            alert('Failed to start chat. Please try again.');
        }
    };

    const getStatusBadge = (status, expiresAt) => {
        const isExpired = new Date(expiresAt) < new Date();

        if (status === 'ACTIVE' && !isExpired) {
            return <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold flex items-center gap-1">
                <CheckCircle size={14} />
                Active
            </span>;
        }

        return <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1">
            <XCircle size={14} />
            Expired
        </span>;
    };

    const getDaysRemaining = (expiresAt) => {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diff = expiry - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days > 0 ? days : 0;
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
            <div>
                <h1 className="text-3xl font-bold mb-2">My Subscriptions</h1>
                <p className="text-gray-400">Manage your mentor subscriptions and access unlimited chats.</p>
            </div>

            {subscriptions.length === 0 ? (
                <div className="glass-card p-12 rounded-2xl text-center">
                    <Calendar size={64} className="mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-bold mb-2">No Subscriptions Yet</h3>
                    <p className="text-gray-400 mb-6">Subscribe to your favorite mentors for unlimited access</p>
                    <button
                        onClick={() => navigate('/mentors')}
                        className="px-6 py-3 bg-brand-600 hover:bg-brand-500 rounded-lg font-medium transition-all"
                    >
                        Browse Mentors
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subscriptions.map((sub) => {
                        const isActive = sub.status === 'ACTIVE' && new Date(sub.expires_at) > new Date();
                        const daysLeft = getDaysRemaining(sub.expires_at);

                        return (
                            <div key={sub.id} className="glass-card p-6 rounded-2xl">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-lg font-bold">
                                            {sub.mentor?.full_name?.[0] || 'M'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold">{sub.mentor?.full_name || 'Mentor'}</h3>
                                            <p className="text-sm text-gray-400">{sub.package_type === 'WEEK' ? '1 Week' : '1 Month'}</p>
                                        </div>
                                    </div>
                                    {getStatusBadge(sub.status, sub.expires_at)}
                                </div>

                                <div className="space-y-3 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Amount Paid</span>
                                        <span className="font-semibold">₹{sub.amount_paid}</span>
                                    </div>

                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Started</span>
                                        <span className="font-semibold">{new Date(sub.started_at).toLocaleDateString()}</span>
                                    </div>

                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Expires</span>
                                        <span className={`font-semibold ${isActive ? 'text-green-400' : 'text-red-400'}`}>
                                            {new Date(sub.expires_at).toLocaleDateString()}
                                        </span>
                                    </div>

                                    {isActive && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Days Remaining</span>
                                            <span className="font-bold text-brand-400">{daysLeft} days</span>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => handleStartChat(sub)}
                                    disabled={!isActive}
                                    className="w-full py-3 bg-brand-600 hover:bg-brand-500 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <MessageSquare size={18} />
                                    {isActive ? 'Start Chat' : 'Subscription Expired'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
