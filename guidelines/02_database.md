# 02 — Database

## What to build

SQLite database setup and read/write helper functions used by routes and the weather thread. Use Python's built-in `sqlite3` module — no ORM.

## Database file

Store the database at `solar_monitor.db` in the project root.

## Schema

### Table: `sensor_readings`

Stores every reading POSTed by the ESP32.

```sql
CREATE TABLE IF NOT EXISTS sensor_readings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp       DATETIME DEFAULT CURRENT_TIMESTAMP,
    voltage_v       REAL,
    current_ma      REAL,
    power_mw        REAL,
    efficiency      REAL,
    alert_active    INTEGER   -- 0 or 1
);
```

### Table: `weather_readings`

Stores each hourly irradiance value fetched from Open-Meteo.

```sql
CREATE TABLE IF NOT EXISTS weather_readings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp       DATETIME DEFAULT CURRENT_TIMESTAMP,
    irradiance_wm2  REAL
);
```

## Functions to implement in app/database.py

### `init_db()`
Creates both tables if they do not exist. Called once at app startup from `create_app()`.

### `insert_sensor_reading(voltage_v, current_ma, power_mw, efficiency, alert_active)`
Inserts one row into `sensor_readings`. Called by the `/data` route on every ESP32 POST.

### `insert_weather_reading(irradiance_wm2)`
Inserts one row into `weather_readings`. Called by the weather polling thread on each successful fetch.

### `get_sensor_history(minutes=60)`
Returns a list of dicts for all `sensor_readings` rows within the last `minutes` minutes. Each dict should have keys: `timestamp`, `voltage_v`, `current_ma`, `power_mw`, `efficiency`, `alert_active`.

### `get_weather_history(hours=24)`
Returns a list of dicts for all `weather_readings` rows within the last `hours` hours. Each dict should have keys: `timestamp`, `irradiance_wm2`.

## Notes

- Use `row_factory = sqlite3.Row` on the connection so rows can be accessed by column name
- Open and close a connection within each function — do not hold a persistent connection
- All timestamps are stored and returned as ISO 8601 strings
- Add a cleanup function `purge_old_data()` that deletes sensor readings older than 7 days and weather readings older than 30 days. This should be called once at startup from `init_db()`.
