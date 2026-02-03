import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, MessageSquare, LogOut, GraduationCap, TrendingUp, Wallet, Calendar, BarChart3 } from 'lucide-react';

export default function Layout() {
    const { user, profile, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const isMentor = profile?.role === 'MENTOR';

    const navItems = isMentor
        ? [
            { label: 'Dashboard', path: '/mentor', icon: LayoutDashboard },
            { label: 'Profile', path: '/mentor/profile', icon: Users },
        ]
        : [
            { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
            { label: 'Analytics', path: '/analytics', icon: BarChart3 },
            { label: 'Mentors', path: '/mentors', icon: GraduationCap },
            { label: 'My Subscriptions', path: '/subscriptions', icon: Calendar },
            { label: 'Wallet', path: '/wallet', icon: Wallet },
            { label: 'AI Assistant', path: '/ai-chat', icon: MessageSquare },
        ];

    return (
        <div className="flex h-screen bg-dark-bg text-white overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 glass-card border-r border-white/10 hidden md:flex flex-col">
                <div className="p-6">
                    <Link to="/" className="flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-brand-400 to-purple-500 bg-clip-text text-transparent">
                        <TrendingUp className="text-brand-500" />
                        TradeGuru
                    </Link>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Icon size={20} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3 px-4 py-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                            {profile?.full_name?.[0] || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{profile?.full_name || 'User'}</p>
                            <p className="text-xs text-gray-400 truncate capitalize">{profile?.role?.toLowerCase()}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 px-4 py-2 text-gray-400 hover:text-red-400 transition-colors text-sm"
                    >
                        <LogOut size={18} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative z-0">
                {/* Mobile Header (TODO) */}
                <Outlet />
            </main>
        </div>
    );
}
