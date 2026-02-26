/**
 * Hourly Chart Component
 * Line chart showing score over night hours with Chart.js
 */

import { Chart, registerables } from 'chart.js';

// Register all Chart.js components
Chart.register(...registerables);

let chartInstance = null;

export function createHourlyChart() {
    const container = document.createElement('div');
    container.className = 'chart-container';

    container.innerHTML = `
    <canvas id="hourly-chart"></canvas>
  `;

    return container;
}

export function renderHourlyChart(container, { hourlyData, mode }) {
    const canvas = container.querySelector('#hourly-chart');
    if (!canvas) return;

    // Destroy existing chart
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    if (!hourlyData || hourlyData.length === 0) {
        return;
    }

    // Filter to night hours (18:00 - 06:00)
    const nightData = filterNightHours(hourlyData);

    if (nightData.length === 0) {
        return;
    }

    const ctx = canvas.getContext('2d');

    // Get computed styles for colors (fallback to dark mode defaults)
    const computedStyle = getComputedStyle(document.documentElement);
    const textColor = computedStyle.getPropertyValue('--color-text-secondary').trim() || '#a0aec0';
    const textMutedColor = computedStyle.getPropertyValue('--color-text-muted').trim() || '#6b7280';
    const bgColor = computedStyle.getPropertyValue('--color-bg-secondary').trim() || '#1a202c';

    // Use explicit colors for Chart.js (CSS vars don't work well)
    const chartTextColor = '#a0aec0';  // Light gray for dark mode
    const chartGridColor = 'rgba(255, 255, 255, 0.08)';

    // Prepare data
    const labels = nightData.map(h => formatHour(h.timestamp));
    const scores = nightData.map(h => h.score);
    const minScores = nightData.map(h => h.scoreMin || h.score);
    const maxScores = nightData.map(h => h.scoreMax || h.score);

    // Get color based on average score
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const lineColor = getScoreGradientColor(avgScore);

    const nowTime = Date.now();

    const nowLinePlugin = {
        id: 'nowLine',
        beforeDraw: (chart) => {
            const x = chart.scales.x;
            const { top, bottom } = chart.chartArea;
            
            let nowX = null;
            for (let i = 0; i < nightData.length - 1; i++) {
                const t1 = new Date(nightData[i].timestamp).getTime();
                const t2 = new Date(nightData[i + 1].timestamp).getTime();
                if (nowTime >= t1 && nowTime <= t2) {
                    const px1 = x.getPixelForTick(i);
                    const px2 = x.getPixelForTick(i + 1);
                    const ratio = (nowTime - t1) / (t2 - t1);
                    nowX = px1 + ratio * (px2 - px1);
                    break;
                }
            }
            // Check if now is exactly on the last tick
            if (nowX === null && nightData.length > 0) {
                const lastT = new Date(nightData[nightData.length - 1].timestamp).getTime();
                if (Math.abs(nowTime - lastT) < 60000) {
                    nowX = x.getPixelForTick(nightData.length - 1);
                }
            }
            
            if (nowX !== null) {
                const c = chart.ctx;
                c.save();
                c.beginPath();
                c.moveTo(nowX, top);
                c.lineTo(nowX, bottom);
                c.lineWidth = 1;
                c.strokeStyle = textMutedColor;
                c.setLineDash([4, 4]);
                c.stroke();
                
                c.fillStyle = chartTextColor;
                c.font = '11px sans-serif';
                c.textAlign = 'center';
                c.textBaseline = 'top';
                const text = 'Jetzt';
                const metrics = c.measureText(text);
                c.fillStyle = bgColor;
                c.fillRect(nowX - metrics.width / 2 - 4, top, metrics.width + 8, 16);
                
                c.fillStyle = chartTextColor;
                c.fillText(text, nowX, top + 2);
                c.restore();
            }
        }
    };

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                // Uncertainty band (upper)
                {
                    label: 'Unsicherheit Max',
                    data: maxScores,
                    fill: '+1',
                    backgroundColor: 'rgba(77, 166, 255, 0.15)',
                    borderColor: 'transparent',
                    pointRadius: 0,
                    tension: 0.4
                },
                // Uncertainty band (lower)
                {
                    label: 'Unsicherheit Min',
                    data: minScores,
                    fill: false,
                    borderColor: 'transparent',
                    pointRadius: 0,
                    tension: 0.4
                },
                // Main line
                {
                    label: 'Score',
                    data: scores,
                    fill: false,
                    borderWidth: 3,
                    tension: 0.4,
                    segment: {
                        borderColor: (context) => {
                            if (context.p1DataIndex === undefined) return lineColor;
                            const time1 = new Date(nightData[context.p1DataIndex]?.timestamp).getTime();
                            return time1 <= nowTime ? textMutedColor : lineColor;
                        },
                        borderDash: (context) => {
                            if (context.p1DataIndex === undefined) return undefined;
                            const time1 = new Date(nightData[context.p1DataIndex]?.timestamp).getTime();
                            return time1 <= nowTime ? undefined : [5, 5];
                        }
                    },
                    pointBackgroundColor: (context) => {
                        const time = new Date(nightData[context.dataIndex]?.timestamp).getTime();
                        return time < nowTime ? textMutedColor : lineColor;
                    },
                    pointBorderColor: (context) => {
                        const time = new Date(nightData[context.dataIndex]?.timestamp).getTime();
                        return time < nowTime ? textMutedColor : bgColor;
                    },
                    pointRadius: (context) => {
                        const time = new Date(nightData[context.dataIndex]?.timestamp).getTime();
                        return time < nowTime ? 3 : 5;
                    },
                    pointBorderWidth: 2,
                    pointHoverRadius: 7,
                    pointHoverBorderWidth: 3
                }
            ]
        },
        plugins: [nowLinePlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(18, 24, 32, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#e6e8eb',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        title: (items) => items[0].label + ' Uhr',
                        label: (item) => {
                            if (item.datasetIndex === 2) {
                                return `Astro-Score: ${Math.round(item.raw)}`;
                            }
                            return null;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: chartGridColor,
                        drawBorder: false
                    },
                    ticks: {
                        color: chartTextColor,
                        font: {
                            size: 11,
                            weight: '500'
                        },
                        maxRotation: 0,
                        padding: 8
                    }
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: {
                        color: chartGridColor,
                        drawBorder: false
                    },
                    ticks: {
                        color: chartTextColor,
                        font: {
                            size: 11,
                            weight: '500'
                        },
                        stepSize: 25,
                        padding: 8,
                        callback: (value) => value + '%'
                    }
                }
            }
        }
    });
}

function filterNightHours(hourlyData) {
    return hourlyData.filter(h => {
        try {
            const hour = new Date(h.timestamp).getHours();
            // Night hours: 18:00-06:00
            return hour >= 18 || hour <= 6;
        } catch (e) {
            return false;
        }
    });
}

function formatHour(timestamp) {
    try {
        return new Date(timestamp).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return '--:--';
    }
}

function getScoreGradientColor(score) {
    if (score >= 80) return '#00d68f';
    if (score >= 60) return '#7ed321';
    if (score >= 40) return '#f5a623';
    if (score >= 20) return '#ff6b6b';
    return '#d0021b';
}

/**
 * Destroy chart instance
 */
export function destroyChart() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}
