/**
 * Favorites Modal Component
 * Modal for managing favorite locations
 */

import locationService from '../services/location.js';

export function createFavoritesModal({ favorites, currentLocation, onSelect, onAdd, onDelete, onClose }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'favorites-modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'favorites-modal';

  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">Standorte</h2>
      <button class="modal-close" id="close-favorites">✕</button>
    </div>
    <div class="modal-body">
      <!-- Search section - always visible -->
      <div class="search-section mb-4">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" id="location-search" placeholder="Ort suchen (z.B. Grindelwald, Zermatt...)">
        </div>
        <div class="search-results" id="search-results"></div>
        <div class="search-loading hidden" id="search-loading">
          <span class="loading-spinner"></span>
          <span>Suche...</span>
        </div>
      </div>
      
      <!-- Favorites section -->
      <div class="section-divider">
        <span>⭐ Favoriten</span>
        <span class="text-muted text-sm">(${favorites.length}/5)</span>
      </div>
      
      <div class="location-list" id="favorites-list"></div>
      
      <div class="mt-4">
        <button class="btn btn--secondary btn--full" id="add-current-btn">
          <span>📍</span>
          <span>Aktuellen Standort als Favorit speichern</span>
        </button>
      </div>
    </div>
  `;

  // Render favorites list
  const listContainer = modal.querySelector('#favorites-list');
  renderFavoritesList(listContainer, { favorites, currentLocation, onSelect, onDelete, onClose });

  // Event listeners
  modal.querySelector('#close-favorites').addEventListener('click', onClose);
  backdrop.addEventListener('click', onClose);

  modal.querySelector('#add-current-btn').addEventListener('click', () => {
    if (currentLocation) {
      const added = onAdd(currentLocation);
      if (added !== false) {
        // Refresh the favorites list
        const updatedFavorites = [...favorites];
        renderFavoritesList(listContainer, { favorites: updatedFavorites, currentLocation, onSelect, onDelete, onClose });
      }
    }
  });

  // Search functionality with loading state
  let searchTimeout;
  const searchInput = modal.querySelector('#location-search');
  const searchResults = modal.querySelector('#search-results');
  const searchLoading = modal.querySelector('#search-loading');

  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();

    if (query.length < 2) {
      searchResults.innerHTML = '';
      searchLoading.classList.add('hidden');
      return;
    }

    // Show loading
    searchLoading.classList.remove('hidden');
    searchResults.innerHTML = '';

    searchTimeout = setTimeout(async () => {
      try {
        const results = await locationService.searchLocation(query);
        searchLoading.classList.add('hidden');

        renderSearchResults(searchResults, results, (location) => {
          // Select this location directly (navigates to it)
          onSelect(location);
          onClose();
        }, (location) => {
          // Add to favorites
          onAdd(location);
          searchInput.value = '';
          searchResults.innerHTML = '';
          renderFavoritesList(listContainer, { favorites, currentLocation, onSelect, onDelete, onClose });
        });
      } catch (error) {
        searchLoading.classList.add('hidden');
        searchResults.innerHTML = `<div class="text-center text-muted py-3 text-sm">Fehler bei der Suche</div>`;
      }
    }, 400);
  });

  // Focus search on open
  setTimeout(() => searchInput.focus(), 100);

  // Create container and add both elements
  const container = document.createElement('div');
  container.appendChild(backdrop);
  container.appendChild(modal);

  return container;
}

function renderFavoritesList(container, { favorites, currentLocation, onSelect, onDelete }) {
  if (!favorites || favorites.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📍</div>
        <div class="empty-title">Keine Favoriten</div>
        <div class="empty-description">Füge deinen ersten Standort hinzu</div>
      </div>
    `;
    return;
  }

  container.innerHTML = favorites.map(fav => {
    const isActive = currentLocation &&
      Math.abs(fav.latitude - currentLocation.latitude) < 0.001 &&
      Math.abs(fav.longitude - currentLocation.longitude) < 0.001;

    return `
      <div class="location-list-item${isActive ? ' active' : ''}" data-id="${fav.id}">
        <span class="location-list-icon">⭐</span>
        <div class="location-list-content">
          <div class="location-list-name">${fav.name}</div>
          <div class="location-list-coords">${locationService.formatCoordinates(fav.latitude, fav.longitude)}</div>
        </div>
        <button class="location-list-delete" data-delete="${fav.id}" title="Löschen">🗑️</button>
      </div>
    `;
  }).join('');

  // Add click listeners
  container.querySelectorAll('.location-list-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.location-list-delete')) {
        const id = item.getAttribute('data-id');
        const location = favorites.find(f => f.id === id);
        if (location) {
          onSelect(location);
        }
      }
    });
  });

  container.querySelectorAll('.location-list-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-delete');
      onDelete(id);
      renderFavoritesList(container, { favorites: favorites.filter(f => f.id !== id), currentLocation, onSelect, onDelete });
    });
  });
}

function renderSearchResults(container, results, onSelect, onAddFavorite) {
  if (!results || results.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-3 text-sm">
        Keine Ergebnisse gefunden
      </div>
    `;
    return;
  }

  container.innerHTML = results.map(loc => `
    <div class="search-result-item" data-lat="${loc.latitude}" data-lon="${loc.longitude}" data-name="${loc.name || loc.displayName}">
      <div class="search-result-main">
        <span class="search-result-icon">📍</span>
        <div class="search-result-content">
          <div class="search-result-name">${loc.name}</div>
          <div class="search-result-detail">${loc.admin1 ? loc.admin1 + ', ' : ''}${loc.country || ''}</div>
        </div>
      </div>
      <div class="search-result-actions">
        <button class="btn btn--icon btn--ghost search-result-select" title="Wetter anzeigen">
          <span>➔</span>
        </button>
        ${onAddFavorite ? `
          <button class="btn btn--icon btn--ghost search-result-fav" title="Als Favorit speichern">
            <span>⭐</span>
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');

  // Select location (navigate to it)
  container.querySelectorAll('.search-result-main, .search-result-select').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = el.closest('.search-result-item');
      const location = {
        name: item.getAttribute('data-name'),
        latitude: parseFloat(item.getAttribute('data-lat')),
        longitude: parseFloat(item.getAttribute('data-lon'))
      };
      onSelect(location);
    });
  });

  // Add to favorites
  if (onAddFavorite) {
    container.querySelectorAll('.search-result-fav').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = btn.closest('.search-result-item');
        const location = {
          name: item.getAttribute('data-name'),
          latitude: parseFloat(item.getAttribute('data-lat')),
          longitude: parseFloat(item.getAttribute('data-lon'))
        };
        onAddFavorite(location);
        // Visual feedback
        btn.innerHTML = '<span>✓</span>';
        btn.disabled = true;
      });
    });
  }
}

/**
 * Show modal
 */
export function showFavoritesModal(modal) {
  const backdrop = modal.querySelector('.modal-backdrop');
  const content = modal.querySelector('.modal');

  backdrop.classList.add('active');
  content.classList.add('active');
}

/**
 * Hide modal
 */
export function hideFavoritesModal(modal) {
  const backdrop = modal.querySelector('.modal-backdrop');
  const content = modal.querySelector('.modal');

  backdrop.classList.remove('active');
  content.classList.remove('active');
}

// Add search input styles
const searchStyles = document.createElement('style');
searchStyles.textContent = `
  .search-section {
    margin-bottom: var(--space-4);
  }
  
  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }
  
  .search-icon {
    position: absolute;
    left: var(--space-3);
    font-size: var(--font-size-lg);
    pointer-events: none;
  }
  
  .search-input {
    width: 100%;
    padding: var(--space-3) var(--space-4);
    padding-left: calc(var(--space-3) + 28px);
    background: var(--color-bg-tertiary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    color: var(--color-text-primary);
    font-size: var(--font-size-base);
  }
  
  .search-input:focus {
    border-color: var(--color-accent);
    outline: none;
    box-shadow: 0 0 0 3px var(--color-accent-subtle);
  }
  
  .search-input::placeholder {
    color: var(--color-text-muted);
  }
  
  .search-results {
    margin-top: var(--space-2);
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    max-height: 250px;
    overflow-y: auto;
  }
  
  .search-results:empty {
    display: none;
  }
  
  .search-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-3);
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }
  
  .search-loading .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  .search-result-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
    transition: background var(--transition-fast);
  }
  
  .search-result-item:last-child {
    border-bottom: none;
  }
  
  .search-result-item:hover {
    background: var(--color-bg-tertiary);
  }
  
  .search-result-main {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex: 1;
    min-width: 0;
    cursor: pointer;
  }
  
  .search-result-icon {
    font-size: var(--font-size-lg);
    flex-shrink: 0;
  }
  
  .search-result-content {
    flex: 1;
    min-width: 0;
  }
  
  .search-result-name {
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .search-result-detail {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }
  
  .search-result-actions {
    display: flex;
    gap: var(--space-1);
    flex-shrink: 0;
  }
  
  .section-divider {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) 0;
    margin-bottom: var(--space-2);
    border-bottom: 1px solid var(--color-border);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
  }
`;
document.head.appendChild(searchStyles);

