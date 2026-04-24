# Solar Panel Monitor — Project Overview

## What this project is

An IoT solar panel monitoring system. A FireBeetle ESP32-E reads power output from a Gravity I2C Digital Wattmeter every minute and POSTs the data to a locally hosted Flask server. Flask compares actual output against expected output derived from live solar irradiance forecast data (Open-Meteo API) and alerts the user when performance is significantly below expectations, indicating a dirty panel or obstruction. The user can then issue a cleaning command from the dashboard, which moves two SG90 servo motors to reposition the panel to a cleaning angle.

## Repo structure

```
/
├── app/
│   ├── __init__.py         # Flask app factory
│   ├── state.py            # In-memory state dict
│   ├── database.py         # SQLite setup and helpers
│   ├── routes/
│   │   ├── data.py         # POST /data (ESP32 ingestion)
│   │   ├── status.py       # GET /status (browser live view)
│   │   ├── history.py      # GET /history/sensor, /history/weather
│   │   └── command.py      # POST /command (user commands)
│   ├── weather.py          # Open-Meteo polling background thread
│   ├── efficiency.py       # Efficiency ratio and alert logic
│   └── templates/
│       └── index.html      # Dashboard (see 07_dashboard.md)
├── run.py                  # Entry point
└── requirements.txt
```

## Spec files

Each part of the app has its own spec file. Work through them in order, or independently:

| File | Covers |
|---|---|
| `01_setup.md` | Flask app factory, requirements, run.py |
| `02_database.md` | SQLite schema, setup, read/write helpers |
| `03_state.md` | In-memory state dict shared across routes |
| `04_data_route.md` | POST /data — ESP32 ingestion endpoint |
| `05_weather.md` | Open-Meteo polling background thread |
| `06_efficiency.md` | Efficiency ratio calculation and alert logic |
| `07_status_history_routes.md` | GET /status, GET /history/sensor, GET /history/weather |
| `08_command_route.md` | POST /command — user-issued servo commands |
| `09_dashboard.md` | Browser dashboard HTML/CSS/JS |

## Key constants (tune during testing)

```python
PANEL_AREA_M2       = 0.008     # 80x100mm panel
EFFICIENCY_FACTOR   = 0.16      # Calibrate with clean panel under known light
ALERT_THRESHOLD     = 0.6       # Efficiency ratio below this triggers alert
ALERT_DURATION_SECS = 300       # Must be below threshold for 5 mins before alerting
CLEANING_ANGLE      = 45        # Servo degrees for cleaning position (empirically determined)
NORMAL_ANGLE        = 90        # Servo resting position
WEATHER_POLL_SECS   = 3600      # Fetch Open-Meteo once per hour
SENSOR_POLL_MS      = 60000     # ESP32 POST interval (firmware side, for reference)
```

## Communication overview

- **ESP32 → Flask:** HTTP POST `/data` every minute with JSON sensor payload
- **Flask → ESP32:** JSON response body with `{ "command": "none" | "clean" | "reset" }`
- **Browser → Flask:** GET `/status` every 1 minute for live data; GET `/history/sensor` and `/history/weather` for graph data; POST `/command` for user actions
- **Flask → Open-Meteo:** GET request once per hour, result stored in SQLite and in-memory state
- **Flask → SQLite:** Every sensor reading and every weather fetch is persisted
