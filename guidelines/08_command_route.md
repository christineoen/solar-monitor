# 08 — POST /command Route

## What to build

The endpoint the browser dashboard calls when the user issues a servo command. Stores the command as pending in state — the ESP32 picks it up on its next POST to /data.

## File location

`app/routes/command.py` — register as a Blueprint named `command_bp`.

## Route

```
POST /command
Content-Type: application/json
```

## Valid commands

| Command | Description |
|---|---|
| `"clean"` | Move both servo motors to the cleaning position angle |
| `"reset"` | Return both servo motors to the normal resting position and clear the alert |

## Request body

```json
{ "command": "clean" }
```

or

```json
{ "command": "reset" }
```

## What the route must do

1. Parse and validate the incoming JSON
2. Check that `command` is either `"clean"` or `"reset"` — return `400` for anything else
3. Set `state["pending_command"]` to the received command value
4. If the command is `"reset"`, also clear the alert: set `state["alert_active"]` to `False` and `state["below_threshold_since"]` to `None`
5. Return a success response

## Response body

```json
{ "ok": true }
```

## Response codes

- `200` — command accepted
- `400` — missing field or invalid command value

## Notes

- The command is not sent to the ESP32 directly from this route — it is stored in `state["pending_command"]` and delivered as a piggybacked response body the next time the ESP32 calls POST /data
- The /data route is responsible for clearing `pending_command` back to `"none"` after returning it to the ESP32
- If the user clicks the button multiple times before the ESP32 polls, only the latest command matters — `state["pending_command"]` is simply overwritten
