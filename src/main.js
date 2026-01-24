/**
 * AstroWeather PWA - Entry Point
 * Initializes the application and registers service worker
 */

import './app.js';

// Register service worker for PWA (only in production)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });

            console.log('ServiceWorker registered:', registration.scope);

            // Handle updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateNotification();
                    }
                });
            });
        } catch (error) {
            console.log('ServiceWorker registration failed:', error.message);
        }
    });
}

// Handle PWA install prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show install button/banner
    showInstallPrompt();
});

function showInstallPrompt() {
    // Show after some engagement (e.g., after loading data)
    setTimeout(() => {
        if (deferredPrompt) {
            const banner = document.createElement('div');
            banner.className = 'install-banner';
            banner.innerHTML = `
        <div class="install-banner-content">
          <span>📲 App installieren für schnelleren Zugriff</span>
          <button class="btn btn--primary btn--sm" id="install-btn">Installieren</button>
          <button class="btn btn--ghost btn--sm" id="dismiss-install">Später</button>
        </div>
      `;

            document.body.appendChild(banner);

            document.getElementById('install-btn').addEventListener('click', async () => {
                banner.remove();
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log('Install prompt outcome:', outcome);
                deferredPrompt = null;
            });

            document.getElementById('dismiss-install').addEventListener('click', () => {
                banner.remove();
            });
        }
    }, 30000); // Show after 30 seconds
}

function showUpdateNotification() {
    const banner = document.createElement('div');
    banner.className = 'update-banner';
    banner.innerHTML = `
    <div class="update-banner-content">
      <span>🔄 Neue Version verfügbar</span>
      <button class="btn btn--primary btn--sm" id="update-btn">Aktualisieren</button>
    </div>
  `;

    document.body.appendChild(banner);

    document.getElementById('update-btn').addEventListener('click', () => {
        window.location.reload();
    });
}

// Add install/update banner styles
const bannerStyles = document.createElement('style');
bannerStyles.textContent = `
  .install-banner,
  .update-banner {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border-top: 1px solid var(--color-border);
    z-index: var(--z-modal);
    animation: slideUp 0.3s ease;
  }
  
  .install-banner-content,
  .update-banner-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    flex-wrap: wrap;
    max-width: var(--max-width);
    margin: 0 auto;
  }
  
  .btn--sm {
    padding: var(--space-2) var(--space-4);
    font-size: var(--font-size-sm);
  }
`;
document.head.appendChild(bannerStyles);

// Handle app visibility changes for data refresh
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && window.app) {
        // Check if data is stale (> 3 hours)
        const lastFetch = localStorage.getItem('lastFetchTime');
        if (lastFetch) {
            const age = Date.now() - parseInt(lastFetch);
            if (age > 3 * 60 * 60 * 1000) { // 3 hours
                console.log('Data is stale, refreshing...');
                window.app.refreshData();
            }
        }
    }
});

// Store last fetch time
const originalFetch = window.fetch;
window.fetch = function (...args) {
    const url = args[0];
    if (typeof url === 'string' && (url.includes('open-meteo') || url.includes('7timer'))) {
        localStorage.setItem('lastFetchTime', Date.now().toString());
    }
    return originalFetch.apply(this, args);
};

console.log('🌟 AstroWeather PWA initialized');
