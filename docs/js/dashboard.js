/**
 * Dashboard - Training Metrics Visualization
 * Loads and displays data from training_logs.json
 */

// Global chart instances
let rewardChart, lengthChart, distributionChart;
let trainingData = null;
let autoRefreshInterval = null;
let lastUpdateTime = null;

// Chart.js default configuration
Chart.defaults.color = '#b4b4c8';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";

// Auto-refresh configuration
const AUTO_REFRESH_ENABLED = true;
const REFRESH_INTERVAL = 3000; // 3 seconds

// Load data on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadTrainingData();
    initializeCharts();
    updateMetrics();
    updateLiveInfo();
    hideLoading();

    // Start auto-refresh if enabled
    if (AUTO_REFRESH_ENABLED) {
        startAutoRefresh();
    }
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
                    },
                    min: -50,
                    max: 150,
                    grace: '10%'
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
                    },
                    min: 0,
                    max: 500,
                    grace: '5%'
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

    // Current mean reward (latest value)
    const currentMeanReward = trainingData.current_mean_reward ||
        (trainingData.mean_reward.length > 0 ? trainingData.mean_reward[trainingData.mean_reward.length - 1] : 0);
    document.getElementById('mean-reward').textContent = currentMeanReward.toFixed(1);

    // Max reward
    const maxReward = trainingData.max_reward || Math.max(...trainingData.mean_reward);
    document.getElementById('max-reward').textContent = maxReward.toFixed(1);

    // Average episode length (all time)
    const avgLength = trainingData.mean_length.reduce((a, b) => a + b, 0) / trainingData.mean_length.length;
    document.getElementById('avg-episode-length').textContent = avgLength.toFixed(0);

    // Current standard deviation (latest value)
    const currentStd = trainingData.std_reward.length > 0 ?
        trainingData.std_reward[trainingData.std_reward.length - 1] : 0;
    document.getElementById('std-reward').textContent = currentStd.toFixed(1);

    // Total episodes
    const totalEpisodes = trainingData.episodes.reduce((a, b) => a + b, 0);
    document.getElementById('total-episodes').textContent = formatNumber(totalEpisodes);

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
 * Update live training information
 */
function updateLiveInfo() {
    if (!trainingData) return;

    // Model name
    const modelName = trainingData.model_name || 'Unknown';
    document.getElementById('model-name').textContent = modelName;

    // Current and total timesteps
    const currentSteps = trainingData.current_timesteps ||
        (trainingData.timesteps.length > 0 ? trainingData.timesteps[trainingData.timesteps.length - 1] : 0);
    const totalSteps = trainingData.total_timesteps || currentSteps;

    document.getElementById('current-steps').textContent = formatNumber(currentSteps);
    document.getElementById('total-steps').textContent = formatNumber(totalSteps);

    // Progress percentage
    const progressPercent = trainingData.progress_percent ||
        (totalSteps > 0 ? (currentSteps / totalSteps) * 100 : 0);
    document.getElementById('progress-percent').textContent = progressPercent.toFixed(1) + '%';
    document.getElementById('progress-bar').style.width = progressPercent + '%';

    // Last update time
    if (trainingData.last_update) {
        const updateTime = new Date(trainingData.last_update);
        const now = new Date();
        const diffSeconds = Math.floor((now - updateTime) / 1000);

        let timeText;
        if (diffSeconds < 10) {
            timeText = 'Gerade eben';
        } else if (diffSeconds < 60) {
            timeText = `Vor ${diffSeconds}s`;
        } else if (diffSeconds < 3600) {
            timeText = `Vor ${Math.floor(diffSeconds / 60)}m`;
        } else {
            timeText = updateTime.toLocaleTimeString();
        }

        document.getElementById('last-update').textContent = timeText;

        // Update live indicator
        const isRecent = diffSeconds < 30; // Training is considered "live" if updated in last 30 seconds
        const liveDot = document.getElementById('live-dot');
        const liveCard = document.getElementById('live-indicator-card');

        if (isRecent) {
            liveDot.style.background = '#00ff88';
            liveCard.style.opacity = '1';
        } else {
            liveDot.style.background = '#ff6b6b';
            liveCard.style.opacity = '0.6';
        }
    } else {
        document.getElementById('last-update').textContent = '--';
    }
}

/**
 * Start auto-refresh
 */
function startAutoRefresh() {
    console.log('Starting auto-refresh every', REFRESH_INTERVAL / 1000, 'seconds');

    autoRefreshInterval = setInterval(async () => {
        await loadTrainingData();

        if (trainingData) {
            // Update charts with new data
            updateCharts();
            updateMetrics();
            updateLiveInfo();
        }
    }, REFRESH_INTERVAL);
}

/**
 * Stop auto-refresh
 */
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log('Auto-refresh stopped');
    }
}

/**
 * Update existing charts with new data
 */
function updateCharts() {
    if (!trainingData) return;

    // Update reward chart
    if (rewardChart) {
        rewardChart.data.labels = trainingData.timesteps;
        rewardChart.data.datasets[0].data = trainingData.mean_reward;
        rewardChart.data.datasets[1].data = trainingData.std_reward;
        rewardChart.update('none'); // 'none' for no animation, faster update
    }

    // Update length chart
    if (lengthChart) {
        lengthChart.data.labels = trainingData.timesteps;
        lengthChart.data.datasets[0].data = trainingData.mean_length;
        lengthChart.update('none');
    }

    // Update distribution chart
    if (distributionChart) {
        const rewardBins = createHistogram(trainingData.mean_reward, 10);
        distributionChart.data.labels = rewardBins.labels;
        distributionChart.data.datasets[0].data = rewardBins.counts;
        distributionChart.update('none');
    }
}
