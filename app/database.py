import sqlite3

DB_PATH = "solar_monitor.db"


def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = _connect()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS sensor_readings (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp    DATETIME DEFAULT CURRENT_TIMESTAMP,
            voltage_v    REAL,
            current_ma   REAL,
            power_mw     REAL,
            efficiency   REAL,
            alert_active INTEGER
        );

        CREATE TABLE IF NOT EXISTS weather_readings (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp      DATETIME DEFAULT CURRENT_TIMESTAMP,
            irradiance_wm2 REAL
        );
    """)
    conn.commit()
    conn.close()
    purge_old_data()


def purge_old_data():
    conn = _connect()
    conn.execute("DELETE FROM sensor_readings WHERE timestamp < datetime('now', '-7 days')")
    conn.execute("DELETE FROM weather_readings WHERE timestamp < datetime('now', '-30 days')")
    conn.commit()
    conn.close()


def insert_sensor_reading(voltage_v, current_ma, power_mw, efficiency, alert_active):
    conn = _connect()
    conn.execute(
        "INSERT INTO sensor_readings (voltage_v, current_ma, power_mw, efficiency, alert_active) VALUES (?, ?, ?, ?, ?)",
        (voltage_v, current_ma, power_mw, efficiency, int(alert_active)),
    )
    conn.commit()
    conn.close()


def insert_weather_reading(irradiance_wm2):
    conn = _connect()
    conn.execute(
        "INSERT INTO weather_readings (irradiance_wm2) VALUES (?)",
        (irradiance_wm2,),
    )
    conn.commit()
    conn.close()


def get_sensor_history(minutes=60):
    conn = _connect()
    rows = conn.execute(
        "SELECT timestamp, voltage_v, current_ma, power_mw, efficiency, alert_active "
        "FROM sensor_readings WHERE timestamp >= datetime('now', ? || ' minutes') ORDER BY timestamp",
        (f"-{minutes}",),
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_weather_history(hours=24):
    conn = _connect()
    rows = conn.execute(
        "SELECT timestamp, irradiance_wm2 "
        "FROM weather_readings WHERE timestamp >= datetime('now', ? || ' hours') ORDER BY timestamp",
        (f"-{hours}",),
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]
