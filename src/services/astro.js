/**
 * Astro Service
 * Handles 7Timer! ASTRO API integration for seeing and transparency data
 */

import cacheService from './cache.js';

const SEVENTIMER_BASE = 'https://www.7timer.info/bin/astro.php';
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours

class AstroService {
    /**
     * Fetch astro-specific data from 7Timer! API
     * @param {number} latitude
     * @param {number} longitude
     * @returns {Promise<object>} Seeing and transparency data
     */
    async fetchAstroData(latitude, longitude) {
        const cacheKey = `astro_${latitude.toFixed(3)}_${longitude.toFixed(3)}`;

        // Check cache
        const cached = cacheService.get(cacheKey);
        if (cached) {
            console.log('Using cached astro data');
            return cached;
        }

        const params = new URLSearchParams({
            lon: longitude.toFixed(2),
            lat: latitude.toFixed(2),
            ac: '0', // Auto altitude correction
            unit: 'metric',
            output: 'json'
        });

        const url = `${SEVENTIMER_BASE}?${params}`;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`7Timer API error: ${response.status}`);
            }

            const data = await response.json();
            const processed = this._processAstroData(data);

            // Cache the result
            cacheService.set(cacheKey, processed, CACHE_TTL);

            return processed;
        } catch (error) {
            console.error('Astro data fetch failed:', error);
            // Return default values if API fails
            return this._getDefaultAstroData();
        }
    }

    /**
     * Process 7Timer! data into usable format
     */
    _processAstroData(data) {
        if (!data || !data.dataseries) {
            return this._getDefaultAstroData();
        }

        const initTime = data.init;
        const baseTime = this._parseInitTime(initTime);

        const hourlyData = data.dataseries.map((entry, index) => {
            // timepoint is hours from init time
            const timestamp = new Date(baseTime.getTime() + entry.timepoint * 60 * 60 * 1000);

            return {
                timestamp: timestamp.toISOString(),
                timepoint: entry.timepoint,

                // Seeing: 1-8 scale from 7Timer (1=bad, 8=excellent)
                // Convert to 1-5 scale (5=excellent)
                seeingRaw: entry.seeing,
                seeing: this._convertSeeing(entry.seeing),
                seeingLabel: this._getSeeingLabel(entry.seeing),

                // Transparency: 1-8 scale from 7Timer (1=bad, 8=excellent)
                // Convert to 1-5 scale (5=excellent)
                transparencyRaw: entry.transparency,
                transparency: this._convertTransparency(entry.transparency),
                transparencyLabel: this._getTransparencyLabel(entry.transparency),

                // Cloud cover from 7Timer (1-9 scale, 1=clear, 9=overcast)
                cloudCoverRaw: entry.cloudcover,
                cloudCover: this._convertCloudCover(entry.cloudcover),

                // Lifted index (atmospheric stability)
                liftedIndex: entry.lifted_index,
                atmosphereStability: this._getStabilityLabel(entry.lifted_index),

                // Humidity
                humidity: this._convertHumidity(entry.rh2m),

                // Wind at 10m
                wind10m: entry.wind10m,
                windSpeed: this._convertWindSpeed(entry.wind10m?.speed),
                windDirection: entry.wind10m?.direction
            };
        });

        return {
            init: initTime,
            fetchedAt: new Date().toISOString(),
            hourly: hourlyData
        };
    }

    /**
     * Parse 7Timer init time format (e.g., "2026012400")
     */
    _parseInitTime(initTime) {
        if (!initTime) return new Date();

        const str = initTime.toString();
        const year = parseInt(str.substring(0, 4));
        const month = parseInt(str.substring(4, 6)) - 1;
        const day = parseInt(str.substring(6, 8));
        const hour = parseInt(str.substring(8, 10));

        return new Date(Date.UTC(year, month, day, hour));
    }

    /**
     * Convert 7Timer seeing (1-8) to 1-5 scale
     * 7Timer: 1=<0.5", 2=0.5-0.75", 3=0.75-1", 4=1-1.25", 5=1.25-1.5", 6=1.5-2", 7=2-2.5", 8=>2.5"
     * Our scale: 5=excellent, 4=good, 3=average, 2=below average, 1=poor
     */
    _convertSeeing(value) {
        if (!value) return 3;
        // Invert: lower arcsec = better seeing
        // 1-2 → 5, 3-4 → 4, 5 → 3, 6 → 2, 7-8 → 1
        if (value <= 2) return 5;
        if (value <= 4) return 4;
        if (value === 5) return 3;
        if (value === 6) return 2;
        return 1;
    }

    _getSeeingLabel(value) {
        const converted = this._convertSeeing(value);
        const labels = {
            5: 'Ausgezeichnet',
            4: 'Gut',
            3: 'Durchschnittlich',
            2: 'Unterdurchschnittlich',
            1: 'Schlecht'
        };
        return labels[converted] || 'Unbekannt';
    }

    /**
     * Convert 7Timer transparency (1-8) to 1-5 scale
     * 7Timer: 1=<0.3, 2=0.3-0.4, 3=0.4-0.5, 4=0.5-0.6, 5=0.6-0.7, 6=0.7-0.85, 7=0.85-1, 8=>1 (mag above average)
     * Higher = better transparency
     */
    _convertTransparency(value) {
        if (!value) return 3;
        // 7-8 → 5, 5-6 → 4, 4 → 3, 2-3 → 2, 1 → 1
        if (value >= 7) return 5;
        if (value >= 5) return 4;
        if (value === 4) return 3;
        if (value >= 2) return 2;
        return 1;
    }

    _getTransparencyLabel(value) {
        const converted = this._convertTransparency(value);
        const labels = {
            5: 'Ausgezeichnet',
            4: 'Gut',
            3: 'Durchschnittlich',
            2: 'Unterdurchschnittlich',
            1: 'Schlecht'
        };
        return labels[converted] || 'Unbekannt';
    }

    /**
     * Convert 7Timer cloud cover (1-9) to percentage
     * 1=0-6%, 2=6-19%, 3=19-31%, 4=31-44%, 5=44-56%, 6=56-69%, 7=69-81%, 8=81-94%, 9=94-100%
     */
    _convertCloudCover(value) {
        if (!value) return 50;
        const midpoints = [3, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 97];
        return midpoints[value - 1] || 50;
    }

    /**
     * Get atmospheric stability label from lifted index
     */
    _getStabilityLabel(li) {
        if (li === undefined) return 'Unbekannt';
        if (li >= 6) return 'Sehr stabil';
        if (li >= 1) return 'Stabil';
        if (li >= -3) return 'Leicht instabil';
        return 'Instabil';
    }

    /**
     * Convert humidity code to approximate percentage
     */
    _convertHumidity(rh2m) {
        const humidityMap = {
            '-4': 5, '-3': 10, '-2': 15, '-1': 20,
            '0': 30, '1': 40, '2': 50, '3': 60,
            '4': 70, '5': 80, '6': 85, '7': 90,
            '8': 92, '9': 95, '10': 97, '11': 99,
            '12': 100, '13': 100, '14': 100, '15': 100, '16': 100
        };
        return humidityMap[String(rh2m)] || 50;
    }

    /**
     * Convert wind speed code to km/h
     */
    _convertWindSpeed(speedCode) {
        const speedMap = {
            1: 0.5, 2: 3, 3: 9, 4: 16, 5: 25,
            6: 36, 7: 47, 8: 59
        };
        return speedMap[speedCode] || 0;
    }

    /**
     * Get default astro data when API fails
     */
    _getDefaultAstroData() {
        return {
            init: null,
            fetchedAt: new Date().toISOString(),
            hourly: [],
            isDefault: true
        };
    }

    /**
     * Calculate astronomical twilight times
     * @param {number} latitude
     * @param {number} longitude  
     * @param {Date} date
     * @returns {object} Twilight times
     */
    calculateTwilight(latitude, longitude, date = new Date()) {
        // Simplified twilight calculation
        // For accurate results, we'd use a proper astronomical library
        // This is an approximation based on sunset/sunrise

        // Standard twilight angles:
        // Civil: sun 6° below horizon
        // Nautical: sun 12° below horizon
        // Astronomical: sun 18° below horizon

        // For Switzerland (lat ~47°), astronomical twilight is roughly:
        // ~1.5-2 hours after sunset in summer
        // ~1 hour after sunset in winter

        return {
            civilTwilightEnd: null, // Would need sunrise/sunset data
            nauticalTwilightEnd: null,
            astronomicalTwilightEnd: null,
            astronomicalTwilightStart: null,
            nauticalTwilightStart: null,
            civilTwilightStart: null
        };
    }
}

export const astroService = new AstroService();
export default astroService;
