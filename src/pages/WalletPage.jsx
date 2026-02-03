import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Wallet, Plus, History, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function WalletPage() {
    const { user } = useAuth();
    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showRechargeModal, setShowRechargeModal] = useState(false);
    const [rechargeAmount, setRechargeAmount] = useState(500);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchWallet();
        fetchTransactions();
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
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactions = async () => {
        try {
            const { data: walletData } = await supabase
                .from('wallets')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!walletData) return;

            const { data, error } = await supabase
                .from('wallet_transactions')
                .select('*')
                .eq('wallet_id', walletData.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            setTransactions(data || []);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        }
    };

    const handleRecharge = async () => {
        if (!rechargeAmount || rechargeAmount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        setProcessing(true);
        try {
            // 1. Create payment record (mock success)
            const { data: payment, error: paymentError } = await supabase
                .from('payments')
                .insert({
                    payer_id: user.id,
                    amount: rechargeAmount,
                    purpose: 'WALLET_RECHARGE',
                    status: 'SUCCESS',
                })
                .select()
                .single();

            if (paymentError) throw paymentError;

            // 2. Add transaction
            const { error: transactionError } = await supabase
                .from('wallet_transactions')
                .insert({
                    wallet_id: wallet.id,
                    type: 'CREDIT',
                    amount: rechargeAmount,
                    purpose: 'RECHARGE',
                    reference_id: payment.id,
                });

            if (transactionError) throw transactionError;

            // 3. Update wallet balance
            const { error: walletError } = await supabase
                .from('wallets')
                .update({
                    balance: parseFloat(wallet.balance) + parseFloat(rechargeAmount),
                    updated_at: new Date().toISOString()
                })
                .eq('id', wallet.id);

            if (walletError) throw walletError;

            // Refresh data
            await fetchWallet();
            await fetchTransactions();
            setShowRechargeModal(false);
            setRechargeAmount(500);

        } catch (error) {
            console.error('Recharge error:', error);
            alert('Recharge failed. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const quickAmounts = [100, 500, 1000, 2000, 5000];

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
                <h1 className="text-3xl font-bold mb-2">My Wallet 💰</h1>
                <p className="text-gray-400">Manage your balance and recharge for mentor sessions.</p>
            </div>

            {/* Wallet Balance Card */}
            <div className="glass-card p-8 rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border-brand-500/30">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-sm mb-2">Available Balance</p>
                        <h2 className="text-5xl font-bold">₹{wallet?.balance || 0}</h2>
                    </div>
                    <div className="p-4 rounded-2xl bg-brand-500/20">
                        <Wallet size={48} className="text-brand-400" />
                    </div>
                </div>

                <button
                    onClick={() => setShowRechargeModal(true)}
                    className="mt-6 px-6 py-3 bg-brand-600 hover:bg-brand-500 rounded-xl font-medium transition-all flex items-center gap-2"
                >
                    <Plus size={20} />
                    Recharge Wallet
                </button>
            </div>

            {/* Transaction History */}
            <div className="glass-card p-6 rounded-2xl">
                <div className="flex items-center gap-2 mb-6">
                    <History size={24} className="text-brand-400" />
                    <h2 className="text-xl font-bold">Transaction History</h2>
                </div>

                {transactions.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <p>No transactions yet. Recharge your wallet to get started!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transactions.map((txn) => {
                            const isCredit = txn.type === 'CREDIT';
                            return (
                                <div
                                    key={txn.id}
                                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${isCredit ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {isCredit ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                                        </div>
                                        <div>
                                            <p className="font-medium">{txn.purpose || txn.type}</p>
                                            <p className="text-sm text-gray-400">
                                                {new Date(txn.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <p className={`text-lg font-bold ${isCredit ? 'text-green-400' : 'text-red-400'}`}>
                                        {isCredit ? '+' : '-'}₹{txn.amount}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Recharge Modal */}
            {showRechargeModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-8 rounded-2xl max-w-md w-full">
                        <h2 className="text-2xl font-bold mb-6">Recharge Wallet</h2>

                        {/* Quick Amount Buttons */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {quickAmounts.map((amount) => (
                                <button
                                    key={amount}
                                    onClick={() => setRechargeAmount(amount)}
                                    className={`py-3 px-4 rounded-lg font-medium transition-all ${rechargeAmount === amount
                                        ? 'bg-brand-600 text-white'
                                        : 'bg-white/5 hover:bg-white/10 text-gray-300'
                                        }`}
                                >
                                    ₹{amount}
                                </button>
                            ))}
                        </div>

                        {/* Custom Amount Input */}
                        <div className="mb-6">
                            <label className="block text-sm text-gray-400 mb-2">Custom Amount</label>
                            <input
                                type="number"
                                min="1"
                                value={rechargeAmount}
                                onChange={(e) => setRechargeAmount(parseFloat(e.target.value) || 0)}
                                className="w-full glass-input px-4 py-3 rounded-lg text-lg font-bold"
                                placeholder="Enter amount"
                            />
                        </div>

                        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-4 rounded-lg text-sm mb-6">
                            <p><strong>Note:</strong> This is a mock payment for MVP. No actual transaction will occur.</p>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowRechargeModal(false)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition-all"
                                disabled={processing}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRecharge}
                                disabled={processing || !rechargeAmount}
                                className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processing ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Processing...
                                    </>
                                ) : (
                                    `Pay ₹${rechargeAmount}`
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
