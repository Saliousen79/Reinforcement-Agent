/**
 * Dashboard - Training Metrics Visualization
 * Loads and displays data from training_logs.json
 */

// Global chart instances
let rewardChart, lengthChart, distributionChart;
let trainingData = null;

// Chart.js default configuration
Chart.defaults.color = '#b4b4c8';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";

// Load data on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadTrainingData();
    initializeCharts();
    updateMetrics();
    hideLoading();
});

/**
 * Load training data from JSON file
 */
async function loadTrainingData() {
    try {
        // Try to load from the dashboard/data folder first
        let response = await fetch('../dashboard/data/training_logs.json');

        if (!response.ok) {
            // Fallback: try relative path
            response = await fetch('data/training_logs.json');
        }

        if (!response.ok) {
            throw new Error('Could not load training data');
        }

        trainingData = await response.json();
        console.log('Training data loaded:', trainingData);
    } catch (error) {
        console.error('Error loading training data:', error);
        showError('Failed to load training data. Make sure training_logs.json is available.');
    }
}

/**
 * Initialize all charts
 */
function initializeCharts() {
    if (!trainingData) return;

    // Reward Chart (Main)
    const rewardCtx = document.getElementById('reward-chart').getContext('2d');
    rewardChart = new Chart(rewardCtx, {
        type: 'line',
        data: {
            labels: trainingData.timesteps,
            datasets: [
                {
                    label: 'Mean Reward',
                    data: trainingData.mean_reward,
                    borderColor: '#00ff88',
                    backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                },
                {
                    label: 'Std Dev',
                    data: trainingData.std_reward,
                    borderColor: '#00d4ff',
                    backgroundColor: 'rgba(0, 212, 255, 0.05)',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#b4b4c8',
                        font: { size: 12 }
                    }
                },
                zoom: {
                    zoom: {
                        wheel: {
                            enabled: true,
                            modifierKey: 'ctrl'
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'x',
                    },
                    pan: {
                        enabled: true,
                        mode: 'x',
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(30, 30, 36, 0.9)',
                    borderColor: 'rgba(0, 255, 136, 0.5)',
                    borderWidth: 1,
                    titleColor: '#00ff88',
                    bodyColor: '#b4b4c8',
                    padding: 12,
                    displayColors: true,
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Timesteps',
                        color: '#b4b4c8'
                    },
                    ticks: {
                        color: '#6b6b7f',
                        maxTicksLimit: 10
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Reward',
                        color: '#b4b4c8'
                    },
                    ticks: {
                        color: '#6b6b7f'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });

    // Episode Length Chart
    const lengthCtx = document.getElementById('length-chart').getContext('2d');
    lengthChart = new Chart(lengthCtx, {
        type: 'line',
        data: {
            labels: trainingData.timesteps,
            datasets: [{
                label: 'Episode Length',
                data: trainingData.mean_length,
                borderColor: '#6c63ff',
                backgroundColor: 'rgba(108, 99, 255, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(30, 30, 36, 0.9)',
                    borderColor: 'rgba(108, 99, 255, 0.5)',
                    borderWidth: 1,
                    titleColor: '#6c63ff',
                    bodyColor: '#b4b4c8',
                    padding: 12,
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Timesteps',
                        color: '#b4b4c8'
                    },
                    ticks: {
                        color: '#6b6b7f',
                        maxTicksLimit: 8
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Steps per Episode',
                        color: '#b4b4c8'
                    },
                    ticks: {
                        color: '#6b6b7f'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                }
            }
        }
    });

    // Distribution Chart (Histogram of rewards)
    const distributionCtx = document.getElementById('distribution-chart').getContext('2d');
    const rewardBins = createHistogram(trainingData.mean_reward, 10);

    distributionChart = new Chart(distributionCtx, {
        type: 'bar',
        data: {
            labels: rewardBins.labels,
            datasets: [{
                label: 'Frequency',
                data: rewardBins.counts,
                backgroundColor: 'rgba(0, 255, 136, 0.6)',
                borderColor: '#00ff88',
                borderWidth: 1,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(30, 30, 36, 0.9)',
                    borderColor: 'rgba(0, 255, 136, 0.5)',
                    borderWidth: 1,
                    titleColor: '#00ff88',
                    bodyColor: '#b4b4c8',
                    padding: 12,
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Reward Range',
                        color: '#b4b4c8'
                    },
                    ticks: {
                        color: '#6b6b7f'
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Count',
                        color: '#b4b4c8'
                    },
                    ticks: {
                        color: '#6b6b7f',
                        precision: 0
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                }
            }
        }
    });
}

/**
 * Update metric cards
 */
function updateMetrics() {
    if (!trainingData) return;

    // Max reward
    const maxReward = Math.max(...trainingData.mean_reward);
    document.getElementById('max-reward').textContent = maxReward.toFixed(1);

    // Total timesteps
    const totalTimesteps = trainingData.timesteps[trainingData.timesteps.length - 1];
    document.getElementById('total-timesteps').textContent = formatNumber(totalTimesteps);

    // Average episode length
    const avgLength = trainingData.mean_length.reduce((a, b) => a + b, 0) / trainingData.mean_length.length;
    document.getElementById('avg-episode-length').textContent = avgLength.toFixed(0);

    // Generate insights
    generateInsights();
}

/**
 * Generate performance insights
 */
function generateInsights() {
    if (!trainingData) return;

    const container = document.getElementById('insights-container');

    const meanRewards = trainingData.mean_reward;
    const firstQuarter = meanRewards.slice(0, Math.floor(meanRewards.length / 4));
    const lastQuarter = meanRewards.slice(-Math.floor(meanRewards.length / 4));

    const firstAvg = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length;
    const lastAvg = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length;
    const improvement = ((lastAvg - firstAvg) / Math.abs(firstAvg)) * 100;

    const maxReward = Math.max(...meanRewards);
    const minReward = Math.min(...meanRewards);
    const range = maxReward - minReward;

    container.innerHTML = `
        <div style="font-size: 0.9rem; line-height: 1.8; color: var(--text-secondary);">
            <p><strong style="color: var(--accent-green);">Performance Trend:</strong><br>
            ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}% improvement from early to late training</p>

            <p style="margin-top: 1rem;"><strong style="color: var(--accent-blue);">Reward Range:</strong><br>
            Min: ${minReward.toFixed(1)} | Max: ${maxReward.toFixed(1)} | Span: ${range.toFixed(1)}</p>

            <p style="margin-top: 1rem;"><strong style="color: var(--accent-purple);">Stability:</strong><br>
            ${range < 50 ? 'High stability observed' : 'Moderate variance in performance'}</p>
        </div>
    `;
}

/**
 * Create histogram bins from data
 */
function createHistogram(data, bins) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const binSize = (max - min) / bins;

    const counts = new Array(bins).fill(0);
    const labels = [];

    // Create bin labels
    for (let i = 0; i < bins; i++) {
        const lower = min + i * binSize;
        const upper = min + (i + 1) * binSize;
        labels.push(`${lower.toFixed(0)}-${upper.toFixed(0)}`);
    }

    // Count values in each bin
    data.forEach(value => {
        const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
        counts[binIndex]++;
    });

    return { labels, counts };
}

/**
 * Reset zoom on main chart
 */
document.getElementById('reset-zoom')?.addEventListener('click', () => {
    if (rewardChart) {
        rewardChart.resetZoom();
    }
});

/**
 * Format large numbers
 */
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

/**
 * Show error message
 */
function showError(message) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.innerHTML = `
            <div style="text-align: center; max-width: 500px; padding: 2rem;">
                <svg width="60" height="60" fill="#ff6b6b" viewBox="0 0 16 16">
                    <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                </svg>
                <h2 style="margin-top: 1rem; color: #ff6b6b;">Error Loading Data</h2>
                <p style="margin-top: 1rem; color: var(--text-secondary);">${message}</p>
                <button onclick="location.reload()" class="cta-button" style="margin-top: 2rem;">
                    Retry
                </button>
            </div>
        `;
    }
}

/**
 * Run selector (placeholder for multiple training runs)
 */
document.getElementById('run-select')?.addEventListener('change', (e) => {
    // In the future, this could load different training runs
    console.log('Selected run:', e.target.value);
});
