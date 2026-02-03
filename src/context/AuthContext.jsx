import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { saveUser, getUser, saveProfile, getProfile, clearUserData } from '../utils/storage';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Try to load from localStorage first (faster than API call)
        const cachedUser = getUser();
        const cachedProfile = getProfile();

        if (cachedUser) setUser(cachedUser);
        if (cachedProfile) setProfile(cachedProfile);

        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            const sessionUser = session?.user ?? null;
            setUser(sessionUser);
            saveUser(sessionUser);

            if (sessionUser) {
                fetchProfile(sessionUser.id);
            } else {
                setLoading(false);
                clearUserData();
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const sessionUser = session?.user ?? null;
            setUser(sessionUser);
            saveUser(sessionUser);

            if (sessionUser) {
                fetchProfile(sessionUser.id);
            } else {
                setProfile(null);
                setLoading(false);
                clearUserData();
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error('Profile fetch error:', error.message);
                // Don't sign out, just log the error
                setProfile(null);
                setLoading(false);
            } else if (!data) {
                // No profile found - this might be a new user
                console.warn('No profile found for user:', userId);
                // Try to create a basic profile
                const { data: newProfile, error: createError } = await supabase
                    .from('profiles')
                    .insert({
                        id: userId,
                        email: (await supabase.auth.getUser()).data.user?.email,
                        full_name: (await supabase.auth.getUser()).data.user?.user_metadata?.full_name || 'User',
                        role: 'USER'
                    })
                    .select()
                    .single();

                if (createError) {
                    console.error('Failed to create profile:', createError);
                    setProfile(null);
                } else {
                    setProfile(newProfile);
                    saveProfile(newProfile);

                    // Also create wallet for new user
                    await supabase.from('wallets').insert({ user_id: userId, balance: 0 });
                }
                setLoading(false);
            } else {
                setProfile(data);
                saveProfile(data);
                setLoading(false);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            setProfile(null);
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
        clearUserData();
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
