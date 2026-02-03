import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Search, Star, MessageSquare, Loader2, Clock, Wallet as WalletIcon, Calendar } from 'lucide-react';

export default function MentorsPage() {
    const [mentors, setMentors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMentor, setSelectedMentor] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('quick'); // 'quick' or 'subscription'
    const [selectedDuration, setSelectedDuration] = useState(10);
    const [selectedPackage, setSelectedPackage] = useState('WEEK');
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    const [wallet, setWallet] = useState(null);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchMentors();
        fetchWallet();
    }, []);

    const fetchWallet = async () => {
        try {
            const { data, error } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error) throw error;
            setWallet(data);
        } catch (error) {
            console.error('Error fetching wallet:', error);
        }
    };

    const fetchMentors = async () => {
        try {
            const { data, error } = await supabase
                .from('mentor_profiles')
                .select(`
          *,
          profiles!inner(id, full_name, avatar_url, email)
        `);

            if (error) throw error;
            setMentors(data || []);
        } catch (error) {
            console.error('Error fetching mentors:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickChat = (mentor) => {
        setSelectedMentor(mentor);
        setModalType('quick');
        setShowModal(true);
    };

    const handleSubscribe = (mentor) => {
        setSelectedMentor(mentor);
        setModalType('subscription');
        setShowModal(true);
    };

    const getQuickChatPrice = () => {
        if (!selectedMentor) return 0;
        return selectedDuration === 10
            ? (selectedMentor.price_per_10min || 0)
            : (selectedMentor.price_per_20min || 0);
    };

    const getSubscriptionPrice = () => {
        if (!selectedMentor) return 0;
        return selectedPackage === 'WEEK'
            ? (selectedMentor.price_per_week || 0)
            : (selectedMentor.price_per_month || 0);
    };

    const handleQuickChatPayment = async () => {
        const sessionPrice = getQuickChatPrice();

        if (wallet.balance < sessionPrice) {
            alert(`Insufficient balance! You need ₹${sessionPrice}. Please recharge your wallet.`);
            navigate('/wallet');
            return;
        }

        setPaymentProcessing(true);
        try {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + selectedDuration * 60 * 1000);

            const { data: session, error: sessionError } = await supabase
                .from('chat_sessions')
                .insert({
                    user_id: user.id,
                    mentor_id: selectedMentor.profiles.id,
                    session_type: 'QUICK',
                    duration_minutes: selectedDuration,
                    amount_paid: sessionPrice,
                    status: 'ACTIVE',
                    started_at: now.toISOString(),
                    expires_at: expiresAt.toISOString(),
                })
                .select()
                .single();

            if (sessionError) throw sessionError;

            await supabase
                .from('wallet_transactions')
                .insert({
                    wallet_id: wallet.id,
                    type: 'DEBIT',
                    amount: sessionPrice,
                    purpose: 'CHAT_SESSION',
                    reference_id: session.id,
                });

            await supabase
                .from('wallets')
                .update({
                    balance: parseFloat(wallet.balance) - parseFloat(sessionPrice),
                    updated_at: new Date().toISOString()
                })
                .eq('id', wallet.id);

            await supabase
                .from('payments')
                .insert({
                    payer_id: user.id,
                    amount: sessionPrice,
                    purpose: 'CHAT',
                    reference_id: session.id,
                    status: 'SUCCESS',
                });

            navigate(`/chat/${session.id}`);
        } catch (error) {
            console.error('Payment error:', error);
            alert('Payment failed. Please try again.');
        } finally {
            setPaymentProcessing(false);
            setShowModal(false);
        }
    };

    const handleSubscriptionPayment = async () => {
        const packagePrice = getSubscriptionPrice();

        if (wallet.balance < packagePrice) {
            alert(`Insufficient balance! You need ₹${packagePrice}. Please recharge your wallet.`);
            navigate('/wallet');
            return;
        }

        setPaymentProcessing(true);
        try {
            const now = new Date();
            const daysToAdd = selectedPackage === 'WEEK' ? 7 : 30;
            const expiresAt = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

            // Create subscription
            const { data: subscription, error: subError } = await supabase
                .from('subscriptions')
                .insert({
                    user_id: user.id,
                    mentor_id: selectedMentor.profiles.id,
                    package_type: selectedPackage,
                    amount_paid: packagePrice,
                    status: 'ACTIVE',
                    started_at: now.toISOString(),
                    expires_at: expiresAt.toISOString(),
                })
                .select()
                .single();

            if (subError) throw subError;

            // Deduct from wallet
            await supabase
                .from('wallet_transactions')
                .insert({
                    wallet_id: wallet.id,
                    type: 'DEBIT',
                    amount: packagePrice,
                    purpose: 'SUBSCRIPTION',
                    reference_id: subscription.id,
                });

            await supabase
                .from('wallets')
                .update({
                    balance: parseFloat(wallet.balance) - parseFloat(packagePrice),
                    updated_at: new Date().toISOString()
                })
                .eq('id', wallet.id);

            await supabase
                .from('payments')
                .insert({
                    payer_id: user.id,
                    amount: packagePrice,
                    purpose: 'SUBSCRIPTION',
                    reference_id: subscription.id,
                    status: 'SUCCESS',
                });

            alert(`✅ Subscription activated! Valid until ${new Date(expiresAt).toLocaleDateString()}`);
            navigate('/subscriptions');
        } catch (error) {
            console.error('Subscription error:', error);
            alert('Subscription failed. Please try again.');
        } finally {
            setPaymentProcessing(false);
            setShowModal(false);
        }
    };

    const filteredMentors = mentors.filter((mentor) =>
        mentor.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mentor.specialization?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 space-y-8">
            {/* Header with Wallet Balance */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Find Your Mentor</h1>
                    <p className="text-gray-400">Quick chats or subscribe for unlimited access.</p>
                </div>
                <div
                    onClick={() => navigate('/wallet')}
                    className="glass-card p-4 rounded-xl cursor-pointer hover:border-brand-500/30 transition-all"
                >
                    <div className="flex items-center gap-3">
                        <WalletIcon className="text-brand-400" size={24} />
                        <div>
                            <p className="text-xs text-gray-400">Wallet Balance</p>
                            <p className="text-lg font-bold">₹{wallet?.balance || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search by name or specialization..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full glass-input pl-12 pr-4 py-4 rounded-xl text-lg"
                />
            </div>

            {/* Mentors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMentors.map((mentor) => (
                    <div key={mentor.id} className="glass-card p-6 rounded-2xl hover:border-brand-500/30 transition-all">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-2xl font-bold">
                                {mentor.profiles?.full_name?.[0] || 'M'}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold">{mentor.profiles?.full_name || 'Mentor'}</h3>
                                <p className="text-sm text-brand-400">{mentor.specialization || 'General Trading'}</p>
                            </div>
                        </div>

                        <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                            {mentor.bio || 'Experienced trader ready to help you grow.'}
                        </p>

                        <div className="flex items-center justify-between mb-4 text-sm">
                            <span className="flex items-center gap-1 text-gray-400">
                                <Star size={16} className="text-yellow-400" />
                                {mentor.experience_years || 0} years exp
                            </span>
                        </div>

                        {/* Quick Chat Pricing */}
                        <div className="mb-4">
                            <p className="text-xs text-gray-400 mb-2">Quick Chat</p>
                            <div className="flex gap-2 text-sm">
                                <div className="flex-1 glass-card p-2 rounded-lg text-center">
                                    <p className="text-xs text-gray-400">10 min</p>
                                    <p className="font-bold text-brand-400">₹{mentor.price_per_10min || 0}</p>
                                </div>
                                <div className="flex-1 glass-card p-2 rounded-lg text-center">
                                    <p className="text-xs text-gray-400">20 min</p>
                                    <p className="font-bold text-green-400">₹{mentor.price_per_20min || 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* Subscription Pricing */}
                        {(mentor.price_per_week > 0 || mentor.price_per_month > 0) && (
                            <div className="mb-4">
                                <p className="text-xs text-gray-400 mb-2">Subscriptions</p>
                                <div className="flex gap-2 text-sm">
                                    {mentor.price_per_week > 0 && (
                                        <div className="flex-1 glass-card p-2 rounded-lg text-center">
                                            <p className="text-xs text-gray-400">1 Week</p>
                                            <p className="font-bold text-purple-400">₹{mentor.price_per_week}</p>
                                        </div>
                                    )}
                                    {mentor.price_per_month > 0 && (
                                        <div className="flex-1 glass-card p-2 rounded-lg text-center">
                                            <p className="text-xs text-gray-400">1 Month</p>
                                            <p className="font-bold text-pink-400">₹{mentor.price_per_month}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleQuickChat(mentor)}
                                className="flex-1 py-2 bg-brand-600 hover:bg-brand-500 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                            >
                                <Clock size={16} />
                                Quick Chat
                            </button>
                            {(mentor.price_per_week > 0 || mentor.price_per_month > 0) && (
                                <button
                                    onClick={() => handleSubscribe(mentor)}
                                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                                >
                                    <Calendar size={16} />
                                    Subscribe
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filteredMentors.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                    <p>No mentors found. Try adjusting your search.</p>
                </div>
            )}

            {/* Payment Modal */}
            {showModal && selectedMentor && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-8 rounded-2xl max-w-md w-full">
                        {modalType === 'quick' ? (
                            <>
                                <h2 className="text-2xl font-bold mb-4">Choose Session Duration</h2>

                                <div className="mb-6">
                                    <p className="text-gray-400 mb-2">Mentor: {selectedMentor.profiles?.full_name}</p>
                                    <p className="text-sm text-gray-500">Your balance: ₹{wallet?.balance || 0}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <button
                                        onClick={() => setSelectedDuration(10)}
                                        className={`p-4 rounded-xl border-2 transition-all ${selectedDuration === 10
                                                ? 'bg-brand-500/20 border-brand-500'
                                                : 'border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <Clock size={24} className="mx-auto mb-2 text-brand-400" />
                                        <p className="font-bold text-lg">10 Minutes</p>
                                        <p className="text-2xl font-bold text-brand-400 mt-1">₹{selectedMentor.price_per_10min || 0}</p>
                                    </button>

                                    <button
                                        onClick={() => setSelectedDuration(20)}
                                        className={`p-4 rounded-xl border-2 transition-all ${selectedDuration === 20
                                                ? 'bg-green-500/20 border-green-500'
                                                : 'border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <Clock size={24} className="mx-auto mb-2 text-green-400" />
                                        <p className="font-bold text-lg">20 Minutes</p>
                                        <p className="text-2xl font-bold text-green-400 mt-1">₹{selectedMentor.price_per_20min || 0}</p>
                                    </button>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition-all"
                                        disabled={paymentProcessing}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleQuickChatPayment}
                                        disabled={paymentProcessing}
                                        className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                                    >
                                        {paymentProcessing ? (
                                            <>
                                                <Loader2 className="animate-spin" size={18} />
                                                Processing...
                                            </>
                                        ) : (
                                            `Pay ₹${getQuickChatPrice()}`
                                        )}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 className="text-2xl font-bold mb-4">Choose Subscription Package</h2>

                                <div className="mb-6">
                                    <p className="text-gray-400 mb-2">Mentor: {selectedMentor.profiles?.full_name}</p>
                                    <p className="text-sm text-gray-500">Your balance: ₹{wallet?.balance || 0}</p>
                                </div>

                                <div className="space-y-4 mb-6">
                                    {selectedMentor.price_per_week > 0 && (
                                        <button
                                            onClick={() => setSelectedPackage('WEEK')}
                                            className={`w-full p-4 rounded-xl border-2 transition-all ${selectedPackage === 'WEEK'
                                                    ? 'bg-purple-500/20 border-purple-500'
                                                    : 'border-white/10 hover:border-white/20'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="text-left">
                                                    <p className="font-bold text-lg">1 Week Access</p>
                                                    <p className="text-sm text-gray-400">Unlimited chats for 7 days</p>
                                                </div>
                                                <p className="text-2xl font-bold text-purple-400">₹{selectedMentor.price_per_week}</p>
                                            </div>
                                        </button>
                                    )}

                                    {selectedMentor.price_per_month > 0 && (
                                        <button
                                            onClick={() => setSelectedPackage('MONTH')}
                                            className={`w-full p-4 rounded-xl border-2 transition-all ${selectedPackage === 'MONTH'
                                                    ? 'bg-pink-500/20 border-pink-500'
                                                    : 'border-white/10 hover:border-white/20'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="text-left">
                                                    <p className="font-bold text-lg">1 Month Access</p>
                                                    <p className="text-sm text-gray-400">Unlimited chats for 30 days</p>
                                                </div>
                                                <p className="text-2xl font-bold text-pink-400">₹{selectedMentor.price_per_month}</p>
                                            </div>
                                        </button>
                                    )}
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition-all"
                                        disabled={paymentProcessing}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubscriptionPayment}
                                        disabled={paymentProcessing}
                                        className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                                    >
                                        {paymentProcessing ? (
                                            <>
                                                <Loader2 className="animate-spin" size={18} />
                                                Processing...
                                            </>
                                        ) : (
                                            `Subscribe ₹${getSubscriptionPrice()}`
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
