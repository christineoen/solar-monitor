import threading
import time
import requests
from app.state import state
from app.database import insert_weather_reading

WEATHER_POLL_SECS = 3600
OPEN_METEO_URL = (
    "https://api.open-meteo.com/v1/forecast"
    "?latitude=-31.95&longitude=115.86"
    "&hourly=shortwave_radiation"
    "&timezone=Australia%2FPerth"
    "&forecast_days=1"
)


def _fetch_irradiance():
    response = requests.get(OPEN_METEO_URL, timeout=10)
    response.raise_for_status()
    data = response.json()

    times = data["hourly"]["time"]
    values = data["hourly"]["shortwave_radiation"]

    now = time.localtime()
    current_hour_str = time.strftime("%Y-%m-%dT%H:00", now)

    # Find the entry closest to the current hour
    best_index = 0
    for i, t in enumerate(times):
        if t <= current_hour_str:
            best_index = i

    irradiance = values[best_index]
    if irradiance is None or irradiance < 0:
        irradiance = 0.0

    return irradiance


def _poll_loop():
    while True:
        try:
            irradiance = _fetch_irradiance()
            state["irradiance_wm2"] = irradiance
            state["weather_last_fetched"] = time.time()
            insert_weather_reading(irradiance)
        except Exception as e:
            print(f"[weather] fetch failed: {e}")
        time.sleep(WEATHER_POLL_SECS)


def start_weather_thread():
    """Start the background weather polling thread. Call once from create_app()."""
    t = threading.Thread(target=_poll_loop, daemon=True)
    t.start()
