/**
 * Offline Banner Component
 * Shows when app is offline or data is stale
 */

export function createOfflineBanner() {
    const banner = document.createElement('div');
    banner.className = 'offline-banner';
    banner.id = 'offline-banner';
    banner.innerHTML = `
    <span>📡 Offline - Zeige gecachte Daten</span>
  `;

    return banner;
}

/**
 * Show offline banner
 */
export function showOfflineBanner(banner, message = null) {
    if (message) {
        banner.innerHTML = `<span>${message}</span>`;
    }
    banner.classList.add('active');
}

/**
 * Hide offline banner
 */
export function hideOfflineBanner(banner) {
    banner.classList.remove('active');
}

/**
 * Update banner for stale data
 */
export function showStaleDataBanner(banner, ageHours) {
    banner.innerHTML = `<span>⚠️ Daten ${ageHours}h alt - Aktualisierung empfohlen</span>`;
    banner.classList.add('active');
}

/**
 * Setup online/offline listeners
 */
export function setupOfflineDetection(banner) {
    window.addEventListener('online', () => {
        hideOfflineBanner(banner);
    });

    window.addEventListener('offline', () => {
        showOfflineBanner(banner);
    });

    // Initial check
    if (!navigator.onLine) {
        showOfflineBanner(banner);
    }
}
