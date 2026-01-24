/**
 * Header Component
 * App header with logo, settings, and refresh buttons
 */

export function createHeader({ onSettingsClick, onRefresh }) {
    const header = document.createElement('header');
    header.className = 'header';

    header.innerHTML = `
    <div class="header-logo">
      <span class="header-logo-icon">🌟</span>
      <span>AstroWeather</span>
    </div>
    <div class="header-actions">
      <button class="btn btn--icon btn--ghost" id="refresh-btn" title="Aktualisieren">
        <span>🔄</span>
      </button>
      <button class="btn btn--icon btn--ghost" id="settings-btn" title="Einstellungen">
        <span>⚙️</span>
      </button>
    </div>
  `;

    // Event listeners
    header.querySelector('#settings-btn').addEventListener('click', onSettingsClick);
    header.querySelector('#refresh-btn').addEventListener('click', () => {
        const btn = header.querySelector('#refresh-btn span');
        btn.style.animation = 'spin 1s linear infinite';
        onRefresh();
        setTimeout(() => {
            btn.style.animation = '';
        }, 1000);
    });

    return header;
}

/**
 * Set loading state on refresh button
 */
export function setHeaderLoading(header, isLoading) {
    const btn = header.querySelector('#refresh-btn span');
    if (isLoading) {
        btn.style.animation = 'spin 1s linear infinite';
    } else {
        btn.style.animation = '';
    }
}
