# 05 — Open-Meteo Weather Polling

## What to build

A background thread that fetches hourly solar irradiance data from the Open-Meteo API once per hour and stores it in both the in-memory state and SQLite.

## File location

`app/weather.py`

## Open-Meteo API

```
GET https://api.open-meteo.com/v1/forecast
    ?latitude=-31.95
    &longitude=115.86
    &hourly=shortwave_radiation
    &timezone=Australia%2FPerth
    &forecast_days=1
```

- No API key required
- Returns hourly `shortwave_radiation` values in W/m² for the current day
- Perth coordinates: latitude -31.95, longitude 115.86
- `shortwave_radiation` is global horizontal irradiance — the correct metric for estimating expected panel output

## Parsing the response

The response looks like:

```json
{
  "hourly": {
    "time": ["2026-04-01T00:00", "2026-04-01T01:00", ...],
    "shortwave_radiation": [0.0, 0.0, 45.2, 312.5, ...]
  }
}
```

Find the entry whose time is closest to the current local time and use its `shortwave_radiation` value as the current irradiance.

## What the thread must do

1. On startup, fetch immediately (don't wait an hour before the first reading)
2. On each successful fetch:
   - Update `state["irradiance_wm2"]` with the current hour's value
   - Update `state["weather_last_fetched"]` with `time.time()`
   - Call `insert_weather_reading()` from `app/database.py` to persist it
3. On fetch failure (network error, bad response): log the error and retain the last known value — do not crash the thread
4. Sleep for `WEATHER_POLL_SECS` (3600) seconds between fetches
5. Run as a daemon thread so it exits automatically when the main process exits

## Function to export

```python
def start_weather_thread():
    """Start the background weather polling thread. Call once from create_app()."""
```

## Constants

Import these from a central location or define at the top of the file:

```python
WEATHER_POLL_SECS = 3600
OPEN_METEO_URL = (
    "https://api.open-meteo.com/v1/forecast"
    "?latitude=-31.95&longitude=115.86"
    "&hourly=shortwave_radiation"
    "&timezone=Australia%2FPerth"
    "&forecast_days=1"
)
```

## Notes

- Use `threading.Thread(target=..., daemon=True)`
- Wrap the fetch in a `try/except` so a temporary network outage doesn't kill the thread
- If irradiance comes back as `None` or negative for the current hour (e.g. nighttime), set it to `0.0`
