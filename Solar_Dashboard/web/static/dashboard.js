/*
  Same-style static dashboard.
  This file keeps the original dashboard HTML/CSS look, but replaces the Flask/Python endpoints with:
  HTML -> Supabase client -> sensor_readings / solar_commands.
*/

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const WEATHER_CACHE_MS = 15 * MINUTE_MS;
const CLEAN_TILT_DEG = 180;
const DEFAULT_PAN_DEG = 90;
const DEFAULT_TILT_DEG = 45;
const SERVO_MIN_DEG = 0;
const SERVO_MAX_DEG = 180;
const SERVO_MOVE_MS = 5000;
const COMMAND_PICKUP_DELAY_MS = 1000;
const CONTROL_SYNC_HOLD_MS = 8000;
const POWER_AXIS_MIN_MAX_MW = 10;
const DEMO_UPLOAD_INTERVAL_MS = 1000;
const DATA_RETENTION_MS = DAY_MS;
const CLEANUP_INTERVAL_MS = 5 * MINUTE_MS;
const PANEL_RATED_VOLTAGE = 6.0;
const PANEL_RATED_CURRENT_MA = 140.0;
const PANEL_RATED_POWER_MW = PANEL_RATED_VOLTAGE * PANEL_RATED_CURRENT_MA;
const REFERENCE_IRRADIANCE_WM2 = 1000.0;
const LDR_MAX_PERIOD_SEC = 24 * 60 * 60;
const ESP32_DIRECT_DESCRIPTION = 'ESP32 direct upload';
const BROWSER_DEMO_DESCRIPTION = 'Browser demo upload';
const ESP32_FRESH_SECONDS = 20;
const SOURCE_CONFLICT_PROMPT_COOLDOWN_MS = 30000;
const SENSOR_ZERO_PROGRESS_MS = 15000;

const DEMO_EFFICIENCY_PROFILES = {
  high: { min: 0.80, max: 0.90, label: 'High 80-90%' },
  medium: { min: 0.50, max: 0.80, label: 'Medium 50-80%' },
  low: { min: 0.25, max: 0.50, label: 'Low 25-50%' },
};

const DEMO_VARIATION_PROFILES = {
  low: { step: 0.025, noise: 0.015, label: 'Small fluctuation' },
  medium: { step: 0.070, noise: 0.040, label: 'Medium fluctuation' },
  high: { step: 0.150, noise: 0.080, label: 'Large fluctuation' },
};

const HISTORY_RANGES = {
  '5m': { minutes: 5, ms: 5 * MINUTE_MS, label: 'Last 5 minutes', resolution: 'second' },
  '60m': { minutes: 60, ms: HOUR_MS, label: 'Last 60 minutes', resolution: 'minute' },
  '6h': { minutes: 360, ms: 6 * HOUR_MS, label: 'Last 6 hours', resolution: 'minute' },
  '24h': { minutes: 1440, ms: DAY_MS, label: 'Last 24 hours', resolution: 'minute' },
};

const WEATHER_ASSETS = {
  clear: { file: 'clear_transparent.png', label: 'Sunny' },
  partly_cloudy: { file: 'partly_cloudy_transparent.png', label: 'Partly cloudy' },
  overcast: { file: 'overcast_transparent.png', label: 'Overcast' },
  fog: { file: 'fog_transparent.png', label: 'Fog' },
  light_rain: { file: 'light_rain_transparent.png', label: 'Light rain' },
  rain: { file: 'rain_transparent.png', label: 'Rain' },
  storm: { file: 'storm_transparent.png', label: 'Storm' },
  thunderstorm: { file: 'storm_transparent.png', label: 'Thunderstorm' },
  snow: { file: 'snow_transparent.png', label: 'Snow' },
  unknown: { file: 'partly_cloudy_transparent.png', label: 'Weather' },
};

const WEATHER_CODE_LABELS = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with heavy hail',
};

const WEATHER_CATEGORIES = {
  clear: { label: 'Sunny', codes: [0, 1] },
  partly_cloudy: { label: 'Partly cloudy', codes: [2] },
  overcast: { label: 'Overcast', codes: [3] },
  fog: { label: 'Fog', codes: [45, 48] },
  light_rain: { label: 'Light rain', codes: [51, 53, 55, 56, 57, 61, 80] },
  rain: { label: 'Rain', codes: [63, 65, 66, 67, 81, 82] },
  storm: { label: 'Thunderstorm', codes: [95, 96, 99] },
  snow: { label: 'Snow', codes: [71, 73, 75, 77, 85, 86] },
};

const WEATHER_LOCATIONS = {
  perth: { name: 'Perth', latitude: -31.95, longitude: 115.86, timezone: 'Australia/Perth' },
  sydney: { name: 'Sydney', latitude: -33.87, longitude: 151.21, timezone: 'Australia/Sydney' },
  melbourne: { name: 'Melbourne', latitude: -37.81, longitude: 144.96, timezone: 'Australia/Melbourne' },
  brisbane: { name: 'Brisbane', latitude: -27.47, longitude: 153.03, timezone: 'Australia/Brisbane' },
  adelaide: { name: 'Adelaide', latitude: -34.93, longitude: 138.60, timezone: 'Australia/Adelaide' },
  darwin: { name: 'Darwin', latitude: -12.46, longitude: 130.84, timezone: 'Australia/Darwin' },
  hobart: { name: 'Hobart', latitude: -42.88, longitude: 147.33, timezone: 'Australia/Hobart' },
  singapore: { name: 'Singapore', latitude: 1.35, longitude: 103.82, timezone: 'Asia/Singapore' },
  tokyo: { name: 'Tokyo', latitude: 35.68, longitude: 139.76, timezone: 'Asia/Tokyo' },
  dubai: { name: 'Dubai', latitude: 25.20, longitude: 55.27, timezone: 'Asia/Dubai' },
  london: { name: 'London', latitude: 51.51, longitude: -0.13, timezone: 'Europe/London' },
  new_york: { name: 'New York', latitude: 40.71, longitude: -74.01, timezone: 'America/New_York' },
  los_angeles: { name: 'Los Angeles', latitude: 34.05, longitude: -118.24, timezone: 'America/Los_Angeles' },
};

const BOARD_ASSETS = {
  neutral: { file: 'Fig_board_good.png', label: 'Solar panel normal status' },
  low: { file: 'Fig_board_good.png', label: 'Solar panel good status' },
  medium: { file: 'Fig_board_average.png', label: 'Solar panel average status' },
  high: { file: 'Fig_board_atrisk.png', label: 'Solar panel at risk status' },
  extreme: { file: 'Fig_board_highrisk.png', label: 'Solar panel high risk status' },
};

const $ = (id) => document.getElementById(id);
const elements = {
  actualFill: $('actual-fill'),
  alertBanner: $('alert-banner'),
  analysisActual: $('analysis-actual'),
  analysisDetail: $('analysis-detail'),
  analysisExpected: $('analysis-expected'),
  analysisRatioDisplay: $('analysis-ratio-display'),
  analysisTitle: $('analysis-title'),
  autoControlCard: $('auto-control-card'),
  autoButton: $('btn-auto'),
  chartCount: $('chart-count'),
  chartEmpty: $('chart-empty'),
  chartSubtitle: $('chart-subtitle'),
  cleanAlertButton: $('btn-clean-alert'),
  cleanButton: $('btn-clean-main'),
  clearHistoryButton: $('btn-clear-history'),
  commandStatus: $('command-status'),
  controlAngleDetail: $('control-angle-detail'),
  connectionPill: $('connection-pill'),
  controlPanDisplay: $('control-pan-display'),
  controlTiltDisplay: $('control-tilt-display'),
  devStatus: $('dev-status'),
  devPanelToggle: $('dev-panel-toggle'),
  devToolsBody: $('dev-tools-body'),
  devToggleButton: $('btn-dev-toggle'),
  disconnectedBanner: $('disconnected-banner'),
  esp32Angles: $('esp32-angles'),
  esp32Current: $('esp32-current'),
  esp32LdrDiff: $('esp32-ldr-diff'),
  esp32LdrRaw: $('esp32-ldr-raw'),
  esp32Mode: $('esp32-mode'),
  esp32Power: $('esp32-power'),
  esp32RawMeter: $('esp32-raw-meter'),
  esp32SupabaseStatus: $('esp32-supabase-status'),
  esp32UploadDetail: $('esp32-upload-detail'),
  esp32UploadDot: $('esp32-upload-dot'),
  esp32UploadState: $('esp32-upload-state'),
  esp32Voltage: $('esp32-voltage'),
  esp32ZeroBase: $('esp32-zero-base'),
  expectedFill: $('expected-fill'),
  ldrScheduleButton: $('btn-ldr-schedule'),
  ldrTrackingButton: $('btn-ldr-tracking'),
  ldrTrackingDetail: $('ldr-tracking-detail'),
  ldrTrackingDot: $('ldr-tracking-dot'),
  ldrTrackingPeriodInput: $('ldr-tracking-period'),
  ldrTrackingState: $('ldr-tracking-state'),
  ldrTrackingUnitSelect: $('ldr-tracking-unit'),
  lastContactText: $('last-contact-text'),
  localTime: $('state-local-time'),
  manualButton: $('btn-manual'),
  manualControlCard: $('manual-control-card'),
  manualModeButton: $('btn-manual-mode'),
  panOutput: $('pan-output'),
  panelControl: $('panel-control'),
  panSlider: $('pan-slider'),
  riskBadge: $('risk-badge'),
  riskSummary: $('risk-summary'),
  sensorZeroButton: $('btn-sensor-zero'),
  sensorZeroDetail: $('sensor-zero-detail'),
  sensorZeroDot: $('sensor-zero-dot'),
  sensorZeroProgress: $('sensor-zero-progress'),
  sensorZeroProgressFill: $('sensor-zero-progress-fill'),
  sensorZeroProgressText: $('sensor-zero-progress-text'),
  sensorZeroState: $('sensor-zero-state'),
  simUploadButton: $('btn-sim-upload'),
  simUploadDetail: $('sim-upload-detail'),
  simUploadDot: $('sim-upload-dot'),
  simEfficiencyProfile: $('sim-efficiency-profile'),
  simVariationProfile: $('sim-variation-profile'),
  simUploadState: $('sim-upload-state'),
  statusBoardImage: $('status-board-image'),
  statusDot: $('status-dot'),
  statusSummaryCard: $('status-summary-card'),
  statusText: $('status-text'),
  tiltClearButton: $('btn-tilt-clear'),
  tiltClearCard: $('tilt-clear-card'),
  tiltOutput: $('tilt-output'),
  tiltPhaseOneFill: $('tilt-phase-one-fill'),
  tiltPhaseOneLabel: $('tilt-phase-one-label'),
  tiltPhaseOnePercent: $('tilt-phase-one-percent'),
  tiltPhaseTwoFill: $('tilt-phase-two-fill'),
  tiltPhaseTwoLabel: $('tilt-phase-two-label'),
  tiltPhaseTwoPercent: $('tilt-phase-two-percent'),
  tiltProgressNote: $('tilt-progress-note'),
  tiltSlider: $('tilt-slider'),
  weatherImage: $('weather-image'),
  weatherLocationSelect: $('weather-location-select'),
  weatherLocationSummary: $('weather-location-summary'),
  weatherSource: $('weather-source'),
};

const fields = {
  cloud: $('val-cloud'),
  command: $('state-command'),
  current: $('val-current'),
  efficiency: $('val-efficiency'),
  efficiencyUnit: $('val-efficiency-unit'),
  expected: $('val-expected'),
  irradiance: $('val-irradiance'),
  maxPower: $('val-max-power'),
  mode: $('val-mode'),
  pan: $('state-pan'),
  power: $('val-power'),
  sunlight: $('state-sunlight'),
  sunlightSummary: $('state-sunlight-summary'),
  temperature: $('val-temperature'),
  tilt: $('state-tilt'),
  time: $('state-time'),
  voltage: $('val-voltage'),
  wattmeter: $('state-wattmeter'),
  weather: $('state-weather'),
  weatherCondition: $('state-weather-condition'),
  weatherLocation: $('state-weather-location'),
  wind: $('val-wind'),
};

let db = null;
let chart = null;
let activeRangeKey = '5m';
let latestRow = null;
let latestEsp32Row = null;
let latestCommand = null;
let browserDemoUploadEnabled = false;
let browserDemoTimer = null;
let demoEfficiencyState = null;
let lastEsp32ConflictPromptMs = 0;
let clearHistoryConfirmTimer = null;
let weatherCache = new Map();
let lastCleanupMs = 0;
let cleanModeActive = false;
let tiltClearActive = false;
let tiltClearSnapshot = null;
let tiltAnimationFrame = null;
let tiltDelayTimer = null;
let panelSliderEditing = false;
let panelSliderSyncHoldUntilMs = 0;
let controlPanelMode = 'auto';
let controlPanelModeInitialized = false;
let sensorZeroProgressStartedAt = 0;
let sensorZeroProgressFrame = null;
let devToolsOpen = false;

function setText(element, text) {
  if (element) element.textContent = text;
}

function setDevToolsOpen(open) {
  devToolsOpen = Boolean(open);
  if (elements.devToolsBody) elements.devToolsBody.hidden = !devToolsOpen;
  if (elements.devPanelToggle) elements.devPanelToggle.setAttribute('aria-expanded', String(devToolsOpen));
  if (elements.devToggleButton) elements.devToggleButton.textContent = devToolsOpen ? 'Hide' : 'Show';
}

function toggleDevTools() {
  setDevToolsOpen(!devToolsOpen);
}

function getDemoEfficiencyProfile() {
  const key = elements.simEfficiencyProfile?.value || 'medium';
  return DEMO_EFFICIENCY_PROFILES[key] || DEMO_EFFICIENCY_PROFILES.medium;
}

function getDemoVariationProfile() {
  const key = elements.simVariationProfile?.value || 'medium';
  return DEMO_VARIATION_PROFILES[key] || DEMO_VARIATION_PROFILES.medium;
}

function resetDemoEfficiencyState() {
  demoEfficiencyState = null;
}

function getDemoPerformanceRatio(expectedPower) {
  if (!Number.isFinite(expectedPower) || expectedPower <= 0) {
    resetDemoEfficiencyState();
    return 0;
  }

  const efficiency = getDemoEfficiencyProfile();
  const variation = getDemoVariationProfile();
  const center = (efficiency.min + efficiency.max) / 2;
  const span = efficiency.max - efficiency.min;

  if (!Number.isFinite(demoEfficiencyState)) {
    demoEfficiencyState = center + (Math.random() - 0.5) * span * 0.35;
  }

  const drift = (center - demoEfficiencyState) * 0.08;
  const randomWalk = (Math.random() - 0.5) * variation.step;
  const noise = (Math.random() - 0.5) * variation.noise;
  demoEfficiencyState = clamp(demoEfficiencyState + drift + randomWalk + noise, efficiency.min, efficiency.max);
  return demoEfficiencyState;
}

function updateSimulatorProfileText() {
  const efficiency = getDemoEfficiencyProfile();
  const variation = getDemoVariationProfile();
  const prefix = browserDemoUploadEnabled ? 'Uploading demo data' : 'Not uploading';
  setText(elements.simUploadState, prefix);
  setText(
    elements.simUploadDetail,
    browserDemoUploadEnabled
      ? `${efficiency.label}; ${variation.label}. ESP32 packets are ignored.`
      : `${efficiency.label}; ${variation.label}. For testing only.`
  );
}

function isSensorZeroProgressActive() {
  return sensorZeroProgressStartedAt > 0 && Date.now() - sensorZeroProgressStartedAt < SENSOR_ZERO_PROGRESS_MS;
}

function renderSensorZeroProgress() {
  if (!elements.sensorZeroProgress) return;

  if (!sensorZeroProgressStartedAt) {
    elements.sensorZeroProgress.hidden = true;
    if (elements.sensorZeroButton) elements.sensorZeroButton.disabled = false;
    return;
  }

  const elapsed = Date.now() - sensorZeroProgressStartedAt;
  const percent = clamp((elapsed / SENSOR_ZERO_PROGRESS_MS) * 100, 0, 100);
  elements.sensorZeroProgress.hidden = false;
  if (elements.sensorZeroProgressFill) elements.sensorZeroProgressFill.style.width = `${percent}%`;
  setText(elements.sensorZeroProgressText, `${Math.round(percent)}%`);
  if (elements.sensorZeroButton) elements.sensorZeroButton.disabled = percent < 100;

  if (percent < 100) {
    sensorZeroProgressFrame = requestAnimationFrame(renderSensorZeroProgress);
    return;
  }

  sensorZeroProgressStartedAt = 0;
  sensorZeroProgressFrame = null;
  if (elements.sensorZeroButton) elements.sensorZeroButton.disabled = false;
}

function startSensorZeroProgress() {
  if (sensorZeroProgressFrame) cancelAnimationFrame(sensorZeroProgressFrame);
  sensorZeroProgressStartedAt = Date.now();
  renderSensorZeroProgress();
}

function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || value === '') return '--';
  const number = Number(value);
  if (!Number.isFinite(number)) return '--';
  return number.toFixed(digits);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toMs(value) {
  if (!value) return Date.now();
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : Date.now();
}

function formatClock(ms, includeDate = false, includeSeconds = false) {
  if (!Number.isFinite(ms)) return '--';
  const options = includeDate
    ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { hour: '2-digit', minute: '2-digit' };
  if (includeSeconds) options.second = '2-digit';
  return new Date(ms).toLocaleString([], options);
}

function formatAge(seconds) {
  if (seconds === null || seconds === undefined) return 'never';
  if (seconds < 60) return `${seconds.toFixed(1)}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  return `${Math.round(seconds / 3600)}h ago`;
}

function setBarWidth(element, percent) {
  if (!element) return;
  element.style.width = `${clamp(percent, 0, 100)}%`;
}

function setHidden(element, hidden) {
  if (!element) return;
  element.hidden = hidden;
  if (hidden) {
    element.setAttribute('hidden', '');
    element.style.display = 'none';
  } else {
    element.removeAttribute('hidden');
    element.style.display = '';
  }
}

function getActiveReadingSource() {
  return browserDemoUploadEnabled ? BROWSER_DEMO_DESCRIPTION : ESP32_DIRECT_DESCRIPTION;
}

function sourceLabel(source = getActiveReadingSource()) {
  return source === BROWSER_DEMO_DESCRIPTION ? 'Simulator' : 'ESP32';
}

function getConfig() {
  if (!window.SOLAR_CONFIG) throw new Error('Missing web/config.js');
  const { SUPABASE_URL, SUPABASE_KEY } = window.SOLAR_CONFIG;
  if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
    throw new Error('Please update web/config.js with your Supabase URL and anon key.');
  }
  return { SUPABASE_URL, SUPABASE_KEY };
}

function getPowerMw(row) {
  if (!row) return null;
  if (row.actual_power_mw !== null && row.actual_power_mw !== undefined) return Number(row.actual_power_mw);
  if (row.power_mw !== null && row.power_mw !== undefined) return Number(row.power_mw);
  const v = Number(row.voltage_v);
  const ma = Number(row.current_ma);
  if (Number.isFinite(v) && Number.isFinite(ma)) return v * ma;
  return null;
}

function getSelectedLocationKey() {
  return elements.weatherLocationSelect?.value || 'perth';
}

function getLocation(locationKey = getSelectedLocationKey()) {
  return WEATHER_LOCATIONS[locationKey] || WEATHER_LOCATIONS.perth;
}

function populateLocationSelect() {
  if (!elements.weatherLocationSelect) return;
  const selected = elements.weatherLocationSelect.value || 'perth';
  elements.weatherLocationSelect.innerHTML = '';
  Object.entries(WEATHER_LOCATIONS).forEach(([key, location]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = location.name;
    elements.weatherLocationSelect.appendChild(option);
  });
  elements.weatherLocationSelect.value = WEATHER_LOCATIONS[selected] ? selected : 'perth';
}

function weatherDescriptionFromCode(code) {
  const parsed = Number(code);
  return Number.isFinite(parsed) ? WEATHER_CODE_LABELS[parsed] || 'Unknown' : 'Unknown';
}

function weatherCategoryFromCode(code) {
  const parsed = Number(code);
  if (!Number.isFinite(parsed)) return { category: 'unknown', label: 'Weather' };
  for (const [category, config] of Object.entries(WEATHER_CATEGORIES)) {
    if (config.codes.includes(parsed)) return { category, label: config.label };
  }
  return { category: 'unknown', label: 'Weather' };
}

function getLocationParts(timezone, date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  return formatter.formatToParts(date).reduce((parts, item) => {
    if (item.type !== 'literal') parts[item.type] = item.value;
    return parts;
  }, {});
}

function getLocationHourKey(timezone, date = new Date()) {
  const parts = getLocationParts(timezone, date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:00`;
}

function formatLocationTime(timezone, date = new Date()) {
  try {
    return new Intl.DateTimeFormat([], {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch (error) {
    return formatClock(date.getTime());
  }
}

function calculateExpectedPowerMw(irradiance) {
  const value = Number(irradiance);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return PANEL_RATED_POWER_MW * value / REFERENCE_IRRADIANCE_WM2;
}

function calculateEfficiencyPercent(actualPower, expectedPower) {
  const actual = Number(actualPower);
  const expected = Number(expectedPower);
  if (!Number.isFinite(actual)) return null;
  if (!Number.isFinite(expected) || expected <= 0) return 0;
  return Math.max(0, actual) / expected * 100;
}

async function fetchWeatherForLocation(locationKey = getSelectedLocationKey(), force = false) {
  const cached = weatherCache.get(locationKey);
  const now = Date.now();
  if (!force && cached && now - cached.fetchedAtMs < WEATHER_CACHE_MS) return cached;

  const location = getLocation(locationKey);
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    hourly: 'shortwave_radiation,temperature_2m,cloud_cover,wind_speed_10m,weather_code',
    timezone: location.timezone,
    wind_speed_unit: 'kmh',
    past_days: '1',
    forecast_days: '2',
  });

  try {
    const response = await fetch(`${OPEN_METEO_URL}?${params.toString()}`);
    if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
    const data = await response.json();
    const weather = {
      ok: true,
      locationKey,
      location,
      hourly: data.hourly || {},
      fetchedAtMs: now,
      error: '',
    };
    weatherCache.set(locationKey, weather);
    return weather;
  } catch (error) {
    const fallback = {
      ok: false,
      locationKey,
      location,
      hourly: {},
      fetchedAtMs: now,
      error: error.message || 'weather unavailable',
    };
    weatherCache.set(locationKey, fallback);
    return fallback;
  }
}

function getWeatherAt(weather, ms = Date.now()) {
  const location = weather?.location || getLocation(weather?.locationKey);
  const hourly = weather?.hourly || {};
  const times = hourly.time || [];
  const key = getLocationHourKey(location.timezone, new Date(ms));
  let index = times.indexOf(key);
  if (index < 0) {
    index = 0;
    for (let i = 0; i < times.length; i += 1) {
      if (times[i] <= key) index = i;
    }
  }

  const pick = (field, fallback = null) => {
    const values = hourly[field] || [];
    const value = values[index];
    return value === undefined || value === null ? fallback : value;
  };

  const weatherCode = pick('weather_code', null);
  const category = weatherCategoryFromCode(weatherCode);
  const irradiance = Math.max(0, Number(pick('shortwave_radiation', 0)) || 0);
  return {
    location_key: weather?.locationKey || getSelectedLocationKey(),
    location_name: location.name,
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: location.timezone,
    irradiance_wm2: irradiance,
    temperature_c: pick('temperature_2m', null),
    cloud_cover_pct: pick('cloud_cover', null),
    wind_speed_kmh: pick('wind_speed_10m', null),
    weather_code: weatherCode,
    weather_category: category.category,
    weather_category_label: category.label,
    weather_description: weatherDescriptionFromCode(weatherCode),
    weather_source_connected: Boolean(weather?.ok),
    weather_error: weather?.error || '',
    weather_fetched_at_ms: weather?.fetchedAtMs || null,
  };
}

function buildDisplayRow(row, weather, ms = Date.now()) {
  const weatherAt = getWeatherAt(weather, ms);
  if (!weatherAt.weather_source_connected && row) {
    const storedIrradiance = Number(row.irradiance_wm2);
    if (Number.isFinite(storedIrradiance)) weatherAt.irradiance_wm2 = Math.max(0, storedIrradiance);
    weatherAt.temperature_c = row.temperature_c ?? weatherAt.temperature_c;
    weatherAt.cloud_cover_pct = row.cloud_cover_pct ?? weatherAt.cloud_cover_pct;
    weatherAt.wind_speed_kmh = row.wind_speed_kmh ?? weatherAt.wind_speed_kmh;
    weatherAt.weather_code = row.weather_code ?? weatherAt.weather_code;
    weatherAt.weather_category = row.weather_category || weatherAt.weather_category;
    weatherAt.weather_category_label = row.weather_category_label || weatherAt.weather_category_label;
    weatherAt.weather_description = row.weather_description || weatherAt.weather_description;
  }
  const actualPowerRaw = getPowerMw(row);
  const actualPower = Number.isFinite(actualPowerRaw) ? Math.max(0, actualPowerRaw) : null;
  const expectedPower = calculateExpectedPowerMw(weatherAt.irradiance_wm2);
  const efficiencyPercent = calculateEfficiencyPercent(actualPower, expectedPower);
  const pan = row?.pan_deg ?? row?.servo_1_deg ?? row?.servo_horizontal ?? latestCommand?.target_pan_deg ?? DEFAULT_PAN_DEG;
  const tilt = row?.tilt_deg ?? row?.servo_2_deg ?? row?.servo_vertical ?? latestCommand?.target_tilt_deg ?? DEFAULT_TILT_DEG;

  return {
    ...(row || {}),
    ...weatherAt,
    timestamp: row?.created_at || null,
    created_at: row?.created_at || null,
    voltage_v: row?.voltage_v ?? null,
    current_ma: row?.current_ma ?? null,
    power_mw: actualPower,
    actual_power_mw: actualPower,
    expected_power_mw: expectedPower,
    efficiency_percent: efficiencyPercent,
    efficiency: Number.isFinite(efficiencyPercent) ? efficiencyPercent / 100 : null,
    pan_deg: pan,
    tilt_deg: tilt,
    mode: row?.mode || latestCommand?.mode || 'auto',
  };
}

function normaliseRow(row) {
  if (!row) return null;
  return buildDisplayRow(row, null, toMs(row.created_at));
}

function getSunlightLabel(irradiance) {
  const value = Number(irradiance);
  if (!Number.isFinite(value)) return '--';
  if (value <= 1) return 'No sunlight';
  if (value < 200) return 'Low sunlight';
  if (value < 600) return 'Moderate sunlight';
  return 'Strong sunlight';
}

function getOutputRatioDisplay(value, irradiance) {
  const sunlight = Number(irradiance);
  if (Number.isFinite(sunlight) && sunlight <= 1) return 'Night mode';
  const ratio = Number(value);
  if (!Number.isFinite(ratio)) return 'No data';
  return `${formatNumber(ratio, 1)}%`;
}

function getOutputRiskBand(percent) {
  const ratio = Number(percent);
  if (!Number.isFinite(ratio)) {
    return { level: 'neutral', label: 'No risk', title: 'No comparison yet.', detail: 'Waiting for irradiance and power data.' };
  }
  if (ratio < 25) return { level: 'extreme', label: 'Extreme risk', title: 'Output is critically low', detail: 'Check shading, dirt, angle, or wiring.' };
  if (ratio < 50) return { level: 'high', label: 'At risk', title: 'Output is low', detail: 'Inspect shading, surface, angle, or wiring.' };
  if (ratio < 75) return { level: 'medium', label: 'Average', title: 'Below ideal range', detail: 'Monitor light, angle, and panel surface.' };
  return { level: 'low', label: 'Good', title: 'Operating normally', detail: 'Actual output is close to the estimate.' };
}

function setRiskState(level, label) {
  if (elements.riskBadge) {
    elements.riskBadge.className = `risk-badge risk-${level}`;
    elements.riskBadge.textContent = label;
  }
  setText(elements.riskSummary, label);
  if (elements.statusBoardImage) {
    const asset = BOARD_ASSETS[level] || BOARD_ASSETS.neutral;
    elements.statusBoardImage.src = `figure/${asset.file}`;
    elements.statusBoardImage.alt = asset.label;
  }
  if (elements.analysisRatioDisplay) {
    elements.analysisRatioDisplay.className = `summary-value output-ratio-value ratio-${level}`;
  }
  if (elements.statusSummaryCard) {
    elements.statusSummaryCard.className = `weather-summary-card status-summary-card status-${level}`;
  }
}

function updateSliderOutputs() {
  setText(elements.panOutput, `${elements.panSlider?.value ?? DEFAULT_PAN_DEG} deg`);
  setText(elements.tiltOutput, `${elements.tiltSlider?.value ?? DEFAULT_TILT_DEG} deg`);
}

function markPanelSliderEditing() {
  panelSliderEditing = true;
  panelSliderSyncHoldUntilMs = Date.now() + CONTROL_SYNC_HOLD_MS;
}

function releasePanelSliderEditing() {
  panelSliderEditing = false;
  panelSliderSyncHoldUntilMs = Date.now() + CONTROL_SYNC_HOLD_MS;
}

function canSyncPanelSliders() {
  if (panelSliderEditing) return false;
  if (Date.now() < panelSliderSyncHoldUntilMs) return false;
  if (document.activeElement === elements.panSlider || document.activeElement === elements.tiltSlider) return false;
  return true;
}

function getSliderAngles() {
  const pan = Number(elements.panSlider?.value ?? DEFAULT_PAN_DEG);
  const tilt = Number(elements.tiltSlider?.value ?? DEFAULT_TILT_DEG);
  return {
    pan: Number.isFinite(pan) ? Math.round(pan) : DEFAULT_PAN_DEG,
    tilt: Number.isFinite(tilt) ? Math.round(tilt) : DEFAULT_TILT_DEG,
  };
}

function commandIsFreshForControl(row) {
  const mode = latestCommand?.mode;
  if (!['manual', 'baseline', 'reset_baseline', 'tilt_clear_start', 'tilt_clear_reset'].includes(mode)) return false;
  const commandMs = toMs(latestCommand?.updated_at);
  if (!Number.isFinite(commandMs)) return false;
  const rowMs = toMs(row?.created_at);
  if (!Number.isFinite(rowMs)) return true;
  return commandMs >= rowMs || Date.now() - commandMs < SERVO_MOVE_MS + COMMAND_PICKUP_DELAY_MS + 3000;
}

function getPanelControlAngles(row) {
  if (commandIsFreshForControl(row)) {
    const commandPan = Number(latestCommand?.target_pan_deg);
    const commandTilt = Number(latestCommand?.target_tilt_deg);
    if (Number.isFinite(commandPan) && Number.isFinite(commandTilt)) {
      return { pan: commandPan, tilt: commandTilt };
    }
  }
  const pan = row?.pan_deg ?? latestCommand?.target_pan_deg ?? DEFAULT_PAN_DEG;
  const tilt = row?.tilt_deg ?? latestCommand?.target_tilt_deg ?? DEFAULT_TILT_DEG;
  return { pan, tilt };
}

function isFreshEsp32Row(row, maxAgeSec = ESP32_FRESH_SECONDS) {
  if (!row?.created_at) return false;
  return (Date.now() - toMs(row.created_at)) / 1000 <= maxAgeSec;
}

function hasFreshEsp32Row(row) {
  return isFreshEsp32Row(row, ESP32_FRESH_SECONDS);
}

function updateWeatherVisual(row) {
  const category = row?.weather_category || 'unknown';
  const asset = WEATHER_ASSETS[category] || WEATHER_ASSETS.unknown;
  if (elements.weatherImage) {
    elements.weatherImage.src = `figure/${asset.file}`;
    elements.weatherImage.alt = row?.weather_category_label || row?.weather_description || asset.label;
  }
  setText(fields.weatherCondition, row?.weather_category_label || row?.weather_description || asset.label);
  setText(elements.weatherLocationSummary, row?.location_name || 'Perth');
}

function createChart() {
  if (!window.Chart || !$('chart')) return;
  const ctx = $('chart');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Actual Power',
          data: [],
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.10)',
          borderWidth: 3,
          tension: 0.35,
          pointRadius: 1.5,
          yAxisID: 'yPower',
        },
        {
          label: 'Theoretical Output',
          data: [],
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.06)',
          borderWidth: 2,
          borderDash: [6, 5],
          tension: 0.35,
          pointRadius: 0,
          yAxisID: 'yPower',
        },
        {
          label: 'Efficiency',
          data: [],
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.12)',
          pointRadius: 3,
          borderWidth: 2,
          yAxisID: 'yEfficiency',
          tension: 0.25,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title(items) {
              const value = items?.[0]?.parsed?.x;
              return formatClock(value, true, true);
            },
            label(item) {
              const unit = item.dataset.yAxisID === 'yEfficiency' ? '%' : ' mW';
              return `${item.dataset.label}: ${formatNumber(item.parsed.y, 1)}${unit}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          ticks: {
            callback(value) { return formatClock(Number(value)); },
            maxTicksLimit: 6,
          },
          grid: { display: false },
        },
        yPower: {
          position: 'left',
          beginAtZero: true,
          suggestedMax: POWER_AXIS_MIN_MAX_MW,
          ticks: { color: '#2563eb', font: { weight: 700 } },
          title: { display: true, text: 'Power (mW)', color: '#2563eb', font: { weight: 800 } },
        },
        yEfficiency: {
          position: 'right',
          beginAtZero: true,
          suggestedMax: 100,
          ticks: { color: '#f97316', font: { weight: 700 } },
          title: { display: true, text: 'Efficiency (%)', color: '#f97316', font: { weight: 800 } },
          grid: { drawOnChartArea: false },
        },
      },
    },
  });
}

function updateChart(rows) {
  if (!chart) return;
  const range = HISTORY_RANGES[activeRangeKey];
  const now = Date.now();
  const readings = (rows || []).filter(Boolean);
  const maxPower = readings.reduce((max, reading) => {
    const actual = Number(reading.power_mw);
    const expected = Number(reading.expected_power_mw);
    return Math.max(
      max,
      Number.isFinite(actual) ? actual : 0,
      Number.isFinite(expected) ? expected : 0
    );
  }, POWER_AXIS_MIN_MAX_MW);

  chart.options.scales.x.min = now - range.ms;
  chart.options.scales.x.max = now;
  chart.options.scales.yPower.suggestedMax = Math.max(POWER_AXIS_MIN_MAX_MW, maxPower * 1.15);
  chart.data.datasets[0].data = readings.map((r) => ({ x: toMs(r.created_at), y: r.power_mw }));
  chart.data.datasets[1].data = readings
    .filter((r) => r.expected_power_mw !== null && r.expected_power_mw !== undefined)
    .map((r) => ({ x: toMs(r.created_at), y: Number(r.expected_power_mw) }));
  chart.data.datasets[2].data = readings
    .map((r) => ({ x: toMs(r.created_at), y: Number(r.efficiency_percent) }))
    .filter((p) => Number.isFinite(p.y));
  chart.update('none');

  const count = readings.length;
  setText(elements.chartCount, `${count} ${count === 1 ? 'reading' : 'readings'}`);
  setText(elements.chartSubtitle, range.label);
  if (elements.chartEmpty) elements.chartEmpty.style.display = count === 0 ? 'flex' : 'none';
}

async function fetchCommand() {
  const { data, error } = await db
    .from('solar_commands')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  latestCommand = data || {
    id: 1,
    mode: 'auto',
    target_pan_deg: DEFAULT_PAN_DEG,
    target_tilt_deg: DEFAULT_TILT_DEG,
    ldr_tracking_enabled: false,
    tracking_period_sec: 0,
  };
  return latestCommand;
}

async function fetchLatestReading(locationKey = null, source = getActiveReadingSource()) {
  let query = db
    .from('sensor_readings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);
  if (locationKey) query = query.eq('location_key', locationKey);
  if (source) query = query.eq('weather_description', source);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
}

async function fetchLatestEsp32Reading() {
  const { data, error } = await db
    .from('sensor_readings')
    .select('*')
    .eq('weather_description', ESP32_DIRECT_DESCRIPTION)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

function aggregateRowsByMinute(rows) {
  const buckets = new Map();
  (rows || []).forEach((row) => {
    const ms = toMs(row.created_at);
    const bucketMs = Math.floor(ms / MINUTE_MS) * MINUTE_MS;
    if (!buckets.has(bucketMs)) buckets.set(bucketMs, []);
    buckets.get(bucketMs).push(row);
  });

  return [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([bucketMs, bucketRows]) => {
    const latest = bucketRows[bucketRows.length - 1] || {};
    const average = (field) => {
      const values = bucketRows.map((row) => Number(row[field])).filter(Number.isFinite);
      return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    };
    return {
      ...latest,
      created_at: new Date(bucketMs).toISOString(),
      voltage_v: average('voltage_v'),
      current_ma: average('current_ma'),
      actual_power_mw: average('actual_power_mw') ?? average('power_mw'),
      power_mw: average('power_mw') ?? average('actual_power_mw'),
      pan_deg: average('pan_deg') ?? average('servo_1_deg') ?? latest.pan_deg,
      tilt_deg: average('tilt_deg') ?? average('servo_2_deg') ?? latest.tilt_deg,
      servo_1_deg: average('servo_1_deg') ?? average('pan_deg') ?? latest.servo_1_deg,
      servo_2_deg: average('servo_2_deg') ?? average('tilt_deg') ?? latest.servo_2_deg,
    };
  });
}

async function fetchHistoryRows(locationKey = getSelectedLocationKey()) {
  const range = HISTORY_RANGES[activeRangeKey];
  const sinceIso = new Date(Date.now() - range.ms).toISOString();
  const stableCutoffIso = new Date(Date.now() - 1000).toISOString();
  const source = getActiveReadingSource();

  const pageSize = range.resolution === 'second' ? 1200 : 5000;
  const maxRows = range.resolution === 'second' ? 1200 : 90000;
  const rows = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const to = Math.min(from + pageSize - 1, maxRows - 1);
    const { data, error } = await db
      .from('sensor_readings')
      .select('*')
      .gte('created_at', sinceIso)
      .lte('created_at', stableCutoffIso)
      .eq('location_key', locationKey)
      .eq('weather_description', source)
      .order('created_at', { ascending: true })
      .range(from, to);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return range.resolution === 'minute' ? aggregateRowsByMinute(rows) : rows;
}

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function sunriseForUtcDate(latitude, longitude, utcDate) {
  const start = Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
  const dayStart = new Date(start);
  const day = Math.floor((start - Date.UTC(dayStart.getUTCFullYear(), 0, 0)) / DAY_MS);
  const lngHour = longitude / 15.0;
  const t = day + ((6 - lngHour) / 24);
  const meanAnomaly = (0.9856 * t) - 3.289;
  const trueLongitude = normalizeDegrees(
    meanAnomaly
    + (1.916 * Math.sin(meanAnomaly * Math.PI / 180))
    + (0.020 * Math.sin(2 * meanAnomaly * Math.PI / 180))
    + 282.634
  );
  let rightAscension = Math.atan(0.91764 * Math.tan(trueLongitude * Math.PI / 180)) * 180 / Math.PI;
  rightAscension = normalizeDegrees(rightAscension);
  rightAscension += (Math.floor(trueLongitude / 90) * 90) - (Math.floor(rightAscension / 90) * 90);
  rightAscension /= 15;
  const sinDeclination = 0.39782 * Math.sin(trueLongitude * Math.PI / 180);
  const cosDeclination = Math.cos(Math.asin(sinDeclination));
  const cosHour = (
    Math.cos(90.833 * Math.PI / 180)
    - (sinDeclination * Math.sin(latitude * Math.PI / 180))
  ) / (cosDeclination * Math.cos(latitude * Math.PI / 180));
  if (cosHour > 1 || cosHour < -1) return null;
  const hourAngle = (360 - (Math.acos(cosHour) * 180 / Math.PI)) / 15;
  const localMeanTime = hourAngle + rightAscension - (0.06571 * t) - 6.622;
  const utcHour = (localMeanTime - lngHour + 24) % 24;
  return new Date(start + utcHour * HOUR_MS);
}

function localDateKey(timezone, date) {
  const parts = getLocationParts(timezone, date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function todaySunriseUtc(location) {
  const now = new Date();
  const parts = getLocationParts(location.timezone, now);
  const localBase = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  const targetDateKey = `${parts.year}-${parts.month}-${parts.day}`;
  for (const offset of [-1, 0, 1]) {
    const utcDate = new Date(localBase + offset * DAY_MS);
    const sunrise = sunriseForUtcDate(location.latitude, location.longitude, utcDate);
    if (sunrise && localDateKey(location.timezone, sunrise) === targetDateKey) return sunrise;
  }
  return new Date(Date.now() - 12 * HOUR_MS);
}

async function fetchBestPowerToday(locationKey = getSelectedLocationKey()) {
  const location = getLocation(locationKey);
  const sinceIso = todaySunriseUtc(location).toISOString();
  const { data, error } = await db
    .from('sensor_readings')
    .select('actual_power_mw,power_mw,voltage_v,current_ma')
    .eq('location_key', locationKey)
    .eq('weather_description', getActiveReadingSource())
    .gte('created_at', sinceIso)
    .order('actual_power_mw', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return getPowerMw(data);
}

async function cleanupOldReadings() {
  const now = Date.now();
  if (now - lastCleanupMs < CLEANUP_INTERVAL_MS) return;
  lastCleanupMs = now;
  const cutoffIso = new Date(now - DATA_RETENTION_MS).toISOString();
  const { error } = await db.from('sensor_readings').delete().lt('created_at', cutoffIso);
  if (error) console.warn('old reading cleanup failed:', error.message);
}

function updateConnection(row) {
  const hasData = Boolean(row?.created_at);
  const ageSec = hasData ? (Date.now() - toMs(row.created_at)) / 1000 : null;
  const connected = isFreshEsp32Row(row);
  if (browserDemoUploadEnabled) {
    if (elements.statusDot) elements.statusDot.className = 'dot dot-green';
    if (elements.connectionPill) elements.connectionPill.className = 'status-pill status-pill-ok';
    setText(elements.statusText, 'Simulator active');
    if (elements.disconnectedBanner) elements.disconnectedBanner.style.display = 'none';
    setText(elements.lastContactText, 'Dashboard is using Simulator data. ESP32 packets are ignored until Simulator stops.');
    return;
  }

  if (elements.statusDot) elements.statusDot.className = `dot ${connected ? 'dot-green' : 'dot-red'}`;
  if (elements.connectionPill) elements.connectionPill.className = `status-pill ${connected ? 'status-pill-ok' : 'status-pill-error'}`;
  setText(elements.statusText, connected ? 'ESP32 connected' : 'No fresh ESP32 packet');

  if (elements.disconnectedBanner) elements.disconnectedBanner.style.display = connected ? 'none' : 'flex';
  setText(
    elements.lastContactText,
    hasData ? `Last ESP32 packet ${formatAge(ageSec)}. Wi-Fi may be connected, but Supabase has no fresh packet.` : 'No ESP32 data has been received yet.'
  );
}

function updateCards(row, bestPowerToday) {
  const outputRatio = Number(row?.efficiency_percent);
  const outputRatioValid = Number.isFinite(outputRatio);
  const noSunlight = Number.isFinite(Number(row?.irradiance_wm2)) && Number(row.irradiance_wm2) <= 1;
  const outputRatioText = noSunlight ? 'Night' : outputRatioValid ? formatNumber(outputRatio, 1) : 'No data';
  const outputRatioUnit = !noSunlight && outputRatioValid ? '%' : '';
  setText(fields.power, formatNumber(row?.power_mw, 1));
  setText(fields.voltage, formatNumber(row?.voltage_v, 2));
  setText(fields.current, formatNumber(row?.current_ma, 1));
  setText(fields.efficiency, outputRatioText);
  setText(fields.efficiencyUnit, outputRatioUnit);
  fields.efficiency?.classList.toggle('metric-text-value', outputRatioUnit === '');
  setText(fields.expected, formatNumber(row?.expected_power_mw, 1));
  setText(fields.irradiance, formatNumber(row?.irradiance_wm2, 0));
  setText(fields.temperature, formatNumber(row?.temperature_c, 1));
  setText(fields.cloud, formatNumber(row?.cloud_cover_pct, 0));
  setText(fields.wind, formatNumber(row?.wind_speed_kmh, 1));
  setText(fields.maxPower, Number.isFinite(bestPowerToday) ? formatNumber(bestPowerToday, 1) : '--');
  setText(fields.mode, row?.mode || latestCommand?.mode || '--');
  const sunlightLabel = getSunlightLabel(row?.irradiance_wm2);
  setText(fields.sunlight, sunlightLabel);
  setText(fields.sunlightSummary, sunlightLabel);
}

function updateSystemState(row) {
  const hasSensorData = Boolean(row?.created_at);
  const pan = row?.pan_deg ?? latestCommand?.target_pan_deg ?? DEFAULT_PAN_DEG;
  const tilt = row?.tilt_deg ?? latestCommand?.target_tilt_deg ?? DEFAULT_TILT_DEG;
  setText(fields.pan, formatNumber(pan, 0));
  setText(fields.tilt, formatNumber(tilt, 0));
  setText(fields.wattmeter, hasSensorData ? 'Connected' : 'No data');
  if (fields.wattmeter) fields.wattmeter.className = hasSensorData ? 'state-connected' : 'state-empty';
  setText(fields.time, 'browser');
  setText(fields.command, latestCommand?.mode || 'none');
  setText(fields.weather, row?.weather_fetched_at_ms ? formatClock(row.weather_fetched_at_ms) : '--');
  setText(elements.localTime, formatLocationTime(row?.timezone || getLocation().timezone));
  setText(fields.weatherLocation, row?.location_name || 'Perth');
  setText(elements.weatherSource, row?.weather_source_connected ? 'Open-Meteo connected' : 'No data source');
  if (elements.weatherSource) elements.weatherSource.className = row?.weather_source_connected ? 'source-connected' : 'source-empty';
  updateWeatherVisual(row);

  if (!tiltClearActive && !cleanModeActive && canSyncPanelSliders()) {
    const controlAngles = getPanelControlAngles(row);
    if (elements.panSlider) elements.panSlider.value = String(Math.round(controlAngles.pan));
    if (elements.tiltSlider) elements.tiltSlider.value = String(Math.round(controlAngles.tilt));
  }
  updateSliderOutputs();
}

function updateEsp32DirectUpload(row) {
  const hasData = Boolean(row?.created_at);
  const ageSec = hasData ? (Date.now() - toMs(row.created_at)) / 1000 : null;
  const connected = isFreshEsp32Row(row);
  if (browserDemoUploadEnabled) {
    if (elements.esp32UploadDot) elements.esp32UploadDot.className = 'dot dot-red';
    setText(elements.esp32UploadState, connected ? 'Paused by Simulator' : 'ESP32 inactive');
    setText(
      elements.esp32UploadDetail,
      connected
        ? `Fresh ESP32 packet ${formatAge(ageSec)}, but Simulator is the active data source.`
        : 'Simulator is active. ESP32 direct data is ignored until Simulator stops.'
    );
    setText(elements.esp32Voltage, '--');
    setText(elements.esp32Current, '--');
    setText(elements.esp32Power, '--');
    setText(elements.esp32RawMeter, '--');
    setText(elements.esp32ZeroBase, '--');
    setText(elements.esp32Angles, '--');
    setText(elements.esp32SupabaseStatus, connected ? 'ESP32 ignored' : 'No ESP32 data');
    if (elements.esp32SupabaseStatus) elements.esp32SupabaseStatus.className = 'state-empty';
    setText(elements.esp32Mode, '--');
    setText(elements.esp32LdrDiff, '--');
    setText(elements.esp32LdrRaw, '--');
    return;
  }
  const displayRow = connected ? row : null;

  if (elements.esp32UploadDot) elements.esp32UploadDot.className = `dot ${connected ? 'dot-green' : 'dot-red'}`;
  setText(elements.esp32UploadState, connected ? 'Receiving data' : 'No fresh ESP32 packet');
  setText(
    elements.esp32UploadDetail,
    hasData
      ? `Last ESP32 packet ${formatAge(ageSec)}. Wi-Fi alone is not enough; this panel needs fresh Supabase packets. Browser simulator data is ignored here.`
      : 'Waiting for ESP32 upload to Supabase. Browser simulator data is ignored here.'
  );
  setText(elements.esp32Voltage, formatNumber(displayRow?.voltage_v, 2));
  setText(elements.esp32Current, formatNumber(displayRow?.current_ma, 1));
  setText(elements.esp32Power, formatNumber(displayRow?.power_mw, 1));
  setText(elements.esp32RawMeter, formatNumber(displayRow?.raw_meter_voltage_v, 3));
  setText(elements.esp32ZeroBase, displayRow?.sensor_zero_ready ? `${formatNumber(displayRow?.current_baseline_ma, 1)} mA` : '--');
  setText(elements.esp32Angles, displayRow ? `${formatNumber(displayRow?.pan_deg, 0)} / ${formatNumber(displayRow?.tilt_deg, 0)} deg` : '--');
  setText(elements.esp32SupabaseStatus, connected ? 'Supabase connected' : 'No ESP32 data');
  if (elements.esp32SupabaseStatus) elements.esp32SupabaseStatus.className = connected ? 'state-connected' : 'state-empty';
  setText(elements.esp32Mode, displayRow?.mode || '--');
  setText(elements.esp32LdrDiff, displayRow ? `LR ${formatNumber(displayRow?.ldr_horizontal_diff, 0)} / UD ${formatNumber(displayRow?.ldr_vertical_diff, 0)}` : '--');
  setText(elements.esp32LdrRaw, displayRow ? `LU ${formatNumber(displayRow?.ldr_left_up, 0)} RU ${formatNumber(displayRow?.ldr_right_up, 0)} LD ${formatNumber(displayRow?.ldr_left_down, 0)} RD ${formatNumber(displayRow?.ldr_right_down, 0)}` : '--');
}

function updateControlAngleReadout(row) {
  const hasData = Boolean(row?.created_at);
  const ageSec = hasData ? (Date.now() - toMs(row.created_at)) / 1000 : null;
  const fresh = isFreshEsp32Row(row);

  setText(elements.controlPanDisplay, fresh ? formatNumber(row?.pan_deg, 0) : '--');
  setText(elements.controlTiltDisplay, fresh ? formatNumber(row?.tilt_deg, 0) : '--');
  setText(
    elements.controlAngleDetail,
    fresh
      ? `Live ESP32 angle, updated ${formatAge(ageSec)}.`
      : hasData
        ? `No fresh ESP32 angle. Last packet ${formatAge(ageSec)}.`
        : 'Waiting for ESP32 angle data.'
  );
}

function updateAnalysis(row) {
  const actual = Number(row?.power_mw);
  const expected = Number(row?.expected_power_mw);
  const irradiance = Number(row?.irradiance_wm2);
  const hasExpected = Number.isFinite(expected) && expected >= 10;
  const hasActual = Number.isFinite(actual);

  setText(elements.analysisActual, formatNumber(actual, 1));
  setText(elements.analysisExpected, formatNumber(expected, 1));

  if (!hasExpected || !hasActual) {
    setRiskState('neutral', 'No risk');
    setText(elements.analysisTitle, Number.isFinite(irradiance) && irradiance <= 1 ? 'Night mode' : 'Low irradiance');
    setText(elements.analysisDetail, Number.isFinite(irradiance) && irradiance <= 1 ? 'No sunlight at local time.' : 'Waiting for theoretical output data.');
    setText(elements.analysisRatioDisplay, getOutputRatioDisplay(NaN, irradiance));
    setBarWidth(elements.actualFill, 0);
    setBarWidth(elements.expectedFill, 0);
    if (elements.alertBanner) elements.alertBanner.style.display = 'none';
    return;
  }

  const ratioPercent = (actual / expected) * 100;
  const maxForBars = Math.max(actual, expected, 1);
  setBarWidth(elements.actualFill, (actual / maxForBars) * 100);
  setBarWidth(elements.expectedFill, (expected / maxForBars) * 100);
  setText(elements.analysisRatioDisplay, getOutputRatioDisplay(ratioPercent, irradiance));
  const riskBand = getOutputRiskBand(ratioPercent);
  setRiskState(riskBand.level, riskBand.label);
  setText(elements.analysisTitle, riskBand.title);
  setText(elements.analysisDetail, riskBand.detail);
  if (elements.alertBanner) elements.alertBanner.style.display = ratioPercent < 50 ? 'flex' : 'none';
}

function updateControlUi() {
  const ldrEnabled = Boolean(latestCommand?.ldr_tracking_enabled);
  if (elements.ldrTrackingButton) {
    elements.ldrTrackingButton.dataset.enabled = String(ldrEnabled);
    elements.ldrTrackingButton.textContent = ldrEnabled ? 'Disable LDR Tracking' : 'Enable LDR Tracking';
    elements.ldrTrackingButton.className = `btn ${ldrEnabled ? 'btn-danger' : 'btn-primary'}`;
  }
  setText(elements.ldrTrackingState, ldrEnabled ? 'Enabled' : 'Disabled');
  setText(elements.ldrTrackingDetail, ldrEnabled ? 'ESP32 will use light-sensor correction.' : 'Auto mode uses the time trajectory unless this is enabled.');
  if (elements.ldrTrackingDot) elements.ldrTrackingDot.className = `dot ${ldrEnabled ? 'dot-green' : 'dot-red'}`;

  const zeroProgressActive = isSensorZeroProgressActive();
  const zeroRequested = Boolean(latestCommand?.sensor_zero_requested);
  setText(elements.sensorZeroState, zeroProgressActive ? 'Calibrating' : (zeroRequested ? 'Queued' : 'Ready'));
  setText(elements.sensorZeroDetail, zeroProgressActive || zeroRequested ? 'Keep the panel covered until the bar completes.' : 'Cover the panel, then start zero calibration.');
  if (elements.sensorZeroDot) elements.sensorZeroDot.className = `dot ${zeroProgressActive || zeroRequested ? 'dot-green' : 'dot-red'}`;
  if (!zeroProgressActive && !zeroRequested) renderSensorZeroProgress();

  setLdrTrackingPeriodInput(latestCommand?.tracking_period_sec ?? 0);
  if (!controlPanelModeInitialized) {
    setPanelControlMode(getCommandControlMode());
  } else {
    setControlButtonState(controlPanelMode);
  }
}

function isLdrTrackingEnabled() {
  return Boolean(latestCommand?.ldr_tracking_enabled);
}

async function ensureLdrTrackingOffForPanelControl(actionLabel) {
  if (!isLdrTrackingEnabled()) return true;
  const confirmed = window.confirm(`Light Tracking is enabled. Turn it off before using ${actionLabel}?`);
  if (!confirmed) return false;

  setText(elements.commandStatus, 'Disabling Light Tracking...');
  try {
    const angles = getSliderAngles();
    await upsertCommand({
      mode: latestCommand?.mode || 'auto',
      target_pan_deg: angles.pan,
      target_tilt_deg: angles.tilt,
      ldr_tracking_enabled: false,
    });
  } catch (error) {
    setText(elements.commandStatus, error.message || 'Failed to disable Light Tracking');
    return false;
  }
  updateControlUi();
  setText(elements.commandStatus, 'Light Tracking disabled. Control is available.');
  return true;
}

function guardSliderStart(event, actionLabel) {
  markPanelSliderEditing();
  if (!isLdrTrackingEnabled()) return;
  const confirmed = window.confirm(`Light Tracking is enabled. Turn it off before using ${actionLabel}?`);
  if (!confirmed) {
    event.preventDefault();
    releasePanelSliderEditing();
    return;
  }

  const angles = getSliderAngles();
  setText(elements.commandStatus, 'Disabling Light Tracking...');
  upsertCommand({
    mode: latestCommand?.mode || 'auto',
    target_pan_deg: angles.pan,
    target_tilt_deg: angles.tilt,
    ldr_tracking_enabled: false,
  }).then(() => {
    updateControlUi();
    setText(elements.commandStatus, 'Light Tracking disabled. Drag again or click Apply Manual Angle.');
  }).catch((error) => {
    setText(elements.commandStatus, error.message || 'Failed to disable Light Tracking');
  });
}

function getLdrTrackingPeriodSec() {
  const value = Number(elements.ldrTrackingPeriodInput?.value || 0);
  const normalizedValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const unit = elements.ldrTrackingUnitSelect?.value || 's';
  const multiplier = unit === 'h' ? 3600 : unit === 'min' ? 60 : 1;
  return Math.max(0, Math.min(LDR_MAX_PERIOD_SEC, Math.round(normalizedValue * multiplier)));
}

function syncLdrTrackingUnitBounds() {
  if (!elements.ldrTrackingUnitSelect || !elements.ldrTrackingPeriodInput) return;
  const unit = elements.ldrTrackingUnitSelect.value;
  const max = unit === 'h' ? 24 : unit === 'min' ? 1440 : LDR_MAX_PERIOD_SEC;
  elements.ldrTrackingPeriodInput.max = String(max);
  const value = Number(elements.ldrTrackingPeriodInput.value);
  if (Number.isFinite(value) && value > max) elements.ldrTrackingPeriodInput.value = String(max);
}

function setLdrTrackingPeriodInput(periodSec) {
  if (!elements.ldrTrackingPeriodInput || document.activeElement === elements.ldrTrackingPeriodInput) return;
  const clamped = Math.max(0, Math.min(LDR_MAX_PERIOD_SEC, Math.round(Number(periodSec) || 0)));
  if (clamped === 0) {
    elements.ldrTrackingUnitSelect.value = 's';
    elements.ldrTrackingPeriodInput.value = '0';
  } else if (clamped % 3600 === 0) {
    elements.ldrTrackingUnitSelect.value = 'h';
    elements.ldrTrackingPeriodInput.value = String(clamped / 3600);
  } else if (clamped % 60 === 0) {
    elements.ldrTrackingUnitSelect.value = 'min';
    elements.ldrTrackingPeriodInput.value = String(clamped / 60);
  } else {
    elements.ldrTrackingUnitSelect.value = 's';
    elements.ldrTrackingPeriodInput.value = String(clamped);
  }
  syncLdrTrackingUnitBounds();
}

function setControlButtonState(mode) {
  elements.autoButton?.classList.toggle('mode-active', mode === 'auto');
  elements.manualModeButton?.classList.toggle('mode-active', mode === 'manual');
  elements.cleanButton?.classList.toggle('mode-active', mode === 'clean');
}

function setManualControlVisible(visible) {
  setHidden(elements.manualControlCard, !visible);
}

function setAutoControlVisible(visible) {
  setHidden(elements.autoControlCard, !visible);
}

function setPanelControlMode(mode) {
  controlPanelMode = mode;
  controlPanelModeInitialized = true;
  setControlButtonState(mode);
  setAutoControlVisible(mode === 'auto');
  setManualControlVisible(mode === 'manual');
  if (mode !== 'clean') setTiltClearVisible(false);
  if (mode !== 'manual') releasePanelSliderEditing();
}

function getCommandControlMode() {
  if (latestCommand?.mode === 'manual') return 'manual';
  if (latestCommand?.mode === 'cleaning' || latestCommand?.mode === 'tilt_clear_start') return 'clean';
  return 'auto';
}

function setTiltClearVisible(visible) {
  setHidden(elements.tiltClearCard, !visible);
}

function setTiltClearButton(action, label, disabled = false) {
  if (!elements.tiltClearButton) return;
  elements.tiltClearButton.dataset.action = action;
  elements.tiltClearButton.textContent = label;
  elements.tiltClearButton.disabled = disabled;
}

function setTiltProgress(phaseOnePercent, phaseTwoPercent, note) {
  const p1 = clamp(phaseOnePercent, 0, 100);
  const p2 = clamp(phaseTwoPercent, 0, 100);
  setBarWidth(elements.tiltPhaseOneFill, p1);
  setBarWidth(elements.tiltPhaseTwoFill, p2);
  setText(elements.tiltPhaseOnePercent, `${Math.round(p1)}%`);
  setText(elements.tiltPhaseTwoPercent, `${Math.round(p2)}%`);
  setText(elements.tiltProgressNote, note);
}

function stopTiltAnimation() {
  if (tiltDelayTimer) {
    clearTimeout(tiltDelayTimer);
    tiltDelayTimer = null;
  }
  if (tiltAnimationFrame) {
    cancelAnimationFrame(tiltAnimationFrame);
    tiltAnimationFrame = null;
  }
}

function resetTiltClearUi(note = 'Ready.') {
  stopTiltAnimation();
  tiltClearActive = false;
  cleanModeActive = false;
  tiltClearSnapshot = null;
  setTiltClearButton('start', 'Start', false);
  setText(elements.tiltPhaseOneLabel, `Tilt to ${CLEAN_TILT_DEG} deg`);
  setText(elements.tiltPhaseTwoLabel, 'Reset to saved angle');
  setTiltProgress(0, 0, note);
}

function animateTilt(fromTilt, toTilt, durationMs, onFrame, onComplete) {
  const startedAt = performance.now();
  const distance = toTilt - fromTilt;
  function render(now) {
    const progress = durationMs <= 0 ? 1 : clamp((now - startedAt) / durationMs, 0, 1);
    const currentTilt = fromTilt + distance * progress;
    if (elements.tiltSlider) elements.tiltSlider.value = String(Math.round(currentTilt));
    updateSliderOutputs();
    onFrame(progress, currentTilt);
    if (progress < 1) {
      tiltAnimationFrame = requestAnimationFrame(render);
      return;
    }
    tiltAnimationFrame = null;
    onComplete();
  }
  tiltAnimationFrame = requestAnimationFrame(render);
}

function getCurrentPanelAngles() {
  const source = isFreshEsp32Row(latestEsp32Row) ? latestEsp32Row : null;
  const pan = Number(source?.pan_deg ?? elements.panSlider?.value ?? latestCommand?.target_pan_deg ?? DEFAULT_PAN_DEG);
  const tilt = Number(source?.tilt_deg ?? elements.tiltSlider?.value ?? latestCommand?.target_tilt_deg ?? DEFAULT_TILT_DEG);
  return {
    pan: Number.isFinite(pan) ? clamp(Math.round(pan), SERVO_MIN_DEG, SERVO_MAX_DEG) : DEFAULT_PAN_DEG,
    tilt: Number.isFinite(tilt) ? clamp(Math.round(tilt), SERVO_MIN_DEG, SERVO_MAX_DEG) : DEFAULT_TILT_DEG,
  };
}

function syncManualSlidersToCurrentAngles() {
  const angles = getCurrentPanelAngles();
  if (elements.panSlider) elements.panSlider.value = String(angles.pan);
  if (elements.tiltSlider) elements.tiltSlider.value = String(angles.tilt);
  updateSliderOutputs();
  panelSliderEditing = false;
  panelSliderSyncHoldUntilMs = Date.now() + CONTROL_SYNC_HOLD_MS;
  return angles;
}

function enterCleanMode() {
  if (tiltClearActive) return;
  tiltClearSnapshot = getCurrentPanelAngles();
  cleanModeActive = true;
  setPanelControlMode('clean');
  setTiltClearVisible(true);
  setTiltClearButton('start', 'Start', false);
  setText(elements.tiltPhaseOneLabel, `Tilt to ${CLEAN_TILT_DEG} deg`);
  setText(elements.tiltPhaseTwoLabel, `Reset to ${tiltClearSnapshot.tilt} deg`);
  setTiltProgress(0, 0, `Clean mode ready. Saved angle: ${tiltClearSnapshot.pan} / ${tiltClearSnapshot.tilt} deg.`);
}

function scrollToPanelControl() {
  elements.panelControl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function enterCleanModeFromAlert() {
  if (await ensureLdrTrackingOffForPanelControl('Clean mode')) {
    enterCleanMode();
    scrollToPanelControl();
  }
}

function enterAutoMode() {
  const angles = getCurrentPanelAngles();
  releasePanelSliderEditing();
  resetTiltClearUi('Auto mode.');
  setPanelControlMode('auto');
  sendCommand('auto', { target_pan_deg: angles.pan, target_tilt_deg: angles.tilt });
}

function enterManualMode() {
  const angles = syncManualSlidersToCurrentAngles();
  resetTiltClearUi('Manual angle.');
  setPanelControlMode('manual');
  setText(elements.commandStatus, `Manual mode ready at ${angles.pan} / ${angles.tilt} deg.`);
}

function applyManualAngle() {
  const angles = getSliderAngles();
  panelSliderEditing = false;
  panelSliderSyncHoldUntilMs = Date.now() + SERVO_MOVE_MS + COMMAND_PICKUP_DELAY_MS + 3000;
  resetTiltClearUi('Manual angle.');
  setPanelControlMode('manual');
  sendCommand('manual', {
    target_pan_deg: angles.pan,
    target_tilt_deg: angles.tilt,
  });
}

function startTiltClearMode() {
  const action = elements.tiltClearButton?.dataset.action || 'start';
  if (action === 'reset') {
    resetTiltClearMode();
    return;
  }
  stopTiltAnimation();
  if (!tiltClearSnapshot) tiltClearSnapshot = getCurrentPanelAngles();
  tiltClearActive = true;
  cleanModeActive = true;
  setTiltClearVisible(true);
  setPanelControlMode('clean');
  setTiltClearVisible(true);
  setTiltClearButton('moving', 'Moving...', true);
  setText(elements.tiltPhaseOneLabel, `Tilt to ${CLEAN_TILT_DEG} deg`);
  setText(elements.tiltPhaseTwoLabel, `Reset to ${tiltClearSnapshot.tilt} deg`);
  setTiltProgress(0, 0, 'Command sent. Waiting for ESP32 pickup.');
  sendCommand('tilt_clear_start', {
    target_pan_deg: tiltClearSnapshot.pan,
    target_tilt_deg: CLEAN_TILT_DEG,
  }, { refresh: false });

  tiltDelayTimer = setTimeout(() => {
    tiltDelayTimer = null;
    animateTilt(
      tiltClearSnapshot.tilt,
      CLEAN_TILT_DEG,
      SERVO_MOVE_MS,
      (progress, currentTilt) => {
        setTiltProgress(progress * 100, 0, `Moving to clean angle: ${Math.round(currentTilt)} deg.`);
      },
      () => {
        if (elements.tiltSlider) elements.tiltSlider.value = String(CLEAN_TILT_DEG);
        updateSliderOutputs();
        setTiltProgress(100, 0, 'Clean angle reached. Click Reset to restore the saved angle.');
        setTiltClearButton('reset', 'Reset', false);
        refreshAll();
      }
    );
  }, COMMAND_PICKUP_DELAY_MS);
}

function resetTiltClearMode() {
  if (!tiltClearSnapshot) {
    resetTiltClearUi('Reset complete.');
    setPanelControlMode('auto');
    sendCommand('auto');
    return;
  }
  stopTiltAnimation();
  const snapshot = { ...tiltClearSnapshot };
  const currentTilt = Number(elements.tiltSlider?.value || CLEAN_TILT_DEG);
  setTiltClearButton('resetting', 'Resetting...', true);
  setTiltProgress(100, 0, 'Reset command sent. Waiting for ESP32 pickup.');
  sendCommand('tilt_clear_reset', {
    target_pan_deg: snapshot.pan,
    target_tilt_deg: snapshot.tilt,
  }, { refresh: false });

  tiltDelayTimer = setTimeout(() => {
    tiltDelayTimer = null;
    animateTilt(
      Number.isFinite(currentTilt) ? currentTilt : CLEAN_TILT_DEG,
      snapshot.tilt,
      SERVO_MOVE_MS,
      (progress, tilt) => {
        setTiltProgress(100, progress * 100, `Resetting: ${Math.round(tilt)} deg.`);
      },
      () => {
        if (elements.panSlider) elements.panSlider.value = String(snapshot.pan);
        if (elements.tiltSlider) elements.tiltSlider.value = String(snapshot.tilt);
        updateSliderOutputs();
        resetTiltClearUi('Reset complete.');
        setPanelControlMode('auto');
        sendCommand('auto', {
          target_pan_deg: snapshot.pan,
          target_tilt_deg: snapshot.tilt,
        });
      }
    );
  }, COMMAND_PICKUP_DELAY_MS);
}

async function refreshAll() {
  try {
    await fetchCommand();
    const locationKey = getSelectedLocationKey();
    const weather = await fetchWeatherForLocation(locationKey);
    const [selectedRaw, esp32Raw, historyRaw, bestPowerToday] = await Promise.all([
      fetchLatestReading(locationKey),
      fetchLatestEsp32Reading(),
      fetchHistoryRows(locationKey),
      fetchBestPowerToday(locationKey),
    ]);
    const row = buildDisplayRow(selectedRaw, weather, selectedRaw?.created_at ? toMs(selectedRaw.created_at) : Date.now());
    const esp32Row = esp32Raw ? buildDisplayRow(esp32Raw, weather, toMs(esp32Raw.created_at)) : null;
    const historyRows = (historyRaw || []).map((reading) => buildDisplayRow(reading, weather, toMs(reading.created_at)));
    if (await handleFreshEsp32WhileSimulator(esp32Row)) {
      setTimeout(refreshAll, 0);
      return;
    }
    latestRow = row;
    latestEsp32Row = esp32Row;
    updateCards(row, bestPowerToday);
    updateConnection(esp32Row);
    updateEsp32DirectUpload(esp32Row);
    updateControlAngleReadout(esp32Row);
    updateSystemState(row);
    updateAnalysis(row);
    updateChart(historyRows);
    updateControlUi();
    cleanupOldReadings();
    setText(elements.devStatus, browserDemoUploadEnabled ? 'Demo Uploading' : 'Supabase');
    if (elements.devStatus) elements.devStatus.className = `soft-badge ${browserDemoUploadEnabled ? 'sim-uploading' : 'sim-paused'}`;
  } catch (error) {
    console.error(error);
    if (elements.statusDot) elements.statusDot.className = 'dot dot-red';
    if (elements.connectionPill) elements.connectionPill.className = 'status-pill status-pill-error';
    setText(elements.statusText, 'Supabase error');
    if (elements.disconnectedBanner) elements.disconnectedBanner.style.display = 'flex';
    setText(elements.lastContactText, error.message || 'Dashboard cannot read Supabase.');
  }
}

async function upsertCommand(values) {
  const payload = {
    id: 1,
    mode: values.mode || latestCommand?.mode || 'auto',
    target_pan_deg: Number(values.target_pan_deg ?? latestCommand?.target_pan_deg ?? DEFAULT_PAN_DEG),
    target_tilt_deg: Number(values.target_tilt_deg ?? latestCommand?.target_tilt_deg ?? DEFAULT_TILT_DEG),
    ldr_tracking_enabled: values.ldr_tracking_enabled ?? latestCommand?.ldr_tracking_enabled ?? false,
    tracking_period_sec: values.tracking_period_sec ?? latestCommand?.tracking_period_sec ?? 0,
    sensor_zero_requested: values.sensor_zero_requested ?? latestCommand?.sensor_zero_requested ?? false,
    updated_at: new Date().toISOString(),
  };
  const { error } = await db.from('solar_commands').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
  latestCommand = payload;
  return payload;
}

async function sendCommand(mode, payload = {}, options = {}) {
  setText(elements.commandStatus, `Queueing ${mode}...`);
  try {
    await upsertCommand({ mode, ...payload });
    setText(elements.commandStatus, `Queued: ${mode}`);
    if (options.refresh !== false) await refreshAll();
  } catch (error) {
    setText(elements.commandStatus, error.message || 'Command failed');
  }
}

async function insertDemoReading() {
  const mode = latestCommand?.mode || 'auto';
  const pan = Number(latestCommand?.target_pan_deg ?? DEFAULT_PAN_DEG);
  const tilt = Number(latestCommand?.target_tilt_deg ?? DEFAULT_TILT_DEG);
  const locationKey = getSelectedLocationKey();
  const weather = await fetchWeatherForLocation(locationKey);
  const weatherAt = getWeatherAt(weather, Date.now());
  const expectedPower = calculateExpectedPowerMw(weatherAt.irradiance_wm2);
  const performance = getDemoPerformanceRatio(expectedPower);
  const actualPower = Math.max(0, expectedPower * performance);
  const voltage = PANEL_RATED_VOLTAGE;
  const current = voltage > 0 ? actualPower / voltage : 0;
  const efficiencyPercent = calculateEfficiencyPercent(actualPower, expectedPower);
  const row = {
    location_key: locationKey,
    location_name: weatherAt.location_name,
    latitude: weatherAt.latitude,
    longitude: weatherAt.longitude,
    timezone: weatherAt.timezone,
    voltage_v: Number(voltage.toFixed(3)),
    current_ma: Number(current.toFixed(2)),
    actual_power_mw: Number(actualPower.toFixed(2)),
    expected_power_mw: Number(expectedPower.toFixed(2)),
    efficiency_percent: Number(efficiencyPercent.toFixed(2)),
    irradiance_wm2: Number(weatherAt.irradiance_wm2.toFixed(1)),
    temperature_c: weatherAt.temperature_c,
    cloud_cover_pct: weatherAt.cloud_cover_pct,
    wind_speed_kmh: weatherAt.wind_speed_kmh,
    weather_code: weatherAt.weather_code,
    weather_category: weatherAt.weather_category,
    weather_category_label: weatherAt.weather_category_label,
    weather_description: BROWSER_DEMO_DESCRIPTION,
    mode,
    pan_deg: pan,
    tilt_deg: tilt,
    servo_1_deg: pan,
    servo_2_deg: tilt,
    raw_meter_voltage_v: 2.5 + Math.random() * 0.2,
    current_baseline_ma: 0,
    sensor_zero_ready: false,
    ldr_left_up: Math.round(1500 + Math.random() * 2000),
    ldr_right_up: Math.round(1500 + Math.random() * 2000),
    ldr_left_down: Math.round(1500 + Math.random() * 2000),
    ldr_right_down: Math.round(1500 + Math.random() * 2000),
    ldr_horizontal_diff: Math.round(-100 + Math.random() * 200),
    ldr_vertical_diff: Math.round(-100 + Math.random() * 200),
  };
  const { error } = await db.from('sensor_readings').insert(row);
  if (error) throw error;
}

function setBrowserDemoUploadUi(enabled) {
  browserDemoUploadEnabled = enabled;
  if (elements.simUploadButton) {
    elements.simUploadButton.dataset.enabled = String(enabled);
    elements.simUploadButton.textContent = enabled ? 'Stop Upload' : 'Start Upload';
    elements.simUploadButton.className = `btn ${enabled ? 'btn-danger' : 'btn-primary'}`;
  }
  if (elements.simUploadDot) elements.simUploadDot.className = `dot ${enabled ? 'dot-green' : 'dot-red'}`;
  updateSimulatorProfileText();
  setText(elements.devStatus, enabled ? 'Demo Uploading' : 'Supabase');
  if (elements.devStatus) elements.devStatus.className = `soft-badge ${enabled ? 'sim-uploading' : 'sim-paused'}`;
}

function stopBrowserDemoUpload(detail = '') {
  if (browserDemoTimer) {
    clearInterval(browserDemoTimer);
    browserDemoTimer = null;
  }
  resetDemoEfficiencyState();
  setBrowserDemoUploadUi(false);
  if (detail) setText(elements.simUploadDetail, detail);
}

async function handleFreshEsp32WhileSimulator(esp32Row) {
  if (!browserDemoUploadEnabled || !hasFreshEsp32Row(esp32Row)) return false;
  const now = Date.now();
  if (now - lastEsp32ConflictPromptMs < SOURCE_CONFLICT_PROMPT_COOLDOWN_MS) return false;
  lastEsp32ConflictPromptMs = now;
  const ageSec = (Date.now() - toMs(esp32Row.created_at)) / 1000;
  const confirmed = window.confirm(`ESP32 Direct Upload is receiving data (${formatAge(ageSec)}). Stop Simulator Upload and switch the dashboard to ESP32 data?`);
  if (!confirmed) {
    setText(elements.simUploadDetail, 'Simulator remains active. ESP32 packets are ignored by dashboard views.');
    return false;
  }
  stopBrowserDemoUpload('Stopped Simulator Upload because ESP32 direct data is active.');
  return true;
}

async function toggleBrowserDemoUpload() {
  const next = !browserDemoUploadEnabled;
  if (!next) {
    stopBrowserDemoUpload('Simulator stopped. ESP32 direct upload can be used when fresh packets arrive.');
    await refreshAll();
    return;
  }

  try {
    const esp32Row = await fetchLatestEsp32Reading();
    if (hasFreshEsp32Row(esp32Row)) {
      const ageSec = (Date.now() - toMs(esp32Row.created_at)) / 1000;
      const confirmed = window.confirm(`ESP32 Direct Upload is active (${formatAge(ageSec)}). Switch the dashboard to Simulator Upload and ignore ESP32 packets?`);
      if (!confirmed) return;
      lastEsp32ConflictPromptMs = Date.now();
    }
  } catch (error) {
    setText(elements.simUploadDetail, error.message || 'Could not check ESP32 upload status.');
    return;
  }

  setBrowserDemoUploadUi(true);
  resetDemoEfficiencyState();
  if (next) {
    insertDemoReading().then(refreshAll).catch((error) => setText(elements.simUploadDetail, error.message));
    browserDemoTimer = setInterval(() => {
      insertDemoReading().then(refreshAll).catch((error) => setText(elements.simUploadDetail, error.message));
    }, DEMO_UPLOAD_INTERVAL_MS);
  }
}

async function clearHistoryData() {
  if (!elements.clearHistoryButton) return;
  if (elements.clearHistoryButton.dataset.confirm !== 'true') {
    elements.clearHistoryButton.dataset.confirm = 'true';
    elements.clearHistoryButton.textContent = 'Confirm';
    elements.clearHistoryButton.classList.add('confirm');
    clearTimeout(clearHistoryConfirmTimer);
    clearHistoryConfirmTimer = setTimeout(() => {
      elements.clearHistoryButton.dataset.confirm = 'false';
      elements.clearHistoryButton.textContent = 'Clear';
      elements.clearHistoryButton.classList.remove('confirm');
    }, 5000);
    return;
  }
  try {
    const { error } = await db
      .from('sensor_readings')
      .delete()
      .eq('location_key', getSelectedLocationKey())
      .gt('id', 0);
    if (error) throw error;
    updateChart([]);
    if (elements.chartEmpty) {
      elements.chartEmpty.textContent = 'History cleared';
      elements.chartEmpty.style.display = 'flex';
    }
    await refreshAll();
  } catch (error) {
    if (elements.chartEmpty) {
      elements.chartEmpty.textContent = error.message;
      elements.chartEmpty.style.display = 'flex';
    }
  } finally {
    elements.clearHistoryButton.dataset.confirm = 'false';
    elements.clearHistoryButton.textContent = 'Clear';
    elements.clearHistoryButton.classList.remove('confirm');
  }
}

function setupEvents() {
  elements.devPanelToggle?.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('button')) return;
    toggleDevTools();
  });
  elements.devPanelToggle?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggleDevTools();
  });
  elements.devToggleButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleDevTools();
  });
  elements.simEfficiencyProfile?.addEventListener('change', () => {
    resetDemoEfficiencyState();
    updateSimulatorProfileText();
  });
  elements.simVariationProfile?.addEventListener('change', () => {
    resetDemoEfficiencyState();
    updateSimulatorProfileText();
  });
  elements.panSlider?.addEventListener('pointerdown', (event) => guardSliderStart(event, 'manual pan control'));
  elements.tiltSlider?.addEventListener('pointerdown', (event) => guardSliderStart(event, 'manual tilt control'));
  elements.panSlider?.addEventListener('keydown', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) {
      guardSliderStart(event, 'manual pan control');
    }
  });
  elements.tiltSlider?.addEventListener('keydown', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) {
      guardSliderStart(event, 'manual tilt control');
    }
  });
  elements.panSlider?.addEventListener('input', () => {
    markPanelSliderEditing();
    updateSliderOutputs();
  });
  elements.tiltSlider?.addEventListener('input', () => {
    markPanelSliderEditing();
    updateSliderOutputs();
  });
  elements.panSlider?.addEventListener('change', releasePanelSliderEditing);
  elements.tiltSlider?.addEventListener('change', releasePanelSliderEditing);
  elements.panSlider?.addEventListener('blur', releasePanelSliderEditing);
  elements.tiltSlider?.addEventListener('blur', releasePanelSliderEditing);
  window.addEventListener('pointerup', () => {
    if (panelSliderEditing) releasePanelSliderEditing();
  });
  elements.autoButton?.addEventListener('click', enterAutoMode);
  elements.manualModeButton?.addEventListener('click', async () => {
    if (await ensureLdrTrackingOffForPanelControl('Manual mode')) enterManualMode();
  });
  elements.cleanButton?.addEventListener('click', async () => {
    if (await ensureLdrTrackingOffForPanelControl('Clean mode')) enterCleanMode();
  });
  elements.cleanAlertButton?.addEventListener('click', enterCleanModeFromAlert);
  elements.manualButton?.addEventListener('click', async () => {
    if (await ensureLdrTrackingOffForPanelControl('manual angle control')) applyManualAngle();
  });
  elements.tiltClearButton?.addEventListener('click', async () => {
    if (await ensureLdrTrackingOffForPanelControl('Tilt Clear Mode')) startTiltClearMode();
  });
  elements.clearHistoryButton?.addEventListener('click', clearHistoryData);
  elements.simUploadButton?.addEventListener('click', toggleBrowserDemoUpload);
  elements.sensorZeroButton?.addEventListener('click', () => {
    startSensorZeroProgress();
    sendCommand('sensor_zero', { sensor_zero_requested: true });
  });
  elements.ldrTrackingButton?.addEventListener('click', () => {
    const nextEnabled = !(latestCommand?.ldr_tracking_enabled);
    const angles = getCurrentPanelAngles();
    releasePanelSliderEditing();
    sendCommand(nextEnabled ? 'auto' : (latestCommand?.mode || 'auto'), {
      target_pan_deg: angles.pan,
      target_tilt_deg: angles.tilt,
      ldr_tracking_enabled: nextEnabled,
    });
  });
  elements.ldrScheduleButton?.addEventListener('click', () => {
    sendCommand(latestCommand?.ldr_tracking_enabled ? 'auto' : (latestCommand?.mode || 'auto'), {
      tracking_period_sec: getLdrTrackingPeriodSec(),
    });
  });
  elements.ldrTrackingUnitSelect?.addEventListener('change', syncLdrTrackingUnitBounds);
  elements.weatherLocationSelect?.addEventListener('change', () => {
    refreshAll();
  });
  document.querySelectorAll('.range-btn[data-range]').forEach((button) => {
    button.addEventListener('click', () => {
      activeRangeKey = button.dataset.range;
      document.querySelectorAll('.range-btn[data-range]').forEach((b) => b.classList.toggle('active', b === button));
      refreshAll();
    });
  });
}

async function init() {
  populateLocationSelect();
  setDevToolsOpen(false);
  setBrowserDemoUploadUi(false);
  setLdrTrackingPeriodInput(0);
  updateSliderOutputs();
  createChart();
  setupEvents();
  try {
    const { SUPABASE_URL, SUPABASE_KEY } = getConfig();
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    await fetchCommand();
    if (!latestCommand?.updated_at) {
      await upsertCommand({ mode: 'auto', target_pan_deg: DEFAULT_PAN_DEG, target_tilt_deg: DEFAULT_TILT_DEG });
    }
    await refreshAll();
    setInterval(refreshAll, 3000);
  } catch (error) {
    console.error(error);
    if (elements.statusDot) elements.statusDot.className = 'dot dot-red';
    if (elements.connectionPill) elements.connectionPill.className = 'status-pill status-pill-error';
    setText(elements.statusText, 'Setup needed');
    if (elements.disconnectedBanner) elements.disconnectedBanner.style.display = 'flex';
    setText(elements.lastContactText, error.message);
    setText(elements.esp32SupabaseStatus, 'Check config.js');
  }
}

init();
