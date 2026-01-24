/**
 * Location Service
 * Handles GPS location, reverse geocoding, and location search
 */

class LocationService {
    /**
     * Get current position using Geolocation API
     * @returns {Promise<{latitude: number, longitude: number, accuracy: number}>}
     */
    async getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        altitude: position.coords.altitude
                    });
                },
                (error) => {
                    let message = 'Unable to get location';
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            message = 'Location permission denied';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            message = 'Location unavailable';
                            break;
                        case error.TIMEOUT:
                            message = 'Location request timed out';
                            break;
                    }
                    reject(new Error(message));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000 // Cache for 1 minute
                }
            );
        });
    }

    /**
     * Reverse geocode coordinates to get a place name
     * Uses Open-Meteo Geocoding API (free, no key required)
     * @param {number} latitude
     * @param {number} longitude
     * @returns {Promise<{name: string, country: string, admin1: string}>}
     */
    async reverseGeocode(latitude, longitude) {
        try {
            // Use Nominatim (OpenStreetMap) for reverse geocoding
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'AstroWeather PWA/1.0'
                }
            });

            if (!response.ok) {
                throw new Error('Geocoding failed');
            }

            const data = await response.json();

            // Extract best name
            const address = data.address || {};
            const name = address.city || address.town || address.village ||
                address.municipality || address.county || 'Unknown';

            return {
                name,
                country: address.country || '',
                admin1: address.state || address.canton || '',
                displayName: data.display_name
            };
        } catch (e) {
            console.warn('Reverse geocoding failed:', e);
            // Fall back to coordinate-based name
            return {
                name: `${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`,
                country: '',
                admin1: ''
            };
        }
    }

    /**
     * Search for locations by name
     * Uses Open-Meteo Geocoding API
     * @param {string} query - Search query
     * @returns {Promise<Array>} List of matching locations
     */
    async searchLocation(query) {
        if (!query || query.length < 2) {
            return [];
        }

        try {
            const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=de&format=json`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const data = await response.json();

            if (!data.results) {
                return [];
            }

            return data.results.map(r => ({
                id: `search_${r.id}`,
                name: r.name,
                latitude: r.latitude,
                longitude: r.longitude,
                altitude: r.elevation,
                country: r.country,
                admin1: r.admin1,
                displayName: [r.name, r.admin1, r.country].filter(Boolean).join(', ')
            }));
        } catch (e) {
            console.warn('Location search failed:', e);
            return [];
        }
    }

    /**
     * Format coordinates for display
     * @param {number} lat
     * @param {number} lon
     * @returns {string} Formatted coordinates
     */
    formatCoordinates(lat, lon) {
        const latDir = lat >= 0 ? 'N' : 'S';
        const lonDir = lon >= 0 ? 'E' : 'W';
        return `${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lon).toFixed(2)}°${lonDir}`;
    }

    /**
     * Calculate distance between two points (Haversine formula)
     * @returns {number} Distance in kilometers
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = this._toRad(lat2 - lat1);
        const dLon = this._toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    _toRad(deg) {
        return deg * (Math.PI / 180);
    }
}

export const locationService = new LocationService();
export default locationService;
