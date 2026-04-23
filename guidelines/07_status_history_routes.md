# 07 — GET /status and GET /history Routes

## What to build

Three read-only endpoints used by the browser dashboard to retrieve live state and historical data.

## File location

`app/routes/status.py` and `app/routes/history.py` — register each as a Blueprint.

---

## GET /status

Returns the current in-memory state. Called by the browser every second.

### Response body

```json
{
    "voltage_v":          4.85,
    "current_ma":         180.0,
    "power_mw":           873.0,
    "expected_power_mw":  1120.0,
    "efficiency":         0.78,
    "irradiance_wm2":     700.0,
    "alert_active":       false,
    "pending_command":    "none",
    "last_esp32_contact": 0.4
}
```

`last_esp32_contact` is seconds since the last ESP32 POST, from `seconds_since_last_contact()` in `app/state.py`. If the ESP32 has never connected, return `null`.

### Response code
- `200` always

---

## GET /history/sensor

Returns time-series sensor readings from SQLite for graphing.

### Query parameter
- `minutes` (optional, default: 60) — how far back to retrieve data

### Example request
```
GET /history/sensor?minutes=120
```

### Response body

```json
{
    "readings": [
        {
            "timestamp":    "2026-04-01T10:00:00",
            "voltage_v":    4.85,
            "current_ma":   180.0,
            "power_mw":     873.0,
            "efficiency":   0.78,
            "alert_active": 0
        }
    ]
}
```

### Notes
- Calls `get_sensor_history(minutes)` from `app/database.py`
- Validate that `minutes` is a positive integer — default to 60 if invalid
- Returns an empty `readings` list if no data exists yet

---

## GET /history/weather

Returns time-series irradiance readings from SQLite for graphing.

### Query parameter
- `hours` (optional, default: 24) — how far back to retrieve data

### Example request
```
GET /history/weather?hours=48
```

### Response body

```json
{
    "readings": [
        {
            "timestamp":      "2026-04-01T10:00:00",
            "irradiance_wm2": 700.0
        }
    ]
}
```

### Notes
- Calls `get_weather_history(hours)` from `app/database.py`
- Validate that `hours` is a positive integer — default to 24 if invalid
- Returns an empty `readings` list if no data exists yet
- Weather data updates only once per hour so the array will have far fewer points than sensor history — this is expected
