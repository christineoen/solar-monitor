# 06 — Efficiency Calculation and Alert Logic

## What to build

A module `app/efficiency.py` containing the logic for calculating expected power output, computing the efficiency ratio, and determining whether a cleaning alert should be triggered.

## File location

`app/efficiency.py`

## Constants

```python
PANEL_AREA_M2       = 0.008   # 80mm x 100mm solar panel
EFFICIENCY_FACTOR   = 0.16    # Calibrate empirically with clean panel — start at 0.16 (16%)
ALERT_THRESHOLD     = 0.6     # Efficiency ratio below this may indicate obstruction
ALERT_DURATION_SECS = 300     # Ratio must be below threshold for 5 minutes before alerting
```

## Core calculation

Expected power output in milliwatts:

```
expected_power_mw = irradiance_wm2 × PANEL_AREA_M2 × EFFICIENCY_FACTOR × 1000
```

Efficiency ratio:

```
efficiency = actual_power_mw / expected_power_mw
```

If `expected_power_mw` is zero or very low (e.g. nighttime, irradiance < 10 W/m²), skip the ratio calculation and set efficiency to `1.0` — do not trigger alerts when there is no meaningful solar input.

## Alert logic

The alert must not fire on a single low reading — it requires the ratio to be below threshold for a sustained period (5 minutes by default) to avoid false positives from transient cloud cover.

Logic:

1. If `efficiency < ALERT_THRESHOLD`:
   - If `state["below_threshold_since"]` is `None`, set it to `time.time()`
   - If `time.time() - state["below_threshold_since"] >= ALERT_DURATION_SECS`, set `state["alert_active"] = True`
2. If `efficiency >= ALERT_THRESHOLD`:
   - Reset `state["below_threshold_since"]` to `None`
   - Do NOT automatically clear `state["alert_active"]` — alerts are only cleared by the user issuing a `reset` command from the dashboard

## Function to export

```python
def calculate_efficiency():
    """
    Reads state["power_mw"] and state["irradiance_wm2"].
    Updates state["expected_power_mw"], state["efficiency"],
    state["below_threshold_since"], and state["alert_active"].
    Called by the /data route on every ESP32 POST.
    """
```

## Notes

- Import `state` from `app.state`
- All reads and writes are directly to the `state` dict
- The function has no return value — it mutates state in place
- `EFFICIENCY_FACTOR` should be easy to update — a comment in the file should note that it needs to be calibrated during testing with a clean panel under a consistent light source
