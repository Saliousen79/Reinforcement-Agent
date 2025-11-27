/**
 * Minimalistisches CTF Training Dashboard
 */

let mainChart;
let lengthChart; // Globale Variable für den zweiten Chart
let previousData = null;
let refreshInterval;
const REFRESH_RATE = 5000; // 5 Sekunden

// =====================
// AUTO-REFRESH
// =====================

function startAutoRefresh() {
    loadData(); // Sofort laden

    refreshInterval = setInterval(() => {
        loadData();
        updateRefreshIndicator();
    }, REFRESH_RATE);

    updateRefreshIndicator();
}

function updateRefreshIndicator() {
    const icon = document.getElementById('refresh-icon');
    const time = document.getElementById('refresh-time');
    const status = document.getElementById('refresh-status');

    const now = new Date();
    time.textContent = now.toLocaleTimeString();
    icon.textContent = '🔄';
    status.classList.add('active');

    setTimeout(() => {
        icon.textContent = '⏸';
        status.classList.remove('active');
    }, 500);
}

// =====================
// DATA LOADING
// =====================

async function loadData() {
    try {
        console.log('[Dashboard] Versuche Daten zu laden...');
        const response = await fetch('data/training_logs.json?t=' + Date.now());

        console.log('[Dashboard] Response Status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[Dashboard] Daten geladen:', {
            timesteps: data.timesteps?.length,
            rewards: data.mean_reward?.length
        });

        if (!data.timesteps || data.timesteps.length === 0) {
            throw new Error('Leere Trainingsdaten - JSON ist leer');
        }

        updateKPIs(data);
        updateChart(data);

        document.getElementById('error-container').innerHTML = '';
        previousData = data;

        console.log('[Dashboard] Update erfolgreich!');

    } catch (error) {
        console.error('[Dashboard] Fehler beim Laden:', error);

        // Zeige detaillierten Fehler
        const errorHTML = `
            <div class="error-box">
                <h3>⚠️ Dashboard Fehler</h3>
                <p style="color: #ff6b6b; font-family: monospace; margin: 12px 0;">
                    ${error.message}
                </p>
                <p style="margin-top: 16px;">Mögliche Lösungen:</p>
                <ol style="text-align: left; margin: 12px auto; max-width: 500px; line-height: 1.8;">
                    <li>Stelle sicher dass der Server läuft:<br>
                        <code style="background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px;">
                            start_server.bat
                        </code>
                    </li>
                    <li>Öffne die Browser-Konsole (F12) für Details</li>
                    <li>Stelle sicher du öffnest:<br>
                        <code style="background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px;">
                            http://localhost:8000/dashboard/
                        </code>
                    </li>
                    <li>Falls keine Daten: Führe aus:<br>
                        <code style="background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px;">
                            cd training && python reconstruct_from_models.py
                        </code>
                    </li>
                </ol>
                <p style="margin-top: 16px; color: #888;">
                    Current URL: ${window.location.href}
                </p>
            </div>
        `;

        document.getElementById('error-container').innerHTML = errorHTML;
    }
}

// =====================
// KPIs UPDATE
// =====================

function updateKPIs(data) {
    console.log('[updateKPIs] Starte Update mit Daten:', {
        timesteps_length: data.timesteps?.length,
        rewards_length: data.mean_reward?.length,
        episodes_length: data.episodes?.length
    });

    const timesteps = data.timesteps || [];
    const rewards = data.mean_reward || [];
    const episodes = data.episodes || [];

    // Aktuelle Werte (letzte Einträge)
    const currentTimesteps = timesteps[timesteps.length - 1] || 0;
    const currentReward = rewards[rewards.length - 1] || 0;
    const currentEpisodes = episodes[episodes.length - 1] || 0;
    const bestReward = Math.max(...rewards, 0);

    console.log('[updateKPIs] Berechnete Werte:', {
        currentTimesteps,
        currentReward,
        currentEpisodes,
        bestReward
    });

    // Update Timesteps
    const timestepsEl = document.getElementById('kpi-timesteps');
    console.log('[updateKPIs] Timesteps Element:', timestepsEl);
    if (timestepsEl) {
        timestepsEl.textContent = formatNumber(currentTimesteps);
        console.log('[updateKPIs] Timesteps gesetzt auf:', timestepsEl.textContent);
    } else {
        console.error('[updateKPIs] kpi-timesteps Element nicht gefunden!');
    }

    // Change Indicator für Timesteps
    if (previousData && previousData.timesteps.length > 0) {
        const prevTimesteps = previousData.timesteps[previousData.timesteps.length - 1];
        const diff = currentTimesteps - prevTimesteps;
        if (diff > 0) {
            document.getElementById('kpi-timesteps-change').textContent = `+${formatNumber(diff)} neu`;
            document.getElementById('kpi-timesteps-change').style.color = '#69db7c';
        }
    }

    // Update Episodes
    const episodesEl = document.getElementById('kpi-episodes');
    if (episodesEl) {
        episodesEl.textContent = currentEpisodes;
        console.log('[updateKPIs] Episodes gesetzt auf:', currentEpisodes);
    }

    // Update Current Reward
    const currentEl = document.getElementById('kpi-current');
    if (currentEl) {
        currentEl.textContent = currentReward.toFixed(2);
        console.log('[updateKPIs] Current Reward gesetzt auf:', currentReward.toFixed(2));
    }

    // Change Indicator für Reward
    if (previousData && previousData.mean_reward.length > 0) {
        const prevReward = previousData.mean_reward[previousData.mean_reward.length - 1];
        const diff = currentReward - prevReward;
        const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
        const color = diff > 0 ? '#69db7c' : diff < 0 ? '#ff6b6b' : '#888';

        document.getElementById('kpi-current-change').textContent = `${arrow} ${Math.abs(diff).toFixed(2)}`;
        document.getElementById('kpi-current-change').style.color = color;
    }

    // Update Best Reward
    const bestEl = document.getElementById('kpi-best');
    if (bestEl) {
        bestEl.textContent = bestReward.toFixed(2);
        console.log('[updateKPIs] Best Reward gesetzt auf:', bestReward.toFixed(2));
    }

    console.log('[updateKPIs] KPI Update abgeschlossen!');
}

// =====================
// CHART UPDATE
// =====================

function updateChart(data) {
    // === CHART 1: REWARD & STABILITY ===
    const ctx = document.getElementById('main-chart');

    if (mainChart) mainChart.destroy();

    const timesteps = data.timesteps || [];
    const meanRewards = data.mean_reward || [];
    const stdRewards = data.std_reward || [];

    // Berechne den oberen und unteren Rand für die Varianz (Schatten)
    const upperStd = meanRewards.map((v, i) => v + (stdRewards[i] || 0));
    const lowerStd = meanRewards.map((v, i) => v - (stdRewards[i] || 0));

    // Glättung
    const smoothedRewards = calculateMovingAverage(meanRewards, 5);

    mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timesteps,
            datasets: [
                {
                    label: 'Mean Reward (Smoothed)',
                    data: smoothedRewards,
                    borderColor: '#4dabf7', // Helles Blau
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'High Variance (+1 Std)',
                    data: upperStd,
                    borderColor: 'transparent',
                    backgroundColor: 'rgba(77, 171, 247, 0.2)', // Transparenter Schatten
                    fill: '+1', // Füllt bis zum nächsten Dataset (lowerStd)
                    pointRadius: 0,
                    tension: 0.4
                },
                {
                    label: 'Low Variance (-1 Std)',
                    data: lowerStd,
                    borderColor: 'transparent',
                    backgroundColor: 'transparent',
                    fill: false,
                    pointRadius: 0,
                    tension: 0.4
                }
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: '#ccc' } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if(context.dataset.label.includes('Variance')) return '';
                            return context.dataset.label + ': ' + context.raw.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                x: { display: false }, // X-Achse ausblenden um Platz zu sparen (Chart 2 hat sie)
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#888' },
                    title: { display: true, text: 'Reward Points', color: '#666' }
                }
            }
        }
    });

    // === CHART 2: EPISODE LENGTH ===
    const ctxLength = document.getElementById('length-chart');
    if (lengthChart) lengthChart.destroy();

    const lengths = data.mean_length || [];
    // Falls noch keine length daten da sind (altes Log), fülle mit 0
    const cleanLengths = lengths.length > 0 ? lengths : new Array(timesteps.length).fill(0);
    const smoothedLengths = calculateMovingAverage(cleanLengths, 5);

    lengthChart = new Chart(ctxLength, {
        type: 'line',
        data: {
            labels: timesteps,
            datasets: [{
                label: 'Avg Steps per Game',
                data: smoothedLengths,
                borderColor: '#ffd43b', // Gelb
                backgroundColor: 'rgba(255, 212, 59, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.2,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    ticks: { color: '#888', maxTicksLimit: 10, callback: (val, index) => formatNumber(timesteps[index]) },
                    grid: { display: false }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#888' },
                    title: { display: true, text: 'Steps', color: '#666' }
                }
            }
        }
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

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(0) + 'k';
    }
    return num.toString();
}

// =====================
// INIT
// =====================

window.addEventListener('DOMContentLoaded', () => {
    startAutoRefresh();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});
