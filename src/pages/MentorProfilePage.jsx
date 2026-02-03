import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Save, Loader2, Calendar, Clock } from 'lucide-react';

export default function MentorProfilePage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({
        experience_years: 0,
        specialization: '',
        bio: '',
        price_per_10min: 0,
        price_per_20min: 0,
        price_per_week: 0,
        price_per_month: 0,
    });

    useEffect(() => {
        fetchMentorProfile();
    }, []);

    const fetchMentorProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('mentor_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (data) {
                setProfile(data);
            }
        } catch (error) {
            console.error('Error fetching mentor profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const { error } = await supabase
                .from('mentor_profiles')
                .upsert({
                    id: user.id,
                    ...profile,
                });

            if (error) throw error;
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-2">Mentor Profile</h1>
                <p className="text-gray-400">Set your pricing for quick chats and subscription packages.</p>
            </div>

            <form onSubmit={handleSave} className="glass-card p-8 rounded-2xl max-w-3xl space-y-8">
                {/* Basic Info */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold">Basic Information</h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Specialization</label>
                        <input
                            type="text"
                            value={profile.specialization || ''}
                            onChange={(e) => setProfile({ ...profile, specialization: e.target.value })}
                            placeholder="e.g., Day Trading, Options, Crypto"
                            className="w-full glass-input px-4 py-3 rounded-lg"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Years of Experience</label>
                        <input
                            type="number"
                            min="0"
                            value={profile.experience_years || 0}
                            onChange={(e) => setProfile({ ...profile, experience_years: parseInt(e.target.value) || 0 })}
                            className="w-full glass-input px-4 py-3 rounded-lg"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Bio</label>
                        <textarea
                            value={profile.bio || ''}
                            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                            placeholder="Tell students about your trading journey and expertise..."
                            rows={5}
                            className="w-full glass-input px-4 py-3 rounded-lg resize-none"
                        />
                    </div>
                </div>

                {/* Quick Chat Pricing */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2">
                        <Clock className="text-brand-400" size={24} />
                        <h3 className="text-xl font-bold">Quick Chat Sessions</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">10 Minutes (₹)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={profile.price_per_10min || 0}
                                onChange={(e) => setProfile({ ...profile, price_per_10min: parseFloat(e.target.value) || 0 })}
                                className="w-full glass-input px-4 py-3 rounded-lg"
                                placeholder="e.g., 99"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">20 Minutes (₹)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={profile.price_per_20min || 0}
                                onChange={(e) => setProfile({ ...profile, price_per_20min: parseFloat(e.target.value) || 0 })}
                                className="w-full glass-input px-4 py-3 rounded-lg"
                                placeholder="e.g., 199"
                            />
                        </div>
                    </div>
                </div>

                {/* Subscription Pricing */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2">
                        <Calendar className="text-purple-400" size={24} />
                        <h3 className="text-xl font-bold">Subscription Packages</h3>
                    </div>
                    <p className="text-sm text-gray-400">Offer unlimited chat access for a fixed period</p>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">1 Week Access (₹)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={profile.price_per_week || 0}
                                onChange={(e) => setProfile({ ...profile, price_per_week: parseFloat(e.target.value) || 0 })}
                                className="w-full glass-input px-4 py-3 rounded-lg"
                                placeholder="e.g., 999"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">1 Month Access (₹)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={profile.price_per_month || 0}
                                onChange={(e) => setProfile({ ...profile, price_per_month: parseFloat(e.target.value) || 0 })}
                                className="w-full glass-input px-4 py-3 rounded-lg"
                                placeholder="e.g., 2999"
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 bg-brand-600 hover:bg-brand-500 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                >
                    {saving ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save size={20} />
                            Save Profile
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
