import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Send, Loader2, ArrowLeft, Clock } from 'lucide-react';

export default function ChatPage() {
    const { sessionId } = useParams();
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [session, setSession] = useState(null);
    const [otherUser, setOtherUser] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(null);
    const messagesEndRef = useRef(null);
    const channelRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        loadChatSession();
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [sessionId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (session && session.expires_at) {
            updateTimer();
            timerRef.current = setInterval(updateTimer, 1000);
        }
    }, [session]);

    const updateTimer = () => {
        const now = new Date();
        const expiresAt = new Date(session.expires_at);
        const diff = expiresAt - now;

        if (diff <= 0) {
            setTimeRemaining(0);
            clearInterval(timerRef.current);
            // Auto-end session
            handleSessionExpiry();
        } else {
            setTimeRemaining(Math.floor(diff / 1000)); // seconds
        }
    };

    const handleSessionExpiry = async () => {
        try {
            await supabase
                .from('chat_sessions')
                .update({ status: 'EXPIRED' })
                .eq('id', sessionId);

            alert('Session time expired. Thank you for using TradeGuru!');
            navigate(profile?.role === 'MENTOR' ? '/mentor' : '/dashboard');
        } catch (error) {
            console.error('Error expiring session:', error);
        }
    };

    const formatTime = (seconds) => {
        if (seconds === null) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadChatSession = async () => {
        try {
            const { data: sessionData, error: sessionError } = await supabase
                .from('chat_sessions')
                .select(`
          *,
          user:profiles!chat_sessions_user_id_fkey(id, full_name, avatar_url),
          mentor:profiles!chat_sessions_mentor_id_fkey(id, full_name, avatar_url)
        `)
                .eq('id', sessionId)
                .single();

            if (sessionError) throw sessionError;

            if (sessionData.user_id !== user.id && sessionData.mentor_id !== user.id) {
                alert('Unauthorized access');
                navigate('/dashboard');
                return;
            }

            setSession(sessionData);
            const other = sessionData.user_id === user.id ? sessionData.mentor : sessionData.user;
            setOtherUser(other);

            const { data: messagesData, error: messagesError } = await supabase
                .from('messages')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true });

            if (messagesError) throw messagesError;
            setMessages(messagesData || []);

            setupRealtimeSubscription();

        } catch (error) {
            console.error('Error loading chat:', error);
            alert('Failed to load chat session');
            navigate('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const setupRealtimeSubscription = () => {
        const channel = supabase
            .channel(`chat_${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `session_id=eq.${sessionId}`,
                },
                (payload) => {
                    setMessages((current) => [...current, payload.new]);
                }
            )
            .subscribe();

        channelRef.current = channel;
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        // Check if session is still active
        if (session?.status !== 'ACTIVE') {
            alert('This session is no longer active');
            return;
        }

        if (timeRemaining <= 0) {
            alert('Session time has expired');
            return;
        }

        setSending(true);
        try {
            const { error } = await supabase
                .from('messages')
                .insert({
                    session_id: sessionId,
                    sender_id: user.id,
                    content: newMessage.trim(),
                });

            if (error) throw error;
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-dark-bg">
                <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-dark-bg">
            {/* Chat Header with Timer */}
            <div className="glass-card border-b border-white/10 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(profile?.role === 'MENTOR' ? '/mentor' : '/dashboard')}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                            {otherUser?.full_name?.[0] || 'U'}
                        </div>
                        <div>
                            <h2 className="font-bold">{otherUser?.full_name || 'User'}</h2>
                            <p className="text-xs text-gray-400">{session?.duration_minutes} min session</p>
                        </div>
                    </div>

                    {/* Timer */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${timeRemaining < 60 ? 'bg-red-500/20 text-red-400' : 'bg-brand-500/20 text-brand-400'
                        }`}>
                        <Clock size={18} />
                        <span className="font-mono font-bold text-lg">{formatTime(timeRemaining)}</span>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => {
                    const isOwn = message.sender_id === user.id;
                    return (
                        <div
                            key={message.id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] px-4 py-3 rounded-2xl ${isOwn
                                        ? 'bg-brand-600 text-white rounded-br-none'
                                        : 'glass-card rounded-bl-none'
                                    }`}
                            >
                                <p className="text-sm leading-relaxed">{message.content}</p>
                                <p className={`text-xs mt-1 ${isOwn ? 'text-brand-200' : 'text-gray-500'}`}>
                                    {new Date(message.created_at).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="glass-card border-t border-white/10 p-4">
                <div className="flex gap-4">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={timeRemaining > 0 ? "Type your message..." : "Session expired"}
                        className="flex-1 glass-input px-4 py-3 rounded-xl"
                        disabled={sending || session?.status !== 'ACTIVE' || timeRemaining <= 0}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending || timeRemaining <= 0}
                        className="px-6 py-3 bg-brand-600 hover:bg-brand-500 rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                    </button>
                </div>
            </form>
        </div>
    );
}
