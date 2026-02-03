import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ allowedRoles }) {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-dark-bg">
                <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
            </div>
        );
    }

    // Not authenticated
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Authenticated but no profile (shouldn't happen due to AuthContext check, but safety net)
    if (!profile) {
        return (
            <div className="flex h-screen items-center justify-center bg-dark-bg text-center p-6">
                <div>
                    <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
                    <p className="text-gray-400 mb-6">Your profile was not created properly. Please sign up again.</p>
                    <a href="/signup" className="px-6 py-3 bg-brand-600 hover:bg-brand-500 rounded-lg font-medium">
                        Go to Sign Up
                    </a>
                </div>
            </div>
        );
    }

    // Check role authorization
    if (allowedRoles && !allowedRoles.includes(profile.role)) {
        const redirectPath = profile.role === 'MENTOR' ? '/mentor' : '/dashboard';
        return <Navigate to={redirectPath} replace />;
    }

    return <Outlet />;
}
