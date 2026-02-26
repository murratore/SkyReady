/**
 * SkyReady PWA - Main Application
 * Orchestrates all components and manages application state
 */

import './styles/index.css';

import { createHeader, setHeaderLoading } from './components/Header.js';
import { createLocationSelector, updateLocationSelector, setGpsLoading } from './components/LocationSelector.js';
import { createScoreCard, renderScoreCard, createScoreCardSkeleton } from './components/ScoreCard.js';
import { createWarnings, updateWarnings } from './components/Warnings.js';
import { createForecastTimeline, renderTabs, updateSelectedDay } from './components/ForecastTimeline.js';
import { createHourlyChart, renderHourlyChart, destroyChart } from './components/HourlyChart.js';
import { createDetailPanel, renderDetailContent, setDetailPanelExpanded } from './components/DetailPanel.js';
import { createFavoritesModal, showFavoritesModal, hideFavoritesModal } from './components/FavoritesModal.js';
import { createSettingsModal, showSettingsModal, hideSettingsModal, applyTheme } from './components/SettingsModal.js';
import { createOfflineBanner, setupOfflineDetection, showStaleDataBanner } from './components/OfflineBanner.js';

import locationService from './services/location.js';
import weatherService from './services/weather.js';
import astroService from './services/astro.js';
import scoreService from './services/score.js';
import storageService from './services/storage.js';
import cacheService from './services/cache.js';

class SkyReadyApp {
    constructor() {
        // State
        this.state = {
            location: null,
            conditions: null,
            score: null,
            forecast: [],
            selectedDay: 0,
            settings: storageService.getSettings(),
            favorites: storageService.getFavorites(),
            isLoading: true,
            error: null
        };

        // DOM elements
        this.elements = {};

        // Initialize
        this.init();
    }

    async init() {
        // Apply saved theme
        applyTheme(this.state.settings.theme);

        // Create UI
        this.createUI();

        // Setup offline detection
        setupOfflineDetection(this.elements.offlineBanner);

        // Load initial data
        await this.loadInitialData();
    }

    createUI() {
        const app = document.getElementById('app');
        app.innerHTML = ''; // Clear loading state

        // Create header
        this.elements.header = createHeader({
            onSettingsClick: () => this.showSettings(),
            onRefresh: () => this.refreshData()
        });

        // Create main content container
        const main = document.createElement('main');
        main.className = 'main container';

        // Location selector
        this.elements.locationSelector = createLocationSelector({
            location: this.state.location,
            isFavorite: this.isCurrentLocationFavorite(),
            onLocationClick: () => this.showFavorites(),
            onGpsClick: () => this.getGpsLocation(),
            onFavoriteToggle: () => this.toggleCurrentFavorite()
        });

        // Score card (skeleton initially)
        this.elements.scoreCard = createScoreCardSkeleton();

        // Warnings
        this.elements.warnings = createWarnings([]);

        // Forecast timeline
        this.elements.forecastTimeline = createForecastTimeline({
            days: [],
            selectedDay: 0,
            onDaySelect: (day) => this.selectDay(day)
        });

        // Hourly chart
        this.elements.hourlyChart = createHourlyChart();

        // Detail panel
        this.elements.detailPanel = createDetailPanel({
            conditions: null,
            isExpanded: this.state.settings.showDetailedParams,
            onToggle: (expanded) => this.onDetailsToggle(expanded)
        });

        // Assemble main content
        main.appendChild(this.elements.locationSelector);
        main.appendChild(this.elements.scoreCard);
        main.appendChild(this.elements.warnings);
        main.appendChild(this.elements.forecastTimeline);
        main.appendChild(this.elements.hourlyChart);
        main.appendChild(this.elements.detailPanel);

        // Add to app
        app.appendChild(this.elements.header);
        app.appendChild(main);

        // Create modals (hidden initially)
        this.elements.favoritesModal = createFavoritesModal({
            favorites: this.state.favorites,
            currentLocation: this.state.location,
            onSelect: (loc) => this.selectLocation(loc),
            onAdd: (loc) => this.addFavorite(loc),
            onDelete: (id) => this.deleteFavorite(id),
            onClose: () => this.hideFavorites()
        });
        app.appendChild(this.elements.favoritesModal);

        this.elements.settingsModal = createSettingsModal({
            settings: this.state.settings,
            onUpdate: (updates) => this.updateSettings(updates),
            onClose: () => this.hideSettings()
        });
        app.appendChild(this.elements.settingsModal);

        // Offline banner
        this.elements.offlineBanner = createOfflineBanner();
        app.appendChild(this.elements.offlineBanner);

        this.elements.main = main;
    }

    async loadInitialData() {
        this.state.isLoading = true;

        try {
            // Try to get last known location
            let location = storageService.getLastLocation();

            // If no saved location, try GPS
            if (!location) {
                try {
                    const coords = await locationService.getCurrentPosition();
                    const geoData = await locationService.reverseGeocode(coords.latitude, coords.longitude);
                    location = {
                        latitude: coords.latitude,
                        longitude: coords.longitude,
                        name: geoData.name,
                        country: geoData.country
                    };
                } catch (e) {
                    console.warn('GPS failed, using default location:', e);
                    // Default to Zurich
                    location = {
                        latitude: 47.3769,
                        longitude: 8.5417,
                        name: 'Zürich',
                        country: 'Schweiz'
                    };
                }
            }

            this.state.location = location;
            storageService.setLastLocation(location);

            // Update location selector
            updateLocationSelector(this.elements.locationSelector, {
                location: this.state.location,
                isFavorite: this.isCurrentLocationFavorite()
            });

            // Load weather data
            await this.loadWeatherData();

        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.state.error = error.message;
        } finally {
            this.state.isLoading = false;
        }
    }

    async loadWeatherData() {
        if (!this.state.location) return;

        const { latitude, longitude } = this.state.location;
        setHeaderLoading(this.elements.header, true);

        try {
            // Fetch data from both APIs in parallel
            const [weatherData, astroData] = await Promise.all([
                weatherService.fetchWeatherData(latitude, longitude),
                astroService.fetchAstroData(latitude, longitude)
            ]);

            // Also fetch astronomical data for sun/moon times
            const astronomicalData = await weatherService.fetchAstronomicalData(latitude, longitude);

            // Process and combine data
            this.processWeatherData(weatherData, astroData, astronomicalData);

        } catch (error) {
            console.error('Failed to load weather data:', error);
            this.state.error = error.message;
        } finally {
            setHeaderLoading(this.elements.header, false);
        }
    }

    processWeatherData(weatherData, astroData, astronomicalData) {
        if (!weatherData || !weatherData.hourly) return;

        // Get current hour's data
        const now = new Date();
        const currentHourIndex = this.findCurrentHourIndex(weatherData.hourly);
        const currentHour = weatherData.hourly[currentHourIndex] || weatherData.hourly[0];

        // Find matching astro data
        const currentAstro = this.findMatchingAstroData(astroData, now);

        // Get moon data for today
        const moonData = astronomicalData?.moonPhases?.[0] || {};

        // Get sun times
        const sunriseTime = astronomicalData?.sunrise?.[0];
        const sunsetTime = astronomicalData?.sunset?.[0];

        // Combine conditions
        const conditions = {
            timestamp: currentHour.timestamp,

            // Cloud data with uncertainty
            cloudCover: currentHour.cloudCover,
            cloudCoverMin: currentHour.cloudCoverMin,
            cloudCoverMax: currentHour.cloudCoverMax,
            cloudCoverConfidence: currentHour.cloudCoverConfidence,

            // Astro data
            seeing: currentAstro?.seeing || 3,
            seeingLabel: currentAstro?.seeingLabel || 'Durchschnittlich',
            transparency: currentAstro?.transparency || 3,
            transparencyLabel: currentAstro?.transparencyLabel || 'Durchschnittlich',

            // Weather
            temperature: currentHour.temperature,
            humidity: currentHour.humidity,
            windSpeed: currentHour.windSpeed,
            windDirectionLabel: currentHour.windDirectionLabel,

            // Moon
            moonPhase: moonData.phase,
            moonIllumination: moonData.illumination,
            moonPhaseName: moonData.phaseName,
            isMoonUp: this.isMoonUp(now), // Simplified

            // Sun times
            sunrise: sunriseTime,
            sunset: sunsetTime
        };

        this.state.conditions = conditions;

        // Calculate score
        const score = scoreService.calculateScore(conditions, this.state.settings.photographyMode);
        this.state.score = score;

        // Build forecast data
        this.buildForecastData(weatherData, astroData, astronomicalData);

        // Update UI
        this.updateUI();
    }

    findCurrentHourIndex(hourlyData) {
        const now = new Date();
        for (let i = 0; i < hourlyData.length; i++) {
            const hourTime = new Date(hourlyData[i].timestamp);
            if (hourTime >= now) {
                return Math.max(0, i - 1);
            }
        }
        return 0;
    }

    findMatchingAstroData(astroData, targetTime) {
        if (!astroData || !astroData.hourly || astroData.hourly.length === 0) {
            return null;
        }

        // Find closest time match
        let closest = astroData.hourly[0];
        let minDiff = Infinity;

        for (const entry of astroData.hourly) {
            const entryTime = new Date(entry.timestamp);
            const diff = Math.abs(entryTime - targetTime);
            if (diff < minDiff) {
                minDiff = diff;
                closest = entry;
            }
        }

        return closest;
    }

    isMoonUp(time) {
        // Simplified moon visibility check
        // In reality, this would require proper moonrise/moonset calculation
        const hour = time.getHours();
        // Rough approximation: moon is "up" during night hours
        return hour >= 20 || hour <= 5;
    }

    buildForecastData(weatherData, astroData, astronomicalData) {
        const forecast = [];
        const now = new Date();

        // Group hourly data by day
        const dailyGroups = {};

        for (const hour of weatherData.hourly) {
            const date = new Date(hour.timestamp);
            // Use local date components to avoid UTC timezone shift
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

            if (!dailyGroups[dateKey]) {
                dailyGroups[dateKey] = [];
            }
            dailyGroups[dateKey].push(hour);
        }

        // Process each day
        const dates = Object.keys(dailyGroups).slice(0, 4); // Max 4 days

        dates.forEach((dateKey, index) => {
            const hours = dailyGroups[dateKey];
            const moonData = astronomicalData?.moonPhases?.[index] || {};

            // Calculate average score for night hours
            const nightHours = hours.filter(h => {
                const hour = new Date(h.timestamp).getHours();
                return hour >= 18 || hour <= 6;
            });

            let dayScore = 50; // Default
            let dayScoreRating = 'good';
            let hourlyScores = [];

            if (nightHours.length > 0) {
                const scores = nightHours.map(h => {
                    const matchingAstro = this.findMatchingAstroData(astroData, new Date(h.timestamp));
                    const conditions = {
                        cloudCover: h.cloudCover,
                        cloudCoverMin: h.cloudCoverMin,
                        cloudCoverMax: h.cloudCoverMax,
                        seeing: matchingAstro?.seeing || 3,
                        transparency: matchingAstro?.transparency || 3,
                        humidity: h.humidity,
                        moonIllumination: moonData.illumination || 50,
                        isMoonUp: true
                    };

                    const result = scoreService.calculateScore(conditions, this.state.settings.photographyMode);

                    hourlyScores.push({
                        timestamp: h.timestamp,
                        score: result.overallScore,
                        scoreMin: Math.max(0, result.overallScore - result.scoreUncertainty),
                        scoreMax: Math.min(100, result.overallScore + result.scoreUncertainty)
                    });

                    return result.overallScore;
                });

                dayScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
                dayScoreRating = scoreService._getScoreRating ?
                    scoreService._getScoreRating(dayScore) :
                    this.getScoreRating(dayScore);
            }

            forecast.push({
                date: dateKey,
                overallScore: dayScore,
                scoreRating: dayScoreRating,
                scoreUncertainty: 10, // Default uncertainty
                hourlyScores,
                bestHour: this.findBestHour(hourlyScores)
            });
        });

        this.state.forecast = forecast;
    }

    getScoreRating(score) {
        if (score >= 90) return 'perfect';
        if (score >= 70) return 'very-good';
        if (score >= 50) return 'good';
        if (score >= 30) return 'moderate';
        return 'poor';
    }

    findBestHour(hourlyScores) {
        if (!hourlyScores || hourlyScores.length === 0) return null;

        let best = hourlyScores[0];
        for (const h of hourlyScores) {
            if (h.score > best.score) {
                best = h;
            }
        }
        return best.timestamp;
    }

    updateUI() {
        // Update score card
        this.elements.scoreCard.innerHTML = '';
        renderScoreCard(this.elements.scoreCard, {
            score: this.state.score,
            conditions: this.state.conditions,
            mode: this.state.settings.photographyMode
        });
        this.elements.scoreCard.setAttribute('data-rating', this.state.score?.scoreRating || 'moderate');

        // Update warnings
        updateWarnings(this.elements.warnings, this.state.score?.warnings || []);

        // Update forecast tabs
        const tabsContainer = this.elements.forecastTimeline.querySelector('#day-tabs');
        renderTabs(tabsContainer, {
            days: this.state.forecast,
            selectedDay: this.state.selectedDay,
            onDaySelect: (day) => this.selectDay(day)
        });

        // Update chart with current day's hourly data
        this.updateChart();

        // Update detail panel
        const detailContent = this.elements.detailPanel.querySelector('#details-content');
        renderDetailContent(detailContent, this.state.conditions);
    }

    updateChart() {
        const selectedForecast = this.state.forecast[this.state.selectedDay];
        if (selectedForecast && selectedForecast.hourlyScores) {
            renderHourlyChart(this.elements.hourlyChart, {
                hourlyData: selectedForecast.hourlyScores,
                mode: this.state.settings.photographyMode
            });
        }
    }

    selectDay(dayIndex) {
        this.state.selectedDay = dayIndex;
        updateSelectedDay(this.elements.forecastTimeline, dayIndex);
        this.updateChart();
    }

    async refreshData() {
        await this.loadWeatherData();
    }

    async getGpsLocation() {
        setGpsLoading(this.elements.locationSelector, true);

        try {
            const coords = await locationService.getCurrentPosition();
            const geoData = await locationService.reverseGeocode(coords.latitude, coords.longitude);

            const location = {
                latitude: coords.latitude,
                longitude: coords.longitude,
                name: geoData.name,
                country: geoData.country
            };

            this.state.location = location;
            storageService.setLastLocation(location);

            updateLocationSelector(this.elements.locationSelector, {
                location: this.state.location,
                isFavorite: this.isCurrentLocationFavorite()
            });

            await this.loadWeatherData();

        } catch (error) {
            console.error('GPS failed:', error);
            alert('GPS-Position konnte nicht ermittelt werden: ' + error.message);
        } finally {
            setGpsLoading(this.elements.locationSelector, false);
        }
    }

    async selectLocation(location) {
        this.state.location = location;
        storageService.setLastLocation(location);

        updateLocationSelector(this.elements.locationSelector, {
            location: this.state.location,
            isFavorite: this.isCurrentLocationFavorite()
        });

        this.hideFavorites();
        await this.loadWeatherData();
    }

    isCurrentLocationFavorite() {
        if (!this.state.location) return false;
        return storageService.isFavorite(
            this.state.location.latitude,
            this.state.location.longitude
        ) !== null;
    }

    toggleCurrentFavorite() {
        if (!this.state.location) return;

        const existing = storageService.isFavorite(
            this.state.location.latitude,
            this.state.location.longitude
        );

        if (existing) {
            storageService.removeFavorite(existing.id);
        } else {
            const added = storageService.addFavorite({
                name: this.state.location.name || 'Unbenannt',
                latitude: this.state.location.latitude,
                longitude: this.state.location.longitude
            });

            if (!added) {
                alert('Maximale Anzahl an Favoriten erreicht (5)');
            }
        }

        this.state.favorites = storageService.getFavorites();

        updateLocationSelector(this.elements.locationSelector, {
            location: this.state.location,
            isFavorite: this.isCurrentLocationFavorite()
        });
    }

    addFavorite(location) {
        const added = storageService.addFavorite({
            name: location.name || 'Unbenannt',
            latitude: location.latitude,
            longitude: location.longitude
        });

        if (!added) {
            alert('Favorit konnte nicht hinzugefügt werden');
        }

        this.state.favorites = storageService.getFavorites();
    }

    deleteFavorite(id) {
        storageService.removeFavorite(id);
        this.state.favorites = storageService.getFavorites();
    }

    showFavorites() {
        // Recreate modal with current data
        this.elements.favoritesModal.remove();
        this.elements.favoritesModal = createFavoritesModal({
            favorites: this.state.favorites,
            currentLocation: this.state.location,
            onSelect: (loc) => this.selectLocation(loc),
            onAdd: (loc) => this.addFavorite(loc),
            onDelete: (id) => this.deleteFavorite(id),
            onClose: () => this.hideFavorites()
        });
        document.getElementById('app').appendChild(this.elements.favoritesModal);
        showFavoritesModal(this.elements.favoritesModal);
    }

    hideFavorites() {
        hideFavoritesModal(this.elements.favoritesModal);
    }

    showSettings() {
        showSettingsModal(this.elements.settingsModal);
    }

    hideSettings() {
        hideSettingsModal(this.elements.settingsModal);
    }

    updateSettings(updates) {
        this.state.settings = storageService.updateSettings(updates);

        // If photography mode changed, recalculate score
        if (updates.photographyMode && this.state.conditions) {
            this.state.score = scoreService.calculateScore(
                this.state.conditions,
                this.state.settings.photographyMode
            );
            this.buildForecastData; // Rebuild forecast with new mode
            this.updateUI();
        }

        // If show details changed, update panel
        if (updates.showDetailedParams !== undefined) {
            setDetailPanelExpanded(this.elements.detailPanel, updates.showDetailedParams);
        }
    }

    onDetailsToggle(expanded) {
        storageService.updateSettings({ showDetailedParams: expanded });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SkyReadyApp();
});

export default SkyReadyApp;
