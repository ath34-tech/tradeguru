import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, TrendingUp } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Redirect handled by AuthGuard or component logic check
            // For now, we let the auth state change trigger redirects or we can manually check
            // Ideally, we fetch profile to know role, but we'll let Layout/AuthGuard handle logic mostly.
            // But for better UX, we can check role here:

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (profile?.role === 'MENTOR') {
                navigate('/mentor');
            } else {
                navigate('/dashboard');
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-dark-bg p-4 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-500/20 rounded-full blur-[100px] -z-10" />

            <div className="w-full max-w-md glass-card p-8 rounded-2xl">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 text-2xl font-bold bg-gradient-to-r from-brand-400 to-purple-500 bg-clip-text text-transparent mb-2">
                        <TrendingUp className="text-brand-500" />
                        TradeGuru
                    </div>
                    <h2 className="text-xl text-white font-medium">Welcome Back</h2>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full glass-input px-4 py-3 rounded-lg"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full glass-input px-4 py-3 rounded-lg"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In'}
                    </button>
                </form>

                <p className="text-center text-gray-400 text-sm mt-6">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-brand-400 hover:text-brand-300">Sign Up</Link>
                </p>
            </div>
        </div>
    );
}
