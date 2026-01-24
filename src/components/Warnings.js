/**
 * Warnings Component
 * Displays weather warnings for astrophotography
 */

export function createWarnings(warnings = []) {
    const container = document.createElement('div');
    container.className = 'warnings';

    if (!warnings || warnings.length === 0) {
        return container;
    }

    warnings.forEach(warning => {
        const warningEl = document.createElement('div');
        warningEl.className = `warning-box${warning.severity === 'high' ? ' warning-box--high' : ''}`;

        warningEl.innerHTML = `
      <span class="warning-icon">${warning.icon || '⚠️'}</span>
      <span class="warning-text">${warning.message}</span>
    `;

        container.appendChild(warningEl);
    });

    return container;
}

/**
 * Update warnings container
 */
export function updateWarnings(container, warnings = []) {
    container.innerHTML = '';

    if (!warnings || warnings.length === 0) {
        return;
    }

    warnings.forEach(warning => {
        const warningEl = document.createElement('div');
        warningEl.className = `warning-box${warning.severity === 'high' ? ' warning-box--high' : ''}`;

        warningEl.innerHTML = `
      <span class="warning-icon">${warning.icon || '⚠️'}</span>
      <span class="warning-text">${warning.message}</span>
    `;

        container.appendChild(warningEl);
    });
}
