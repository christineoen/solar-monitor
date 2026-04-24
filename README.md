# Solar Panel Monitor

An IoT solar panel monitoring system. A FireBeetle ESP32-E reads power output from a Gravity I2C Digital Wattmeter every minute and POSTs the data to a locally hosted Flask server. Flask compares actual output against expected output derived from live solar irradiance forecast data (Open-Meteo API) and alerts the user when performance is significantly below expectations, indicating a dirty panel or obstruction. The user can then issue a cleaning command from the dashboard, which moves two SG90 servo motors to reposition the panel to a cleaning angle.

## Features

- Live power, voltage, current, and efficiency readings from the ESP32
- Automatic alert when panel output drops below 60% of expected for 5+ minutes
- One-click servo commands to move the panel to a cleaning position and back
- Historical chart of panel power output vs solar irradiance over the last hour
- Disconnected warning when the ESP32 stops reporting

## Requirements

- Python 3
- pip

## Setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Running

```bash
source venv/bin/activate
python run.py
```

The dashboard is available at `http://localhost:5000`. The server also listens on `0.0.0.0` so the ESP32 can reach it via the host machine's local IP address (e.g. `http://192.168.1.x:5000`).

The SQLite database (`solar_monitor.db`) is created automatically on first run.

## Architecture

```
ESP32  →  POST /data every minute  →  Flask
Flask  →  GET /status every minute  →  Browser dashboard
Flask  →  GET Open-Meteo API every hour  →  irradiance data
```

## Key constants

These can be tuned in `app/efficiency.py`:

| Constant | Default | Description |
|---|---|---|
| `PANEL_AREA_M2` | `0.008` | Panel area in m² (80×100mm) |
| `EFFICIENCY_FACTOR` | `0.16` | Panel efficiency — calibrate with clean panel |
| `ALERT_THRESHOLD` | `0.6` | Efficiency ratio below this may trigger an alert |
| `ALERT_DURATION_SECS` | `300` | How long below threshold before alerting (5 min) |
