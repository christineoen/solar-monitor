const HOUR_MS    = 60 * 60 * 1000;
const FIVE_MIN_MS = 5 * 60 * 1000;

function toMs(sqliteTimestamp) {
  return new Date(sqliteTimestamp.replace(' ', 'T') + 'Z').getTime();
}

function fmtTime(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const chart = new Chart(document.getElementById('chart').getContext('2d'), {
  type: 'line',
  data: {
    datasets: [
      {
        label: 'Panel Power (mW)',
        data: [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        yAxisID: 'yPower',
        tension: 0.2,
      },
      {
        label: 'Solar Irradiance (W/m²)',
        data: [],
        borderColor: '#f97316',
        backgroundColor: 'rgba(249,115,22,0.1)',
        yAxisID: 'yIrradiance',
        tension: 0.2,
      },
    ],
  },
  options: {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: {
        type: 'linear',
        min: Date.now() - HOUR_MS,
        max: Date.now(),
        ticks: {
          stepSize: FIVE_MIN_MS,
          callback: (value) => fmtTime(value),
        },
        title: { display: true, text: 'Time' },
      },
      yPower: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: 'Power (mW)' },
        beginAtZero: true,
      },
      yIrradiance: {
        type: 'linear',
        position: 'right',
        title: { display: true, text: 'Irradiance (W/m²)' },
        beginAtZero: true,
        grid: { drawOnChartArea: false },
      },
    },
  },
});

function updateChart(sensorReadings, weatherReadings) {
  const now = Date.now();
  chart.options.scales.x.min = now - HOUR_MS;
  chart.options.scales.x.max = now;

  chart.data.datasets[0].data = sensorReadings.map(r => ({ x: toMs(r.timestamp), y: r.power_mw }));
  chart.data.datasets[1].data = weatherReadings.map(r => ({ x: toMs(r.timestamp), y: r.irradiance_wm2 }));
  chart.update();
}

async function fetchChartData() {
  const [sRes, wRes] = await Promise.all([
    fetch('/history/sensor?minutes=60'),
    fetch('/history/weather?hours=2'),
  ]);
  const { readings: sensor } = await sRes.json();
  const { readings: weather } = await wRes.json();
  updateChart(sensor, weather);
}

function updateStatusIndicator(data) {
  const connected = data.last_esp32_contact !== null && data.last_esp32_contact < 90;
  document.getElementById('status-dot').className = 'dot ' + (connected ? 'dot-green' : 'dot-red');
  document.getElementById('status-text').textContent = connected ? 'Connected' : 'Disconnected';
  document.getElementById('disconnected-banner').style.display = connected ? 'none' : 'block';
}

function updateCards(data) {
  document.getElementById('val-power').textContent      = data.power_mw.toFixed(1);
  document.getElementById('val-voltage').textContent    = data.voltage_v.toFixed(2);
  document.getElementById('val-current').textContent    = data.current_ma.toFixed(1);
  document.getElementById('val-efficiency').textContent = (data.efficiency * 100).toFixed(1);
}

function updateAlertBanner(data) {
  document.getElementById('alert-banner').style.display = data.alert_active ? 'block' : 'none';
  if (data.alert_active) {
    document.getElementById('btn-clean').disabled = false;
  }
}

async function sendCommand(command) {
  if (command === 'clean') {
    document.getElementById('btn-clean').disabled = true;
  }
  await fetch('/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  });
}

async function fetchStatus() {
  const res = await fetch('/status');
  const data = await res.json();
  updateCards(data);
  updateStatusIndicator(data);
  updateAlertBanner(data);
}

fetchStatus();
setInterval(fetchStatus, 60000);

fetchChartData();
setInterval(fetchChartData, 30000);
