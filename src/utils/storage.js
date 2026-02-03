// LocalStorage utility for persisting user data

const STORAGE_KEYS = {
    USER: 'tradeguru_user',
    PROFILE: 'tradeguru_profile',
    THEME: 'tradeguru_theme',
    PREFERENCES: 'tradeguru_preferences',
};

/**
 * Save user to localStorage
 */
export function saveUser(user) {
    try {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } catch (error) {
        console.error('Error saving user to localStorage:', error);
    }
}

/**
 * Get user from localStorage
 */
export function getUser() {
    try {
        const user = localStorage.getItem(STORAGE_KEYS.USER);
        return user ? JSON.parse(user) : null;
    } catch (error) {
        console.error('Error getting user from localStorage:', error);
        return null;
    }
}

/**
 * Save profile to localStorage
 */
export function saveProfile(profile) {
    try {
        localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch (error) {
        console.error('Error saving profile to localStorage:', error);
    }
}

/**
 * Get profile from localStorage
 */
export function getProfile() {
    try {
        const profile = localStorage.getItem(STORAGE_KEYS.PROFILE);
        return profile ? JSON.parse(profile) : null;
    } catch (error) {
        console.error('Error getting profile from localStorage:', error);
        return null;
    }
}

/**
 * Save user preferences
 */
export function savePreferences(preferences) {
    try {
        localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
    } catch (error) {
        console.error('Error saving preferences:', error);
    }
}

/**
 * Get user preferences
 */
export function getPreferences() {
    try {
        const prefs = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
        return prefs ? JSON.parse(prefs) : { mode: 'beginner', theme: 'dark' };
    } catch (error) {
        console.error('Error getting preferences:', error);
        return { mode: 'beginner', theme: 'dark' };
    }
}

/**
 * Clear all user data from localStorage
 */
export function clearUserData() {
    try {
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.PROFILE);
        localStorage.removeItem(STORAGE_KEYS.PREFERENCES);
    } catch (error) {
        console.error('Error clearing user data:', error);
    }
}
