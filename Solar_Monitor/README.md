# Solar Tracker 

## Project Overview
This project uses an ESP32 to control a dual-servo solar panel tracking and monitoring system. The device reads four LDR light sensors and an ACS712 current sensor, adjusts panel angles based on light differences, and uploads telemetry directly to Supabase. Users can view status, switch modes, set angles, and trigger cleaning-related actions through the local ESP32 web page or the cloud dashboard.

## Data Path
```text
ESP32 -> Supabase -> HTML Dashboard
```

## Core Modules

- `Solar_Monitor.ino`:Main sketch for initialization and loop scheduling.
- `Config.h`:Wi-Fi, Supabase, pins, thresholds, and control constants.
- `State.h`:Global state and control modes.
- `LightSensors.*`:Reads four LDRs and calculates vertical/horizontal differences.
- `PowerMonitor.*`:Reads ACS712 and estimates current/power.
- `Trajectory.*`:Servo control, LDR tracking, automatic trajectory, and cleaning posture.
- `WebDashboard.*`:Local ESP32 web page and API.
- `CloudUpload.*`:Supabase upload and command polling.

New data path:

```text
ESP32 -> Supabase -> HTML Dashboard
```

The local Flask server and local SQLite database are no longer required for the web dashboard.


## Check upload result

Open Arduino Serial Monitor at:

```text
115200 baud
```

A successful upload should show something like:

```text
Supabase upload status: 201
```

Any 2xx status means the ESP32 reached Supabase successfully.

Common errors:

- `401`: Supabase key is wrong.
- `403`: RLS policy is wrong or SQL was not run.
- `404`: table name or Supabase URL is wrong.
- `400`: inserted fields do not match the table schema.
- negative status: Wi-Fi or HTTPS connection problem.
