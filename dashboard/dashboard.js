/**
 * CTF Analytics Dashboard
 */

let rewardChart, distributionChart, movingAvgChart, varianceChart;

// =====================
// DATA LOADING
// =====================

async function loadData() {
    const overlay = document.getElementById('loading-overlay');
    overlay.classList.remove('hidden');

    try {
        const response = await fetch('data/training_logs.json');
        const data = await response.json();

        updateStats(data);
        updateCharts(data);

        overlay.classList.add('hidden');
    } catch (error) {
        console.error('Error loading data:', error);
        overlay.innerHTML = `
            <div style="text-align: center;">
                <p style="color: #ff6b6b; font-size: 1.2rem;">⚠️ Keine Trainingsdaten gefunden</p>
                <p style="color: #888; margin-top: 10px;">Starte zuerst das Training:</p>
                <p style="color: #4dabf7; margin-top: 5px;">cd training && python train.py</p>
            </div>
        `;
    }
}

// =====================
// STATISTICS
// =====================

function updateStats(data) {
    const timesteps = data.timesteps || [];
    const rewards = data.mean_reward || [];

    // Total Episodes
    const totalEpisodes = data.episodes && data.episodes.length > 0
        ? data.episodes[data.episodes.length - 1]
        : 0;
    document.getElementById('total-episodes').textContent = totalEpisodes;

    // Total Timesteps
    const totalTimesteps = timesteps.length > 0
        ? timesteps[timesteps.length - 1]
        : 0;
    document.getElementById('total-timesteps').textContent = totalTimesteps.toLocaleString();

    // Mean Reward (latest)
    const meanReward = rewards.length > 0
        ? rewards[rewards.length - 1]
        : 0;
    document.getElementById('mean-reward').textContent = meanReward.toFixed(2);

    // Best Reward
    const bestReward = rewards.length > 0
        ? Math.max(...rewards)
        : 0;
    document.getElementById('best-reward').textContent = bestReward.toFixed(2);
}

// =====================
// CHARTS
// =====================

function updateCharts(data) {
    const timesteps = data.timesteps || [];
    const meanRewards = data.mean_reward || [];
    const stdRewards = data.std_reward || [];

    // 1. Reward Chart
    updateRewardChart(timesteps, meanRewards, stdRewards);

    // 2. Distribution Chart
    updateDistributionChart(meanRewards);

    // 3. Moving Average Chart
    updateMovingAvgChart(timesteps, meanRewards);

    // 4. Variance Chart
    updateVarianceChart(timesteps, stdRewards);
}

function updateRewardChart(timesteps, meanRewards, stdRewards) {
    const ctx = document.getElementById('reward-chart');

    if (rewardChart) {
        rewardChart.destroy();
    }

    // Upper and lower bounds for std deviation
    const upperBound = meanRewards.map((mean, i) => mean + stdRewards[i]);
    const lowerBound = meanRewards.map((mean, i) => mean - stdRewards[i]);

    rewardChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timesteps,
            datasets: [
                {
                    label: 'Mean Reward',
                    data: meanRewards,
                    borderColor: '#4dabf7',
                    backgroundColor: 'rgba(77, 171, 247, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3,
                },
                {
                    label: 'Upper Bound (Mean + Std)',
                    data: upperBound,
                    borderColor: 'rgba(77, 171, 247, 0.3)',
                    backgroundColor: 'rgba(77, 171, 247, 0.05)',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    fill: '+1',
                    tension: 0.3,
                    pointRadius: 0,
                },
                {
                    label: 'Lower Bound (Mean - Std)',
                    data: lowerBound,
                    borderColor: 'rgba(77, 171, 247, 0.3)',
                    backgroundColor: 'rgba(77, 171, 247, 0.05)',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.3,
                    pointRadius: 0,
                },
            ],
        },
        options: getChartOptions('Timesteps', 'Reward'),
    });
}

function updateDistributionChart(rewards) {
    const ctx = document.getElementById('distribution-chart');

    if (distributionChart) {
        distributionChart.destroy();
    }

    // Create histogram bins
    const bins = 10;
    const min = Math.min(...rewards);
    const max = Math.max(...rewards);
    const binSize = (max - min) / bins;

    const histogram = new Array(bins).fill(0);
    const labels = [];

    for (let i = 0; i < bins; i++) {
        const binStart = min + i * binSize;
        const binEnd = binStart + binSize;
        labels.push(`${binStart.toFixed(1)} - ${binEnd.toFixed(1)}`);

        rewards.forEach(r => {
            if (r >= binStart && r < binEnd) {
                histogram[i]++;
            }
        });
    }

    distributionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Frequency',
                data: histogram,
                backgroundColor: 'rgba(108, 99, 255, 0.6)',
                borderColor: '#6c63ff',
                borderWidth: 1,
            }],
        },
        options: getChartOptions('Reward Range', 'Frequency'),
    });
}

function updateMovingAvgChart(timesteps, rewards) {
    const ctx = document.getElementById('moving-avg-chart');

    if (movingAvgChart) {
        movingAvgChart.destroy();
    }

    // Calculate moving averages
    const windowSizes = [5, 10, 20];
    const datasets = windowSizes.map((window, idx) => {
        const movingAvg = calculateMovingAverage(rewards, window);
        const colors = ['#4dabf7', '#69db7c', '#ffd43b'];

        return {
            label: `MA-${window}`,
            data: movingAvg,
            borderColor: colors[idx],
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
        };
    });

    movingAvgChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timesteps,
            datasets: datasets,
        },
        options: getChartOptions('Timesteps', 'Reward (MA)'),
    });
}

function updateVarianceChart(timesteps, stdRewards) {
    const ctx = document.getElementById('variance-chart');

    if (varianceChart) {
        varianceChart.destroy();
    }

    varianceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timesteps,
            datasets: [{
                label: 'Standard Deviation',
                data: stdRewards,
                borderColor: '#ff6b6b',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
            }],
        },
        options: getChartOptions('Timesteps', 'Std Deviation'),
    });
}

// =====================
// HELPERS
// =====================

function calculateMovingAverage(data, windowSize) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - windowSize + 1);
        const window = data.slice(start, i + 1);
        const avg = window.reduce((a, b) => a + b, 0) / window.length;
        result.push(avg);
    }
    return result;
}

function getChartOptions(xLabel, yLabel) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: '#fff',
                    font: { size: 12 },
                },
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1,
            },
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: xLabel,
                    color: '#888',
                },
                ticks: { color: '#888' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
            },
            y: {
                title: {
                    display: true,
                    text: yLabel,
                    color: '#888',
                },
                ticks: { color: '#888' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
            },
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false,
        },
    };
}

// =====================
// INIT
// =====================

window.addEventListener('DOMContentLoaded', () => {
    loadData();
});
