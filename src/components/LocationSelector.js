/**
 * Location Selector Component
 * Shows current location with GPS and favorites functionality
 */

import locationService from '../services/location.js';

export function createLocationSelector({ location, isFavorite, onLocationClick, onGpsClick, onFavoriteToggle }) {
    const container = document.createElement('div');
    container.className = 'location-selector';

    const formattedCoords = location
        ? locationService.formatCoordinates(location.latitude, location.longitude)
        : 'Standort wird ermittelt...';

    const name = location?.name || 'Unbekannt';
    const favoriteIcon = isFavorite ? '⭐' : '☆';

    container.innerHTML = `
    <span class="location-icon">📍</span>
    <div class="location-info">
      <div class="location-name">${name}</div>
      <div class="location-coords">${formattedCoords}</div>
    </div>
    <div class="location-actions">
      <button class="btn btn--icon btn--ghost" id="gps-btn" title="GPS-Position">
        <span>📡</span>
      </button>
      <button class="btn btn--icon btn--ghost" id="favorite-btn" title="Als Favorit speichern">
        <span>${favoriteIcon}</span>
      </button>
    </div>
  `;

    // Click on location info opens favorites list
    container.querySelector('.location-info').addEventListener('click', onLocationClick);
    container.querySelector('#gps-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        onGpsClick();
    });
    container.querySelector('#favorite-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        onFavoriteToggle();
    });

    return container;
}

/**
 * Update location selector with new data
 */
export function updateLocationSelector(container, { location, isFavorite }) {
    if (!container || !location) return;

    const formattedCoords = locationService.formatCoordinates(location.latitude, location.longitude);
    const name = location.name || 'Unbekannt';
    const favoriteIcon = isFavorite ? '⭐' : '☆';

    container.querySelector('.location-name').textContent = name;
    container.querySelector('.location-coords').textContent = formattedCoords;
    container.querySelector('#favorite-btn span').textContent = favoriteIcon;
}

/**
 * Set GPS loading state
 */
export function setGpsLoading(container, isLoading) {
    const btn = container.querySelector('#gps-btn span');
    if (isLoading) {
        btn.textContent = '⏳';
    } else {
        btn.textContent = '📡';
    }
}
