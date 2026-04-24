import time

state = {
    "voltage_v":            0.0,
    "current_ma":           0.0,
    "power_mw":             0.0,
    "efficiency":           1.0,
    "expected_power_mw":    0.0,
    "alert_active":         False,
    "below_threshold_since": None,
    "irradiance_wm2":       0.0,
    "weather_last_fetched": None,
    "pending_command":      "none",
    "last_esp32_contact":   None,
}


def seconds_since_last_contact():
    if state["last_esp32_contact"] is None:
        return None
    return round(time.time() - state["last_esp32_contact"], 1)
