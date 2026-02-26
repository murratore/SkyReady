/**
 * Storage Service
 * Handles persistent storage for settings, favorites, and user preferences
 */

const STORAGE_KEYS = {
    SETTINGS: 'skyready_settings',
    FAVORITES: 'skyready_favorites',
    LAST_LOCATION: 'skyready_last_location'
};

const DEFAULT_SETTINGS = {
    photographyMode: 'general', // 'general' | 'deep-sky' | 'planetary' | 'milky-way'
    temperatureUnit: 'celsius', // 'celsius' | 'fahrenheit'
    theme: 'auto', // 'light' | 'dark' | 'auto'
    showDetailedParams: false
};

class StorageService {
    /**
     * Get user settings
     * @returns {object} User settings
     */
    getSettings() {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            if (stored) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.warn('Failed to load settings:', e);
        }
        return { ...DEFAULT_SETTINGS };
    }

    /**
     * Update user settings
     * @param {object} updates - Settings to update
     */
    updateSettings(updates) {
        try {
            const current = this.getSettings();
            const newSettings = { ...current, ...updates };
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
            return newSettings;
        } catch (e) {
            console.warn('Failed to save settings:', e);
            return this.getSettings();
        }
    }

    /**
     * Get favorite locations (max 5)
     * @returns {Array} Favorite locations
     */
    getFavorites() {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.FAVORITES);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Failed to load favorites:', e);
        }
        return [];
    }

    /**
     * Add a favorite location
     * @param {object} location - Location to add
     * @returns {boolean} Success
     */
    addFavorite(location) {
        try {
            const favorites = this.getFavorites();

            // Check limit
            if (favorites.length >= 5) {
                console.warn('Maximum 5 favorites allowed');
                return false;
            }

            // Check for duplicates (by coordinates)
            const exists = favorites.some(
                f => Math.abs(f.latitude - location.latitude) < 0.001 &&
                    Math.abs(f.longitude - location.longitude) < 0.001
            );

            if (exists) {
                console.warn('Location already in favorites');
                return false;
            }

            // Add with unique ID
            const newLocation = {
                ...location,
                id: `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                isFavorite: true
            };

            favorites.push(newLocation);
            localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
            return true;
        } catch (e) {
            console.warn('Failed to add favorite:', e);
            return false;
        }
    }

    /**
     * Remove a favorite location
     * @param {string} id - Location ID to remove
     * @returns {boolean} Success
     */
    removeFavorite(id) {
        try {
            const favorites = this.getFavorites();
            const filtered = favorites.filter(f => f.id !== id);
            localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(filtered));
            return true;
        } catch (e) {
            console.warn('Failed to remove favorite:', e);
            return false;
        }
    }

    /**
     * Update a favorite location
     * @param {string} id - Location ID
     * @param {object} updates - Updates to apply
     */
    updateFavorite(id, updates) {
        try {
            const favorites = this.getFavorites();
            const index = favorites.findIndex(f => f.id === id);
            if (index !== -1) {
                favorites[index] = { ...favorites[index], ...updates };
                localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
                return true;
            }
            return false;
        } catch (e) {
            console.warn('Failed to update favorite:', e);
            return false;
        }
    }

    /**
     * Get the last used location
     * @returns {object|null} Last location
     */
    getLastLocation() {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.LAST_LOCATION);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Failed to load last location:', e);
        }
        return null;
    }

    /**
     * Save the last used location
     * @param {object} location - Location to save
     */
    setLastLocation(location) {
        try {
            localStorage.setItem(STORAGE_KEYS.LAST_LOCATION, JSON.stringify(location));
        } catch (e) {
            console.warn('Failed to save last location:', e);
        }
    }

    /**
     * Check if a location is a favorite
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {object|null} Favorite entry if exists
     */
    isFavorite(lat, lon) {
        const favorites = this.getFavorites();
        return favorites.find(
            f => Math.abs(f.latitude - lat) < 0.001 &&
                Math.abs(f.longitude - lon) < 0.001
        ) || null;
    }

    /**
     * Clear all data
     */
    clearAll() {
        Object.values(STORAGE_KEYS).forEach(key => {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                // Ignore
            }
        });
    }
}

export const storageService = new StorageService();
export default storageService;
