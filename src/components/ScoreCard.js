/**
 * Score Card Component
 * Main display showing the AstroWeather score with rating and meta info
 */

import scoreService from '../services/score.js';

export function createScoreCard({ score, conditions, mode }) {
    const container = document.createElement('div');
    container.className = 'card card--score score-card animate-fade-in';

    // Set rating attribute for color styling
    container.setAttribute('data-rating', score?.scoreRating || 'moderate');

    renderScoreCard(container, { score, conditions, mode });

    return container;
}

export function renderScoreCard(container, { score, conditions, mode }) {
    if (!score) {
        container.innerHTML = `
      <div class="score-label">Astro-Score</div>
      <div class="skeleton skeleton-circle" style="width: 120px; height: 120px; margin: 0 auto;"></div>
      <div class="skeleton skeleton-text mt-4" style="width: 100px; margin: 0 auto;"></div>
    `;
        return;
    }

    const stars = scoreService.getStars(score.overallScore);
    const ratingText = scoreService.getRatingText(score.scoreRating);
    const confidenceText = scoreService.getConfidenceText(conditions?.cloudCoverConfidence || 'medium');

    // Format moon info
    const moonIllumination = conditions?.moonIllumination !== undefined
        ? Math.round(conditions.moonIllumination)
        : '--';
    const moonPhaseIcon = getMoonPhaseIcon(conditions?.moonPhase);
    const moonPhaseName = conditions?.moonPhaseName || 'Unbekannt';

    // Format best time
    const bestTimeText = formatBestTime(conditions);

    // Set rating for styling
    container.setAttribute('data-rating', score.scoreRating);

    container.innerHTML = `
    <div class="score-label">🌟 Astro-Score</div>
    <div class="score-value">
      ${score.overallScore}${score.scoreUncertainty > 0 ? `<span class="score-uncertainty">±${score.scoreUncertainty}</span>` : ''}
    </div>
    <div class="score-stars">${renderStars(stars)}</div>
    <div class="score-rating">${ratingText}</div>
    
    ${score.scoreUncertainty > 5 ? `
      <div class="score-confidence">
        ${confidenceText}
        <span class="text-muted">(Wettermodelle nicht einig)</span>
      </div>
    ` : ''}
    
    <div class="score-meta">
      <div class="score-meta-item">
        <div class="score-meta-icon">${moonPhaseIcon}</div>
        <div class="score-meta-value">${moonIllumination}%</div>
        <div class="score-meta-label">${moonPhaseName}</div>
      </div>
      <div class="score-meta-item">
        <div class="score-meta-icon">⏰</div>
        <div class="score-meta-value">${bestTimeText}</div>
        <div class="score-meta-label">Beste Zeit</div>
      </div>
      <div class="score-meta-item">
        <div class="score-meta-icon">${scoreService.getModeIcon(mode)}</div>
        <div class="score-meta-value">${scoreService.getModeDisplayName(mode)}</div>
        <div class="score-meta-label">Modus</div>
      </div>
    </div>
  `;
}

function renderStars(count) {
    const filled = '⭐';
    const empty = '☆';
    return filled.repeat(count) + empty.repeat(5 - count);
}

function getMoonPhaseIcon(phase) {
    if (phase === undefined) return '🌙';
    if (phase < 0.125) return '🌑'; // New moon
    if (phase < 0.25) return '🌒';  // Waxing crescent
    if (phase < 0.375) return '🌓'; // First quarter
    if (phase < 0.5) return '🌔';   // Waxing gibbous
    if (phase < 0.625) return '🌕'; // Full moon
    if (phase < 0.75) return '🌖';  // Waning gibbous
    if (phase < 0.875) return '🌗'; // Last quarter
    return '🌘';                    // Waning crescent
}

function formatBestTime(conditions) {
    if (!conditions?.sunset) return '--:-- - --:--';

    try {
        // Best time is typically from astronomical twilight to before moon rise or until dawn
        const sunset = new Date(conditions.sunset);
        const nightStart = new Date(sunset.getTime() + 90 * 60 * 1000); // ~1.5h after sunset

        let nightEnd;
        if (conditions.sunrise) {
            const sunrise = new Date(conditions.sunrise);
            nightEnd = new Date(sunrise.getTime() - 90 * 60 * 1000); // ~1.5h before sunrise
        } else {
            nightEnd = new Date(nightStart.getTime() + 6 * 60 * 60 * 1000); // Default 6 hours
        }

        const formatTime = (date) => {
            return date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
        };

        return `${formatTime(nightStart)} - ${formatTime(nightEnd)}`;
    } catch (e) {
        return '--:-- - --:--';
    }
}

/**
 * Create skeleton loading state
 */
export function createScoreCardSkeleton() {
    const container = document.createElement('div');
    container.className = 'card card--score score-card';

    container.innerHTML = `
    <div class="skeleton skeleton-text" style="width: 100px; margin: 0 auto;"></div>
    <div class="skeleton skeleton-circle mt-4" style="width: 120px; height: 80px; margin: 0 auto; border-radius: var(--radius-lg);"></div>
    <div class="skeleton skeleton-text mt-4" style="width: 150px; margin: 0 auto;"></div>
    <div class="skeleton skeleton-text mt-2" style="width: 80px; margin: 0 auto;"></div>
    <div class="flex justify-center gap-6 mt-6 pt-5" style="border-top: 1px solid var(--color-border);">
      <div class="skeleton" style="width: 60px; height: 60px; border-radius: var(--radius-md);"></div>
      <div class="skeleton" style="width: 60px; height: 60px; border-radius: var(--radius-md);"></div>
      <div class="skeleton" style="width: 60px; height: 60px; border-radius: var(--radius-md);"></div>
    </div>
  `;

    return container;
}
