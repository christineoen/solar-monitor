import time
from app.state import state

PANEL_AREA_M2       = 0.008
EFFICIENCY_FACTOR   = 0.16  # Calibrate with a clean panel under known light before deploying
ALERT_THRESHOLD     = 0.6
ALERT_DURATION_SECS = 300


def calculate_efficiency():
    """
    Reads state["power_mw"] and state["irradiance_wm2"].
    Updates state["expected_power_mw"], state["efficiency"],
    state["below_threshold_since"], and state["alert_active"].
    Called by the /data route on every ESP32 POST.
    """
    irradiance = state["irradiance_wm2"]
    expected = irradiance * PANEL_AREA_M2 * EFFICIENCY_FACTOR * 1000
    state["expected_power_mw"] = expected

    if expected < 10:
        state["efficiency"] = 1.0
        state["below_threshold_since"] = None
        return

    efficiency = state["power_mw"] / expected
    state["efficiency"] = efficiency

    if efficiency < ALERT_THRESHOLD:
        if state["below_threshold_since"] is None:
            state["below_threshold_since"] = time.time()
        elif time.time() - state["below_threshold_since"] >= ALERT_DURATION_SECS:
            state["alert_active"] = True
    else:
        state["below_threshold_since"] = None
