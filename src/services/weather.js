/**
 * Weather Service
 * Handles Open-Meteo Ensemble API integration for weather data
 */

import cacheService from './cache.js';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1';
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours

class WeatherService {
    /**
   * Fetch weather data from Open-Meteo Forecast API
   * @param {number} latitude 
   * @param {number} longitude 
   * @returns {Promise<object>} Weather data with ensemble statistics
   */
    async fetchWeatherData(latitude, longitude) {
        const cacheKey = `weather_${latitude.toFixed(3)}_${longitude.toFixed(3)}`;

        // Check cache
        const cached = cacheService.get(cacheKey);
        if (cached) {
            console.log('Using cached weather data');
            return cached;
        }

        // Build API URL - use standard forecast API
        const params = new URLSearchParams({
            latitude: latitude.toFixed(4),
            longitude: longitude.toFixed(4),
            hourly: [
                'cloud_cover',
                'cloud_cover_low',
                'cloud_cover_mid',
                'cloud_cover_high',
                'temperature_2m',
                'relative_humidity_2m',
                'wind_speed_10m',
                'wind_direction_10m',
                'precipitation_probability'
            ].join(','),
            daily: [
                'sunrise',
                'sunset'
            ].join(','),
            forecast_days: '4',
            timezone: 'auto'
        });

        const url = `${OPEN_METEO_BASE}/forecast?${params}`;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Weather API error: ${response.status}`);
            }

            const data = await response.json();
            const processed = this._processWeatherData(data);

            // Cache the result
            cacheService.set(cacheKey, processed, CACHE_TTL);

            return processed;
        } catch (error) {
            console.error('Weather fetch failed:', error);
            throw error;
        }
    }

    /**
     * Fetch daily astronomical data (sun/moon times)
     * @param {number} latitude
     * @param {number} longitude
     * @returns {Promise<object>} Astronomical data
     */
    async fetchAstronomicalData(latitude, longitude) {
        const cacheKey = `astro_daily_${latitude.toFixed(3)}_${longitude.toFixed(3)}`;

        const cached = cacheService.get(cacheKey);
        if (cached) {
            return cached;
        }

        const params = new URLSearchParams({
            latitude: latitude.toFixed(4),
            longitude: longitude.toFixed(4),
            daily: [
                'sunrise',
                'sunset',
                'daylight_duration'
            ].join(','),
            forecast_days: '4',
            timezone: 'auto'
        });

        const url = `${OPEN_METEO_BASE}/forecast?${params}`;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Astronomical API error: ${response.status}`);
            }

            const data = await response.json();

            // Calculate moon phase (approximation based on lunar cycle)
            const moonData = this._calculateMoonPhase(data.daily);

            const result = {
                ...data.daily,
                timezone: data.timezone,
                ...moonData
            };

            cacheService.set(cacheKey, result, CACHE_TTL);
            return result;
        } catch (error) {
            console.error('Astronomical data fetch failed:', error);
            throw error;
        }
    }

    /**
     * Process standard weather data (non-ensemble)
     */
    _processWeatherData(data) {
        const hourly = data.hourly;
        const timezone = data.timezone;
        const times = hourly.time;

        const processedHours = times.map((time, i) => {
            // Use cloud cover layers to estimate uncertainty
            const totalCloud = hourly.cloud_cover[i] || 0;
            const lowCloud = hourly.cloud_cover_low?.[i] || 0;
            const midCloud = hourly.cloud_cover_mid?.[i] || 0;
            const highCloud = hourly.cloud_cover_high?.[i] || 0;

            // Estimate uncertainty based on cloud layer distribution
            const cloudSpread = Math.max(lowCloud, midCloud, highCloud) - Math.min(lowCloud, midCloud, highCloud);

            return {
                time,
                timestamp: new Date(time).toISOString(),

                // Cloud cover with simulated uncertainty
                cloudCover: totalCloud,
                cloudCoverMin: Math.max(0, totalCloud - cloudSpread * 0.3),
                cloudCoverMax: Math.min(100, totalCloud + cloudSpread * 0.3),
                cloudCoverSpread: cloudSpread,
                cloudCoverConfidence: cloudSpread < 20 ? 'high' : cloudSpread < 40 ? 'medium' : 'low',

                // Temperature
                temperature: hourly.temperature_2m[i],
                temperatureMin: hourly.temperature_2m[i],
                temperatureMax: hourly.temperature_2m[i],

                // Humidity
                humidity: hourly.relative_humidity_2m[i],
                humidityMin: hourly.relative_humidity_2m[i],
                humidityMax: hourly.relative_humidity_2m[i],

                // Wind
                windSpeed: hourly.wind_speed_10m[i],
                windSpeedMax: hourly.wind_speed_10m[i],
                windDirection: hourly.wind_direction_10m[i],
                windDirectionLabel: this._getWindDirectionLabel(hourly.wind_direction_10m[i]),

                // Precipitation probability
                precipitationProbability: hourly.precipitation_probability?.[i] || 0
            };
        });

        return {
            hourly: processedHours,
            daily: data.daily || {},
            timezone,
            fetchedAt: new Date().toISOString()
        };
    }

    /**
     * Process ensemble data to extract min/max/mean and confidence
     */
    _processEnsembleData(data) {
        const hourly = data.hourly;
        const timezone = data.timezone;
        const times = hourly.time;

        // Ensemble data comes as arrays of arrays (one per model member)
        // We need to calculate statistics across ensemble members

        const processedHours = times.map((time, i) => {
            // Get all values for this hour across ensemble members
            const cloudValues = this._getEnsembleValues(hourly.cloud_cover, i);
            const tempValues = this._getEnsembleValues(hourly.temperature_2m, i);
            const humidityValues = this._getEnsembleValues(hourly.relative_humidity_2m, i);
            const windSpeedValues = this._getEnsembleValues(hourly.wind_speed_10m, i);
            const windDirValues = this._getEnsembleValues(hourly.wind_direction_10m, i);
            const precipProbValues = this._getEnsembleValues(hourly.precipitation_probability, i);

            return {
                time,
                timestamp: new Date(time).toISOString(),

                // Cloud cover with uncertainty
                cloudCover: this._calculateMean(cloudValues),
                cloudCoverMin: this._calculateMin(cloudValues),
                cloudCoverMax: this._calculateMax(cloudValues),
                cloudCoverSpread: this._calculateMax(cloudValues) - this._calculateMin(cloudValues),
                cloudCoverConfidence: this._getConfidence(cloudValues),

                // Temperature
                temperature: this._calculateMean(tempValues),
                temperatureMin: this._calculateMin(tempValues),
                temperatureMax: this._calculateMax(tempValues),

                // Humidity
                humidity: this._calculateMean(humidityValues),
                humidityMin: this._calculateMin(humidityValues),
                humidityMax: this._calculateMax(humidityValues),

                // Wind
                windSpeed: this._calculateMean(windSpeedValues),
                windSpeedMax: this._calculateMax(windSpeedValues),
                windDirection: this._calculateMean(windDirValues),
                windDirectionLabel: this._getWindDirectionLabel(this._calculateMean(windDirValues)),

                // Precipitation probability
                precipitationProbability: this._calculateMean(precipProbValues)
            };
        });

        return {
            hourly: processedHours,
            daily: data.daily || {},
            timezone,
            fetchedAt: new Date().toISOString()
        };
    }

    /**
     * Get ensemble values for a specific hour index
     * Handles both single array and nested array formats
     */
    _getEnsembleValues(data, index) {
        if (!data) return [0];

        // If it's a simple array (single model), return single value
        if (!Array.isArray(data[0])) {
            return [data[index]];
        }

        // If it's nested arrays (ensemble members), get all values at index
        return data.map(member => member[index]).filter(v => v !== undefined && v !== null);
    }

    _calculateMean(values) {
        if (!values || values.length === 0) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    }

    _calculateMin(values) {
        if (!values || values.length === 0) return 0;
        return Math.min(...values);
    }

    _calculateMax(values) {
        if (!values || values.length === 0) return 0;
        return Math.max(...values);
    }

    /**
     * Determine confidence level based on ensemble spread
     */
    _getConfidence(values) {
        if (!values || values.length <= 1) return 'high';

        const spread = this._calculateMax(values) - this._calculateMin(values);

        if (spread > 30) return 'low';
        if (spread > 15) return 'medium';
        return 'high';
    }

    /**
     * Convert wind direction degrees to label
     */
    _getWindDirectionLabel(degrees) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(((degrees % 360) / 45)) % 8;
        return directions[index];
    }

    /**
     * Calculate moon phase (simplified approximation)
     * Uses known new moon date and lunar cycle of ~29.53 days
     */
    _calculateMoonPhase(dailyData) {
        const knownNewMoon = new Date('2000-01-06T18:14:00Z').getTime();
        const lunarCycle = 29.53058867; // days

        const dates = dailyData?.time || [];
        const moonPhases = dates.map(dateStr => {
            const date = new Date(dateStr).getTime();
            const daysSinceNewMoon = (date - knownNewMoon) / (1000 * 60 * 60 * 24);
            const phase = (daysSinceNewMoon % lunarCycle) / lunarCycle;

            // Normalize to 0-1 range
            const normalizedPhase = phase < 0 ? phase + 1 : phase;

            // Calculate illumination (0 at new moon, 1 at full moon)
            const illumination = (1 - Math.cos(normalizedPhase * 2 * Math.PI)) / 2;

            return {
                phase: normalizedPhase,
                illumination: illumination * 100,
                phaseName: this._getMoonPhaseName(normalizedPhase),
                isWaxing: normalizedPhase < 0.5
            };
        });

        return {
            moonPhases
        };
    }

    /**
     * Get moon phase name from phase value (0-1)
     */
    _getMoonPhaseName(phase) {
        if (phase < 0.025 || phase >= 0.975) return 'Neumond';
        if (phase < 0.225) return 'Zunehmende Sichel';
        if (phase < 0.275) return 'Erstes Viertel';
        if (phase < 0.475) return 'Zunehmender Mond';
        if (phase < 0.525) return 'Vollmond';
        if (phase < 0.725) return 'Abnehmender Mond';
        if (phase < 0.775) return 'Letztes Viertel';
        return 'Abnehmende Sichel';
    }
}

export const weatherService = new WeatherService();
export default weatherService;
