import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Save, Loader2, Calendar, Clock, FileUp, CheckCircle, XCircle, Upload, AlertCircle } from 'lucide-react';

export default function MentorProfilePage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [profile, setProfile] = useState({
        experience_years: 0,
        specialization: '',
        bio: '',
        price_per_10min: 0,
        price_per_20min: 0,
        price_per_week: 0,
        price_per_month: 0,
        verification_status: 'NOT_SUBMITTED',
        verification_document_url: null,
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

    const handleDocumentUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (max 5MB for MVP)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            alert('Only PDF, JPG, and PNG files are allowed');
            return;
        }

        setUploading(true);

        try {
            // For MVP: Convert to base64 and store directly in database
            // In production, use Supabase Storage
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result;

                const { error } = await supabase
                    .from('mentor_profiles')
                    .upsert({
                        id: user.id,
                        ...profile,
                        verification_document_url: base64,
                        verification_status: 'PENDING',
                        verification_submitted_at: new Date().toISOString(),
                    });

                if (error) throw error;

                setProfile({
                    ...profile,
                    verification_document_url: base64,
                    verification_status: 'PENDING',
                });

                alert('Verification document uploaded! Status: Pending Review');
            };

            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error uploading document:', error);
            alert('Failed to upload document');
        } finally {
            setUploading(false);
        }
    };

    const getVerificationBadge = () => {
        const status = profile.verification_status;

        if (status === 'VERIFIED') {
            return (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg">
                    <CheckCircle size={20} />
                    <span className="font-semibold">Verified Mentor</span>
                </div>
            );
        }

        if (status === 'PENDING') {
            return (
                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg">
                    <AlertCircle size={20} />
                    <span className="font-semibold">Pending Verification</span>
                </div>
            );
        }

        if (status === 'REJECTED') {
            return (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg">
                    <XCircle size={20} />
                    <span className="font-semibold">Verification Rejected</span>
                </div>
            );
        }

        return (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-500/20 text-gray-400 rounded-lg">
                <AlertCircle size={20} />
                <span className="font-semibold">Not Verified</span>
            </div>
        );
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

                {/* Verification Section */}
                <div className="space-y-6 border-t border-white/10 pt-8">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold">Mentor Verification</h3>
                        {getVerificationBadge()}
                    </div>

                    <div className="glass-card p-6 rounded-xl border border-white/10">
                        <div className="flex items-start gap-4 mb-4">
                            <FileUp className="text-brand-400 mt-1" size={24} />
                            <div className="flex-1">
                                <h4 className="font-semibold mb-2">Upload Verification Documents</h4>
                                <p className="text-sm text-gray-400 mb-4">
                                    Upload proof of your trading expertise such as:
                                </p>
                                <ul className="text-sm text-gray-400 space-y-1 mb-4">
                                    <li>• Trading certificates or qualifications</li>
                                    <li>• Profit/Loss statements (with sensitive details redacted)</li>
                                    <li>• Broker account screenshots</li>
                                    <li>• Trading course completion certificates</li>
                                </ul>
                                <p className="text-xs text-gray-500">
                                    Accepted formats: PDF, JPG, PNG (Max 5MB)
                                </p>
                            </div>
                        </div>

                        {profile.verification_status === 'NOT_SUBMITTED' || profile.verification_status === 'REJECTED' ? (
                            <div>
                                <input
                                    type="file"
                                    id="verification-doc"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleDocumentUpload}
                                    className="hidden"
                                    disabled={uploading}
                                />
                                <label
                                    htmlFor="verification-doc"
                                    className={`flex items-center justify-center gap-2 w-full px-6 py-3 bg-brand-600 hover:bg-brand-500 rounded-lg font-medium transition-all cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} />
                                            <span>Uploading...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={20} />
                                            <span>{profile.verification_status === 'REJECTED' ? 'Re-upload Document' : 'Upload Document'}</span>
                                        </>
                                    )}
                                </label>
                            </div>
                        ) : profile.verification_status === 'PENDING' ? (
                            <div className="text-center py-4">
                                <p className="text-sm text-gray-400">
                                    Your verification document has been submitted and is pending admin review.
                                </p>
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-sm text-green-400">
                                    ✓ You are a verified mentor!
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Save Button */}
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
