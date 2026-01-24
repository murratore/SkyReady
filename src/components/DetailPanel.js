/**
 * Detail Panel Component
 * Expandable panel showing all weather parameters
 */

export function createDetailPanel({ conditions, isExpanded, onToggle }) {
    const container = document.createElement('div');
    container.className = 'details-section';

    container.innerHTML = `
    <button class="details-toggle${isExpanded ? ' active' : ''}" id="details-toggle">
      <span>Details anzeigen</span>
      <span class="details-toggle-icon">▼</span>
    </button>
    <div class="details-content${isExpanded ? ' active' : ''}" id="details-content"></div>
  `;

    const toggleBtn = container.querySelector('#details-toggle');
    const content = container.querySelector('#details-content');

    toggleBtn.addEventListener('click', () => {
        const isNowExpanded = content.classList.toggle('active');
        toggleBtn.classList.toggle('active', isNowExpanded);
        toggleBtn.querySelector('span:first-child').textContent = isNowExpanded ? 'Details ausblenden' : 'Details anzeigen';
        onToggle(isNowExpanded);
    });

    renderDetailContent(content, conditions);

    return container;
}

export function renderDetailContent(container, conditions) {
    if (!conditions) {
        container.innerHTML = `
      <div class="text-center text-muted py-4">
        Keine Daten verfügbar
      </div>
    `;
        return;
    }

    const params = [
        {
            icon: '☁️',
            label: 'Wolken',
            value: formatCloudCover(conditions),
            description: getCloudDescription(conditions.cloudCover),
            indicator: getIndicatorClass(100 - (conditions.cloudCover || 0), true)
        },
        {
            icon: '👁️',
            label: 'Seeing',
            value: `${conditions.seeing || '--'}/5`,
            description: conditions.seeingLabel || 'Atmosphärische Ruhe',
            indicator: getIndicatorClass((conditions.seeing || 3) * 20)
        },
        {
            icon: '🔭',
            label: 'Transparenz',
            value: `${conditions.transparency || '--'}/5`,
            description: conditions.transparencyLabel || 'Atmosphärische Durchsichtigkeit',
            indicator: getIndicatorClass((conditions.transparency || 3) * 20)
        },
        {
            icon: '💧',
            label: 'Luftfeuchtigkeit',
            value: `${Math.round(conditions.humidity || 0)}%`,
            description: getHumidityDescription(conditions.humidity),
            indicator: getIndicatorClass(100 - (conditions.humidity || 0), true)
        },
        {
            icon: '🌡️',
            label: 'Temperatur',
            value: `${Math.round(conditions.temperature || 0)}°C`,
            description: getTemperatureDescription(conditions.temperature),
            indicator: null
        },
        {
            icon: '💨',
            label: 'Wind',
            value: `${Math.round(conditions.windSpeed || 0)} km/h`,
            description: `aus ${conditions.windDirectionLabel || '--'} - ${getWindDescription(conditions.windSpeed)}`,
            indicator: getIndicatorClass(100 - Math.min((conditions.windSpeed || 0) * 2, 100), true)
        },
        {
            icon: getMoonIcon(conditions.moonPhase),
            label: 'Mond',
            value: `${Math.round(conditions.moonIllumination || 0)}%`,
            description: `${conditions.moonPhaseName || ''} - ${getMoonDescription(conditions.moonIllumination, conditions.isMoonUp)}`,
            indicator: getIndicatorClass(100 - (conditions.moonIllumination || 0), true)
        }
    ];

    // Add sun times if available
    if (conditions.sunset || conditions.sunrise) {
        params.push({
            icon: '🌅',
            label: 'Sonnenzeiten',
            value: formatSunTimes(conditions),
            description: 'Sonnenuntergang / Aufgang',
            indicator: null
        });
    }

    container.innerHTML = `
    <div class="details-grid">
      ${params.map(p => `
        <div class="param-row">
          <span class="param-icon">${p.icon}</span>
          <div class="param-content">
            <div class="param-label">${p.label}</div>
            <div class="param-value">${p.value}</div>
            <div class="param-description">${p.description}</div>
          </div>
          ${p.indicator ? `<div class="param-indicator ${p.indicator}"></div>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function formatCloudCover(conditions) {
    const cover = Math.round(conditions.cloudCover || 0);
    const min = Math.round(conditions.cloudCoverMin || cover);
    const max = Math.round(conditions.cloudCoverMax || cover);

    if (min !== max && Math.abs(max - min) > 5) {
        return `${cover}% (${min}-${max}%)`;
    }
    return `${cover}%`;
}

function getCloudDescription(cover) {
    if (cover === undefined) return 'Keine Daten';
    if (cover < 10) return 'Klar';
    if (cover < 25) return 'Meist klar';
    if (cover < 50) return 'Teilweise bewölkt';
    if (cover < 75) return 'Überwiegend bewölkt';
    return 'Stark bewölkt';
}

function getHumidityDescription(humidity) {
    if (humidity === undefined) return 'Keine Daten';
    if (humidity < 50) return 'Niedrig - ideal';
    if (humidity < 70) return 'Normal - OK';
    if (humidity < 85) return 'Erhöht - Beschlag möglich';
    return 'Hoch - Beschlag wahrscheinlich';
}

function getTemperatureDescription(temp) {
    if (temp === undefined) return 'Keine Daten';
    if (temp < 0) return 'Frost - warm anziehen!';
    if (temp < 5) return 'Kalt - Handschuhe empfohlen';
    if (temp < 15) return 'Kühl';
    return 'Angenehm';
}

function getWindDescription(speed) {
    if (speed === undefined) return 'Keine Daten';
    if (speed < 10) return 'Windstill - perfekt';
    if (speed < 20) return 'Leicht - OK';
    if (speed < 30) return 'Mäßig - Gewichte empfohlen';
    return 'Stark - problematisch';
}

function getMoonDescription(illumination, isUp) {
    if (illumination === undefined) return 'Keine Daten';

    const upText = isUp ? 'über Horizont' : 'unter Horizont';

    if (illumination < 10) return `Ideal für Deep Sky (${upText})`;
    if (illumination < 30) return `Wenig störend (${upText})`;
    if (illumination < 70) return `Mäßig störend (${upText})`;
    return `Stark störend (${upText})`;
}

function getMoonIcon(phase) {
    if (phase === undefined) return '🌙';
    if (phase < 0.125) return '🌑';
    if (phase < 0.25) return '🌒';
    if (phase < 0.375) return '🌓';
    if (phase < 0.5) return '🌔';
    if (phase < 0.625) return '🌕';
    if (phase < 0.75) return '🌖';
    if (phase < 0.875) return '🌗';
    return '🌘';
}

function formatSunTimes(conditions) {
    const format = (isoString) => {
        try {
            return new Date(isoString).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '--:--';
        }
    };

    const sunset = conditions.sunset ? format(conditions.sunset) : '--:--';
    const sunrise = conditions.sunrise ? format(conditions.sunrise) : '--:--';

    return `${sunset} / ${sunrise}`;
}

function getIndicatorClass(value, inverted = false) {
    // value should be 0-100 where higher is better
    if (value >= 70) return 'param-indicator--good';
    if (value >= 40) return 'param-indicator--moderate';
    return 'param-indicator--poor';
}

/**
 * Update expanded state
 */
export function setDetailPanelExpanded(container, isExpanded) {
    const toggleBtn = container.querySelector('#details-toggle');
    const content = container.querySelector('#details-content');

    if (toggleBtn && content) {
        toggleBtn.classList.toggle('active', isExpanded);
        content.classList.toggle('active', isExpanded);
        toggleBtn.querySelector('span:first-child').textContent = isExpanded ? 'Details ausblenden' : 'Details anzeigen';
    }
}
