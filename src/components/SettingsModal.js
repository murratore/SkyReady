/**
 * Settings Modal Component
 * Modal for app settings including photography mode, theme, and units
 */

import scoreService from '../services/score.js';

export function createSettingsModal({ settings, onUpdate, onClose }) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'settings-modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'settings-modal';

    modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">Einstellungen</h2>
      <button class="modal-close" id="close-settings">✕</button>
    </div>
    <div class="modal-body">
      <!-- Photography Mode -->
      <div class="settings-section">
        <div class="settings-label">Fotografie-Modus</div>
        <div class="mode-grid" id="mode-grid">
          ${renderModeCards(settings.photographyMode)}
        </div>
      </div>
      
      <!-- Theme -->
      <div class="settings-section">
        <div class="settings-label">Erscheinungsbild</div>
        <div class="radio-group" id="theme-group">
          ${renderThemeOptions(settings.theme)}
        </div>
      </div>
      
      <!-- Temperature Unit -->
      <div class="settings-section">
        <div class="settings-label">Temperatur-Einheit</div>
        <div class="radio-group" id="unit-group">
          ${renderUnitOptions(settings.temperatureUnit)}
        </div>
      </div>
      
      <!-- Show Details -->
      <div class="settings-section">
        <div class="settings-row">
          <span class="settings-row-label">Details standardmäßig anzeigen</span>
          <label class="toggle">
            <input type="checkbox" id="show-details-toggle" ${settings.showDetailedParams ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      
      <!-- Version info -->
      <div class="text-center text-muted text-sm mt-8">
        AstroWeather v1.0.0<br>
        Optimiert für Schweiz / Alpenraum
      </div>
    </div>
  `;

    // Event listeners
    modal.querySelector('#close-settings').addEventListener('click', onClose);
    backdrop.addEventListener('click', onClose);

    // Mode selection
    modal.querySelectorAll('.mode-card').forEach(card => {
        card.addEventListener('click', () => {
            const mode = card.getAttribute('data-mode');
            modal.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            onUpdate({ photographyMode: mode });
        });
    });

    // Theme selection
    modal.querySelectorAll('#theme-group .radio-item').forEach(item => {
        item.addEventListener('click', () => {
            const theme = item.getAttribute('data-value');
            modal.querySelectorAll('#theme-group .radio-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            onUpdate({ theme });
            applyTheme(theme);
        });
    });

    // Unit selection
    modal.querySelectorAll('#unit-group .radio-item').forEach(item => {
        item.addEventListener('click', () => {
            const unit = item.getAttribute('data-value');
            modal.querySelectorAll('#unit-group .radio-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            onUpdate({ temperatureUnit: unit });
        });
    });

    // Show details toggle
    modal.querySelector('#show-details-toggle').addEventListener('change', (e) => {
        onUpdate({ showDetailedParams: e.target.checked });
    });

    // Create container
    const container = document.createElement('div');
    container.appendChild(backdrop);
    container.appendChild(modal);

    return container;
}

function renderModeCards(currentMode) {
    const modes = [
        { id: 'general', name: 'Allgemein', icon: '🌟' },
        { id: 'deep-sky', name: 'Deep Sky', icon: '🌌' },
        { id: 'planetary', name: 'Planeten', icon: '🪐' },
        { id: 'milky-way', name: 'Milchstraße', icon: '🌠' }
    ];

    return modes.map(mode => `
    <div class="mode-card${mode.id === currentMode ? ' active' : ''}" data-mode="${mode.id}">
      <div class="mode-icon">${mode.icon}</div>
      <div class="mode-name">${mode.name}</div>
    </div>
  `).join('');
}

function renderThemeOptions(currentTheme) {
    const themes = [
        { id: 'auto', name: 'Automatisch (System)', icon: '🌗' },
        { id: 'dark', name: 'Dunkel', icon: '🌙' },
        { id: 'light', name: 'Hell', icon: '☀️' }
    ];

    return themes.map(theme => `
    <div class="radio-item${theme.id === currentTheme ? ' active' : ''}" data-value="${theme.id}">
      <div class="radio-circle"></div>
      <span>${theme.icon}</span>
      <span class="radio-label">${theme.name}</span>
    </div>
  `).join('');
}

function renderUnitOptions(currentUnit) {
    const units = [
        { id: 'celsius', name: 'Celsius (°C)' },
        { id: 'fahrenheit', name: 'Fahrenheit (°F)' }
    ];

    return units.map(unit => `
    <div class="radio-item${unit.id === currentUnit ? ' active' : ''}" data-value="${unit.id}">
      <div class="radio-circle"></div>
      <span class="radio-label">${unit.name}</span>
    </div>
  `).join('');
}

/**
 * Apply theme to document
 */
export function applyTheme(theme) {
    const root = document.documentElement;

    if (theme === 'auto') {
        // Use system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        root.setAttribute('data-theme', theme);
    }
}

/**
 * Show modal
 */
export function showSettingsModal(modal) {
    const backdrop = modal.querySelector('.modal-backdrop');
    const content = modal.querySelector('.modal');

    backdrop.classList.add('active');
    content.classList.add('active');
}

/**
 * Hide modal
 */
export function hideSettingsModal(modal) {
    const backdrop = modal.querySelector('.modal-backdrop');
    const content = modal.querySelector('.modal');

    backdrop.classList.remove('active');
    content.classList.remove('active');
}
