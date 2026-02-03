import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, TrendingUp, User, GraduationCap } from 'lucide-react';

export default function SignupPage() {
    const [role, setRole] = useState('USER'); // USER or MENTOR
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName,
                        role: role,
                    },
                },
            });

            if (error) {
                // Handle specific errors
                if (error.message.includes('already registered') || error.message.includes('User already registered')) {
                    setError('This email is already registered. Please login instead.');
                } else if (error.message.includes('Password')) {
                    setError('Password must be at least 6 characters long.');
                } else if (error.message.includes('Invalid email')) {
                    setError('Please enter a valid email address.');
                } else {
                    setError(error.message || 'Signup failed. Please try again.');
                }
                return;
            }

            // Check if session was created (email confirmation disabled)
            if (data?.session) {
                // Auto-login successful - redirect to dashboard
                const redirectPath = role === 'MENTOR' ? '/mentor' : '/dashboard';
                navigate(redirectPath);
            } else if (data?.user && !data.session) {
                // Email confirmation required
                alert('Please check your email to confirm your account, then login.');
                navigate('/login');
            } else {
                setError('Signup failed. Please try again.');
            }

        } catch (err) {
            console.error('Signup error:', err);
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-dark-bg p-4 relative overflow-hidden">
            <div className="absolute bottom-1/2 right-1/2 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px] -z-10" />

            <div className="w-full max-w-md glass-card p-8 rounded-2xl">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 text-2xl font-bold bg-gradient-to-r from-brand-400 to-purple-500 bg-clip-text text-transparent mb-2">
                        <TrendingUp className="text-brand-500" />
                        TradeGuru
                    </div>
                    <h2 className="text-xl text-white font-medium">Create Account</h2>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm mb-6">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <button
                        type="button"
                        onClick={() => setRole('USER')}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${role === 'USER'
                            ? 'bg-brand-500/20 border-brand-500 text-white'
                            : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        <User size={24} />
                        <span className="text-sm font-medium">Student / Trader</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setRole('MENTOR')}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${role === 'MENTOR'
                            ? 'bg-purple-500/20 border-purple-500 text-white'
                            : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        <GraduationCap size={24} />
                        <span className="text-sm font-medium">Mentor</span>
                    </button>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                        <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full glass-input px-4 py-3 rounded-lg"
                            placeholder="John Doe"
                        />
                    </div>
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
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Create Account'}
                    </button>
                </form>

                <p className="text-center text-gray-400 text-sm mt-6">
                    Already have an account?{' '}
                    <Link to="/login" className="text-brand-400 hover:text-brand-300">Sign In</Link>
                </p>
            </div>
        </div>
    );
}
