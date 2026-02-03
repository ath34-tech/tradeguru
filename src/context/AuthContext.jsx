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
                await supabase.auth.signOut();
                setProfile(null);
                setUser(null);
                clearUserData();
                alert('Profile not found. Please contact support or sign up again.');
                navigate('/login');
            } else if (!data) {
                console.error('No profile found for user');
                await supabase.auth.signOut();
                setProfile(null);
                setUser(null);
                clearUserData();
                alert('Your profile was not created properly. Please sign up again.');
                navigate('/signup');
            } else {
                setProfile(data);
                saveProfile(data);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            await supabase.auth.signOut();
            setProfile(null);
            setUser(null);
            clearUserData();
            navigate('/login');
        } finally {
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
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
