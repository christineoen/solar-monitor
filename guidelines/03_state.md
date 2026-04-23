# 03 — Shared In-Memory State

## What to build

A single module `app/state.py` that holds the application's shared in-memory state. All routes and the weather thread read and write from this dict.

## app/state.py

```python
import time

state = {
    # Latest sensor reading from ESP32
    "voltage_v":        0.0,
    "current_ma":       0.0,
    "power_mw":         0.0,

    # Calculated values
    "efficiency":       1.0,    # actual / expected power ratio (0.0 - 1.0+)
    "expected_power_mw": 0.0,   # calculated from latest irradiance

    # Alert state
    "alert_active":     False,
    "below_threshold_since": None,  # timestamp when ratio first dropped below threshold

    # Latest weather data
    "irradiance_wm2":   0.0,
    "weather_last_fetched": None,   # timestamp of last successful Open-Meteo fetch

    # Pending servo command — cleared after ESP32 picks it up
    "pending_command":  "none",     # "none" | "clean" | "reset"

    # Connection health
    "last_esp32_contact": None,     # time.time() of last POST /data
}
```

## Usage

Import `state` directly in any module that needs it:

```python
from app.state import state
```

All reads and writes are to this single dict. No locking is required for this prototype — Flask's development server is single-threaded for request handling, and the weather thread only writes `irradiance_wm2` and `weather_last_fetched`.

## Helper: `seconds_since_last_contact()`

Add this function to `state.py`:

```python
def seconds_since_last_contact():
    if state["last_esp32_contact"] is None:
        return None
    return round(time.time() - state["last_esp32_contact"], 1)
```

Used by the `/status` route to report how long ago the ESP32 last checked in, so the dashboard can show a disconnected warning if the ESP32 goes offline.
