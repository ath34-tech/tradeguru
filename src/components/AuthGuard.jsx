import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ allowedRoles = [] }) {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-dark-bg">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-brand-500 mx-auto mb-4" />
                    <p className="text-gray-400">Loading your profile...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Allow access even if profile is still loading/missing, but redirect based on role if it exists
    if (profile && allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
        // Redirect based on their actual role
        return <Navigate to={profile.role === 'MENTOR' ? '/mentor' : '/dashboard'} replace />;
    }

    return <Outlet />;
}
