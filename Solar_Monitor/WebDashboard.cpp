#include "WebDashboard.h"
#include "Config.h"
#include "State.h"
#include "Trajectory.h"
#include "PowerMonitor.h"

#include <WiFi.h>
#include <WebServer.h>
#include <time.h>

static WebServer server(80);
static unsigned long lastWifiReconnectAttemptMs = 0;

static const char MAIN_PAGE[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Solar Tracking Dashboard</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f4f6f8;
      color: #222;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 950px;
      margin: auto;
    }
    h1 {
      text-align: center;
      margin-bottom: 20px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }
    .card {
      background: white;
      border-radius: 14px;
      padding: 18px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .value {
      font-size: 24px;
      font-weight: bold;
    }
    .small {
      color: #666;
      font-size: 13px;
    }
    button {
      padding: 9px 12px;
      margin: 5px 4px;
      border: none;
      border-radius: 8px;
      color: white;
      background: #2d89ef;
      cursor: pointer;
    }
    .auto { background: #27ae60; }
    .manual { background: #8e44ad; }
    .clean { background: #f39c12; }
    .dark { background: #34495e; }
    input {
      width: 70px;
      padding: 7px;
      margin: 5px;
    }
    .warning {
      color: #c0392b;
      font-weight: bold;
    }
    .ok {
      color: #27ae60;
      font-weight: bold;
    }
  </style>
</head>
<body>
<div class="container">
  <h1>Solar Tracking Dashboard</h1>

  <div class="grid">

    <div class="card">
      <h2>System Mode</h2>
      <p class="value" id="mode">--</p>
      <p id="cleanStatus">--</p>

      <button class="auto" onclick="setMode('auto')">Auto Trajectory</button>
      <button class="manual" onclick="setMode('manual')">Manual Mode</button>
      <button class="clean" onclick="setMode('clean')">Cleaning Position</button>
    </div>

    <div class="card">
      <h2>Servo Angles</h2>
      <p>Base angle: <span class="value" id="baseAngle">--</span>°</p>
      <p>Panel angle: <span class="value" id="panelAngle">--</span>°</p>

      <h3>Manual Control</h3>
      <label>Base:</label>
      <input type="number" id="baseInput" min="1" max="178" value="90">
      <label>Panel:</label>
      <input type="number" id="panelInput" min="1" max="178" value="90">
      <button onclick="setAngles()">Set Angles</button>
    </div>

    <div class="card">
      <h2>Estimated Solar Power</h2>
      <p>Estimated voltage: <span class="value" id="voltage">--</span> V</p>
      <p>Current: <span class="value" id="current">--</span> A</p>
      <p>Estimated power: <span class="value" id="power">--</span> W</p>

      <p class="small">
        Because there is no voltage divider now, voltage is assumed rather than measured.
      </p>

      <p class="small">Clean reference power: <span id="reference">--</span> W</p>

      <button class="dark" onclick="setBaseline()">Set Current Power as Clean Baseline</button>
      <button class="dark" onclick="calibrateACS()">Calibrate ACS Zero</button>
    </div>

    <div class="card">
      <h2>Light Sensors</h2>
      <p>Left Top: <span id="lt">--</span></p>
      <p>Right Top: <span id="rt">--</span></p>
      <p>Left Bottom: <span id="lb">--</span></p>
      <p>Right Bottom: <span id="rb">--</span></p>
      <p>Average raw value: <span id="avgLight">--</span></p>
      <p class="small">For your light sensor module, a lower value usually means stronger light.</p>
    </div>

  </div>
</div>

<script>
async function updateStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    document.getElementById('mode').textContent = data.mode;
    document.getElementById('baseAngle').textContent = data.baseAngle;
    document.getElementById('panelAngle').textContent = data.panelAngle;

    document.getElementById('voltage').textContent = data.estimatedVoltage.toFixed(2);
    document.getElementById('current').textContent = data.currentA.toFixed(3);
    document.getElementById('power').textContent = data.estimatedPowerW.toFixed(3);
    document.getElementById('reference').textContent = data.cleanReferencePowerW.toFixed(3);

    document.getElementById('lt').textContent = data.zoushang;
    document.getElementById('rt').textContent = data.youshang;
    document.getElementById('lb').textContent = data.zouxia;
    document.getElementById('rb').textContent = data.youxia;
    document.getElementById('avgLight').textContent = data.avgLight;

    const cleanStatus = document.getElementById('cleanStatus');
    if (data.needsCleaning) {
      cleanStatus.innerHTML = '<span class="warning">Cleaning may be needed</span>';
    } else {
      cleanStatus.innerHTML = '<span class="ok">Panel condition looks normal</span>';
    }
  } catch (err) {
    console.log(err);
  }
}

async function setMode(mode) {
  await fetch('/api/mode?m=' + mode);
  updateStatus();
}

async function setAngles() {
  const base = document.getElementById('baseInput').value;
  const panel = document.getElementById('panelInput').value;

  await fetch('/api/set?base=' + base + '&panel=' + panel);
  updateStatus();
}

async function setBaseline() {
  await fetch('/api/baseline');
  updateStatus();
}

async function calibrateACS() {
  alert('Before calibration, make sure there is no current through the ACS712.');
  await fetch('/api/calibrateACS');
  updateStatus();
}

setInterval(updateStatus, 1000);
updateStatus();
</script>
</body>
</html>
)rawliteral";

static String buildStatusJson() {
  String json = "{";

  json += "\"mode\":\"" + modeToString(state.mode) + "\",";
  json += "\"baseAngle\":" + String(state.baseAngle) + ",";
  json += "\"panelAngle\":" + String(state.panelAngle) + ",";

  json += "\"zoushang\":" + String(state.light.zoushang) + ",";
  json += "\"youshang\":" + String(state.light.youshang) + ",";
  json += "\"zouxia\":" + String(state.light.zouxia) + ",";
  json += "\"youxia\":" + String(state.light.youxia) + ",";
  json += "\"avgLight\":" + String(state.light.avgLight) + ",";

  json += "\"acsRaw\":" + String(state.power.acsRaw) + ",";
  json += "\"acsVoltage\":" + String(state.power.acsVoltage, 4) + ",";
  json += "\"currentA\":" + String(state.power.currentA, 4) + ",";
  json += "\"estimatedVoltage\":" + String(state.power.estimatedVoltage, 4) + ",";
  json += "\"estimatedPowerW\":" + String(state.power.estimatedPowerW, 4) + ",";

	  json += "\"cleanReferencePowerW\":" + String(state.cleanReferencePowerW, 4) + ",";
	  json += "\"needsCleaning\":" + String(state.needsCleaning ? "true" : "false") + ",";
	  json += "\"wattmeterOk\":" + String(state.power.meterOk ? "true" : "false") + ",";
	  json += "\"ldrTrackingEnabled\":" + String(state.ldrTrackingEnabled ? "true" : "false") + ",";
	  json += "\"ldrTrackingPeriodSec\":" + String(state.ldrTrackingPeriodSec) + ",";
	  json += "\"dashboardUploadOk\":" + String(state.dashboardUploadOk ? "true" : "false") + ",";
	  json += "\"dashboardStatus\":\"" + state.dashboardStatus + "\"";

  json += "}";

  return json;
}

static void setupRoutes() {
  server.on("/", []() {
    server.send(200, "text/html", MAIN_PAGE);
  });

  server.on("/api/status", []() {
    server.send(200, "application/json", buildStatusJson());
  });

  server.on("/api/mode", []() {
    String m = server.arg("m");

    if (m == "auto") {
      state.mode = MODE_AUTO;
		    } else if (m == "manual") {
	      state.mode = MODE_MANUAL;
	    } else if (m == "clean") {
	      state.mode = MODE_CLEANING;
	      applyCleaningPosition();
	    }

    server.send(200, "application/json", "{\"ok\":true}");
  });

  server.on("/api/set", []() {
    int baseTarget = server.arg("base").toInt();
    int panelTarget = server.arg("panel").toInt();

    state.mode = MODE_MANUAL;
    moveToAngles(baseTarget, panelTarget);

    server.send(200, "application/json", "{\"ok\":true}");
  });

  server.on("/api/baseline", []() {
    state.cleanReferencePowerW = state.power.estimatedPowerW;
    state.needsCleaning = false;

    server.send(200, "application/json", "{\"ok\":true}");
  });

  server.on("/api/calibrateACS", []() {
    calibrateACSZero();
    server.send(200, "application/json", "{\"ok\":true}");
  });
}

void beginWebDashboard() {
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);

  Serial.println("Scanning Wi-Fi networks...");

  int n = WiFi.scanNetworks();

  if (n == 0) {
    Serial.println("No Wi-Fi networks found.");
  } else {
    Serial.println("Wi-Fi networks found:");
    for (int i = 0; i < n; ++i) {
      Serial.print(i + 1);
      Serial.print(": ");
      Serial.print(WiFi.SSID(i));
      Serial.print(" | RSSI: ");
      Serial.print(WiFi.RSSI(i));
      Serial.print(" | Encryption: ");
      Serial.println(WiFi.encryptionType(i));
      delay(10);
    }
  }

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to Wi-Fi");

  unsigned long startMs = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - startMs < 40000) {
    Serial.print(".");
    delay(500);
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi connected. Open this address in your browser: http://");
    Serial.println(WiFi.localIP());

    configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
  } else {
    Serial.println("Wi-Fi connection failed.");
  }

  setupRoutes();
  server.begin();
}

void handleWebDashboard() {
  if (WiFi.status() != WL_CONNECTED) {
    unsigned long now = millis();

    if (now - lastWifiReconnectAttemptMs >= WIFI_RECONNECT_INTERVAL_MS) {
      lastWifiReconnectAttemptMs = now;
      Serial.println("Wi-Fi disconnected. Reconnecting...");
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    }
  }

  server.handleClient();
}
