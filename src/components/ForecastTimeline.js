/**
 * Forecast Timeline Component
 * Shows day tabs and hourly forecast navigation
 */

import scoreService from '../services/score.js';

export function createForecastTimeline({ days, selectedDay, onDaySelect }) {
    const container = document.createElement('div');
    container.className = 'forecast-section';

    container.innerHTML = `
    <div class="section-title">
      <span class="section-title-icon">📅</span>
      <span>Vorhersage</span>
    </div>
    <div class="tabs" id="day-tabs"></div>
  `;

    const tabsContainer = container.querySelector('#day-tabs');
    renderTabs(tabsContainer, { days, selectedDay, onDaySelect });

    return container;
}

export function renderTabs(container, { days, selectedDay, onDaySelect }) {
    container.innerHTML = '';

    if (!days || days.length === 0) {
        // Skeleton
        for (let i = 0; i < 4; i++) {
            const tab = document.createElement('div');
            tab.className = 'tab skeleton';
            tab.innerHTML = '&nbsp;';
            container.appendChild(tab);
        }
        return;
    }

    days.forEach((day, index) => {
        const tab = document.createElement('button');
        tab.className = `tab${index === selectedDay ? ' tab--active' : ''}`;

        const dateLabel = formatDayLabel(day.date, index);
        const score = day.overallScore !== undefined ? day.overallScore : '--';
        const scoreColor = getScoreColor(day.scoreRating);

        tab.innerHTML = `
      <span>${dateLabel}</span>
      <span class="tab-score" style="color: ${scoreColor}">${score}</span>
    `;

        tab.addEventListener('click', () => onDaySelect(index));
        container.appendChild(tab);
    });
}

function formatDayLabel(dateStr, index) {
    if (index === 0) return 'Jetzt';

    try {
        // Parse YYYY-MM-DD as local midnight (not UTC) to avoid timezone shift
        const parts = dateStr.split('-');
        const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dateNormalized = new Date(date);
        dateNormalized.setHours(0, 0, 0, 0);

        if (dateNormalized.getTime() === today.getTime()) {
            return 'Heute';
        } else if (dateNormalized.getTime() === tomorrow.getTime()) {
            return 'Morgen';
        }

        return date.toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric' });
    } catch (e) {
        return `Tag ${index}`;
    }
}

function getScoreColor(rating) {
    const colors = {
        'perfect': 'var(--color-score-perfect)',
        'very-good': 'var(--color-score-good)',
        'good': 'var(--color-score-moderate)',
        'moderate': 'var(--color-score-poor)',
        'poor': 'var(--color-score-bad)'
    };
    return colors[rating] || 'var(--color-text-secondary)';
}

/**
 * Update selected day
 */
export function updateSelectedDay(container, selectedDay) {
    const tabs = container.querySelectorAll('.tab');
    tabs.forEach((tab, index) => {
        tab.classList.toggle('tab--active', index === selectedDay);
    });
}
