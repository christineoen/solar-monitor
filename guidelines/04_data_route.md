# 04 — POST /data Route

## What to build

The endpoint the ESP32 calls every 500ms to deliver sensor readings. This is the main ingestion point for all hardware data.

## Route

```
POST /data
Content-Type: application/json
```

## Request body (sent by ESP32)

```json
{
    "voltage_v":  4.85,
    "current_ma": 180.0,
    "power_mw":   873.0
}
```

All three fields are required. Return `400` if any are missing.

## What the route must do

1. Parse and validate the incoming JSON — return `400` with an error message if fields are missing or not numeric
2. Update `state` with the new sensor values (`voltage_v`, `current_ma`, `power_mw`)
3. Update `state["last_esp32_contact"]` with `time.time()`
4. Call `calculate_efficiency()` from `app/efficiency.py` to update `state["efficiency"]`, `state["expected_power_mw"]`, and `state["alert_active"]`
5. Call `insert_sensor_reading()` from `app/database.py` to persist the reading
6. Read `state["pending_command"]` to include in the response
7. Clear `state["pending_command"]` back to `"none"` immediately after reading it — the command must only fire once
8. Return the command as JSON

## Response body

```json
{ "command": "none" }
```

or when a command is pending:

```json
{ "command": "clean" }
```

```json
{ "command": "reset" }
```

## Response codes

- `200` — success
- `400` — missing or invalid fields

## File location

`app/routes/data.py` — register as a Blueprint named `data_bp`.

## Example implementation outline

```python
from flask import Blueprint, request, jsonify
from app.state import state
from app.database import insert_sensor_reading
from app.efficiency import calculate_efficiency
import time

data_bp = Blueprint('data', __name__)

@data_bp.route('/data', methods=['POST'])
def receive_data():
    # 1. Parse JSON
    # 2. Validate fields
    # 3. Update state
    # 4. Calculate efficiency and alert
    # 5. Persist to database
    # 6. Read and clear pending command
    # 7. Return command
    pass
```
