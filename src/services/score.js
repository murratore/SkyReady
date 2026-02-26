/**
 * Score Service
 * Calculates the SkyReady score based on weather conditions and photography mode
 */

// Score weights by photography mode
const MODE_WEIGHTS = {
    general: {
        cloudCover: 0.40,
        seeing: 0.20,
        transparency: 0.20,
        moonPhase: 0.15,
        humidity: 0.05
    },
    'deep-sky': {
        cloudCover: 0.40,
        seeing: 0.10,
        transparency: 0.30,
        moonPhase: 0.15,
        humidity: 0.05
    },
    planetary: {
        cloudCover: 0.35,
        seeing: 0.40,
        transparency: 0.10,
        moonPhase: 0.10,
        humidity: 0.05
    },
    'milky-way': {
        cloudCover: 0.45,
        seeing: 0.05,
        transparency: 0.25,
        moonPhase: 0.20,
        humidity: 0.05
    }
};

// Score rating thresholds
const RATING_THRESHOLDS = {
    perfect: 90,
    'very-good': 70,
    good: 50,
    moderate: 30,
    poor: 0
};

class ScoreService {
    /**
     * Calculate the overall astro score
     * @param {object} conditions - Weather and astro conditions
     * @param {string} mode - Photography mode ('general', 'deep-sky', 'planetary', 'milky-way')
     * @returns {object} Score and breakdown
     */
    calculateScore(conditions, mode = 'general') {
        const weights = MODE_WEIGHTS[mode] || MODE_WEIGHTS.general;

        // Calculate individual subscores (0-100)
        const cloudScore = this._calculateCloudScore(conditions.cloudCover);
        const seeingScore = this._calculateSeeingScore(conditions.seeing);
        const transparencyScore = this._calculateTransparencyScore(conditions.transparency);
        const moonScore = this._calculateMoonScore(conditions.moonIllumination, conditions.isMoonUp);
        const humidityScore = this._calculateHumidityScore(conditions.humidity);

        // Calculate weighted overall score
        const overallScore = Math.round(
            cloudScore * weights.cloudCover +
            seeingScore * weights.seeing +
            transparencyScore * weights.transparency +
            moonScore * weights.moonPhase +
            humidityScore * weights.humidity
        );

        // Calculate uncertainty from cloud cover spread
        const scoreUncertainty = this._calculateUncertainty(conditions);

        // Get rating
        const scoreRating = this._getScoreRating(overallScore);

        // Generate warnings
        const warnings = this._generateWarnings(conditions);

        return {
            overallScore,
            scoreRating,
            scoreUncertainty,

            // Individual scores for display
            breakdown: {
                cloud: { score: cloudScore, weight: weights.cloudCover },
                seeing: { score: seeingScore, weight: weights.seeing },
                transparency: { score: transparencyScore, weight: weights.transparency },
                moon: { score: moonScore, weight: weights.moonPhase },
                humidity: { score: humidityScore, weight: weights.humidity }
            },

            warnings,

            // Best observing time (will be calculated externally)
            bestObservingTimeNote: this._getBestTimeNote(overallScore, conditions)
        };
    }

    /**
     * Calculate cloud cover score (0% clouds = 100 score)
     */
    _calculateCloudScore(cloudCover) {
        if (cloudCover === undefined || cloudCover === null) return 50;
        // Linear inverse: 0% clouds = 100, 100% clouds = 0
        return Math.max(0, Math.min(100, 100 - cloudCover));
    }

    /**
     * Calculate seeing score (1-5 scale to 0-100)
     */
    _calculateSeeingScore(seeing) {
        if (!seeing) return 60; // Default to average if unknown
        // 1 = 20, 2 = 40, 3 = 60, 4 = 80, 5 = 100
        return Math.min(100, seeing * 20);
    }

    /**
     * Calculate transparency score (1-5 scale to 0-100)
     */
    _calculateTransparencyScore(transparency) {
        if (!transparency) return 60;
        return Math.min(100, transparency * 20);
    }

    /**
     * Calculate moon score based on illumination and visibility
     * New moon = 100, Full moon visible = 0
     */
    _calculateMoonScore(illumination, isMoonUp) {
        if (illumination === undefined) return 80;

        // If moon is not up, less impact
        if (!isMoonUp) {
            return 100 - (illumination * 0.3); // 30% impact when below horizon
        }

        // Moon is visible - full impact
        // 0% illumination = 100 score, 100% = 0 score
        return Math.max(0, 100 - illumination);
    }

    /**
     * Calculate humidity score (lower is better for astro)
     */
    _calculateHumidityScore(humidity) {
        if (humidity === undefined) return 70;

        // Optimal: <60%, Poor: >90%
        if (humidity <= 50) return 100;
        if (humidity <= 60) return 90;
        if (humidity <= 70) return 75;
        if (humidity <= 80) return 50;
        if (humidity <= 90) return 25;
        return 10;
    }

    /**
     * Calculate score uncertainty based on ensemble spread
     */
    _calculateUncertainty(conditions) {
        const cloudSpread = conditions.cloudCoverMax - conditions.cloudCoverMin || 0;

        // Convert cloud spread to score uncertainty
        // High spread = high uncertainty in score
        if (cloudSpread > 40) return 20;
        if (cloudSpread > 25) return 15;
        if (cloudSpread > 15) return 10;
        if (cloudSpread > 5) return 5;
        return 0;
    }

    /**
     * Get score rating label
     */
    _getScoreRating(score) {
        if (score >= RATING_THRESHOLDS.perfect) return 'perfect';
        if (score >= RATING_THRESHOLDS['very-good']) return 'very-good';
        if (score >= RATING_THRESHOLDS.good) return 'good';
        if (score >= RATING_THRESHOLDS.moderate) return 'moderate';
        return 'poor';
    }

    /**
     * Get human-readable rating text
     */
    getRatingText(rating) {
        const texts = {
            'perfect': 'Perfekt',
            'very-good': 'Sehr gut',
            'good': 'Brauchbar',
            'moderate': 'Schwierig',
            'poor': 'Ungünstig'
        };
        return texts[rating] || 'Unbekannt';
    }

    /**
     * Get star rating (1-5)
     */
    getStars(score) {
        if (score >= 90) return 5;
        if (score >= 70) return 4;
        if (score >= 50) return 3;
        if (score >= 30) return 2;
        return 1;
    }

    /**
     * Generate warnings based on conditions
     */
    _generateWarnings(conditions) {
        const warnings = [];

        // Fog/dew risk warning
        if (conditions.humidity >= 85 && conditions.temperature <= 5) {
            warnings.push({
                type: 'fog-risk',
                severity: 'high',
                message: 'Hohes Beschlag-Risiko: Taukappe empfohlen',
                icon: '💧'
            });
        } else if (conditions.humidity >= 75) {
            warnings.push({
                type: 'fog-risk',
                severity: 'medium',
                message: 'Erhöhte Luftfeuchtigkeit: Beschlag möglich',
                icon: '💧'
            });
        }

        // Wind warning
        if (conditions.windSpeed >= 30) {
            warnings.push({
                type: 'high-wind',
                severity: 'high',
                message: `Starker Wind (${Math.round(conditions.windSpeed)} km/h): Stativstabilität gefährdet`,
                icon: '💨'
            });
        } else if (conditions.windSpeed >= 20) {
            warnings.push({
                type: 'high-wind',
                severity: 'medium',
                message: `Wind (${Math.round(conditions.windSpeed)} km/h): Gewichte empfohlen`,
                icon: '💨'
            });
        }

        // Cloud warning
        if (conditions.cloudCover >= 70) {
            warnings.push({
                type: 'clouds',
                severity: 'high',
                message: 'Starke Bewölkung: Beobachtung kaum möglich',
                icon: '☁️'
            });
        } else if (conditions.cloudCover >= 40) {
            warnings.push({
                type: 'clouds',
                severity: 'medium',
                message: 'Teilweise bewölkt: Wolkenlücken nutzen',
                icon: '⛅'
            });
        }

        // Moon warning (for deep sky)
        if (conditions.isMoonUp && conditions.moonIllumination >= 70) {
            warnings.push({
                type: 'moon-bright',
                severity: 'medium',
                message: 'Heller Mond: Deep-Sky erschwert',
                icon: '🌕'
            });
        }

        // Low confidence warning
        if (conditions.cloudCoverConfidence === 'low') {
            warnings.push({
                type: 'low-confidence',
                severity: 'low',
                message: 'Vorhersage unsicher: Wettermodelle nicht einig',
                icon: '⚠️'
            });
        }

        return warnings;
    }

    /**
     * Get best time note
     */
    _getBestTimeNote(score, conditions) {
        if (score >= 80) {
            return 'Ideale Bedingungen erwartet';
        } else if (score >= 60) {
            return 'Gute Bedingungen mit kleinen Einschränkungen';
        } else if (score >= 40) {
            return 'Beobachtung möglich, aber erschwert';
        }
        return 'Bedingungen nicht optimal';
    }

    /**
     * Get confidence text
     */
    getConfidenceText(confidence) {
        const texts = {
            'high': 'Hohe Konfidenz',
            'medium': 'Mittlere Konfidenz',
            'low': 'Niedrige Konfidenz'
        };
        return texts[confidence] || 'Unbekannt';
    }

    /**
     * Get mode display name
     */
    getModeDisplayName(mode) {
        const names = {
            'general': 'Allgemein',
            'deep-sky': 'Deep Sky',
            'planetary': 'Planeten',
            'milky-way': 'Milchstraße'
        };
        return names[mode] || mode;
    }

    /**
     * Get mode icon
     */
    getModeIcon(mode) {
        const icons = {
            'general': '🌟',
            'deep-sky': '🌌',
            'planetary': '🪐',
            'milky-way': '🌠'
        };
        return icons[mode] || '🌟';
    }
}

export const scoreService = new ScoreService();
export default scoreService;
