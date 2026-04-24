# 09 — Browser Dashboard

## What to build

A single-page dashboard served at `GET /` as `app/templates/index.html`. No frontend framework — plain HTML, CSS, and JavaScript only.

## Layout

```
┌─────────────────────────────────────────────────────┐
│  Solar Panel Monitor               [status indicator] │
├──────────────┬──────────────┬──────────────┬─────────┤
│  Power       │  Voltage     │  Current     │Efficiency│
│  873 mW      │  4.85 V      │  180 mA      │  78%    │
├──────────────┴──────────────┴──────────────┴─────────┤
│                                                       │
│   [Dual-axis time series chart — actual vs expected]  │
│                                                       │
├───────────────────────────────────────────────────────┤
│  [Alert banner — hidden unless alert_active is true]  │
│  "Panel output is below expected for current          │
│   conditions. Panel may need cleaning."               │
│  [Move to cleaning position]   [Done cleaning]        │
└───────────────────────────────────────────────────────┘
```

## Live data polling

Poll `GET /status` every 60000ms using `setInterval` and `fetch`. Update all stat cards on each response.

Show a disconnected warning banner if `last_esp32_contact` is greater than 90 seconds or is `null`.

## Chart

Use [Chart.js](https://cdn.jsdelivr.net/npm/chart.js) loaded from CDN — no npm.

Draw a dual-axis line chart:
- **Left Y axis:** Panel power output in mW (from sensor history) — blue line
- **Right Y axis:** Solar irradiance in W/m² (from weather history) — orange line
- **X axis:** Timestamp

On page load, fetch both:
```
GET /history/sensor?minutes=60
GET /history/weather?hours=2
```

Refresh the chart every 30 seconds with new history data — do not refresh on every status poll as this would be excessive.

Map sensor readings to chart points: `{ x: timestamp, y: power_mw }`.
Map weather readings to chart points: `{ x: timestamp, y: irradiance_wm2 }`.

## Alert banner

Hidden by default (`display: none`).

When `status.alert_active` is `true`:
- Show the banner with a yellow/amber background
- Display: "Panel output is below expected for current conditions. Panel may need cleaning."
- Show two buttons: "Move to cleaning position" and "Done cleaning"

When `status.alert_active` is `false`:
- Hide the banner

### Button behaviour

**"Move to cleaning position"** button:
```javascript
fetch('/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: 'clean' })
});
```
Disable the button after clicking to prevent duplicate commands. Re-enable if the alert is still active on the next status poll.

**"Done cleaning"** button:
```javascript
fetch('/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: 'reset' })
});
```
The alert banner will disappear on the next status poll once Flask confirms `alert_active` is false.

## Status indicator

Top right corner. Show:
- Green dot + "Connected" when `last_esp32_contact` < 90 seconds
- Red dot + "Disconnected" when `last_esp32_contact` >= 90 seconds or is null

## Stat cards

| Card | Value | Unit |
|---|---|---|
| Power | `power_mw` | mW |
| Voltage | `voltage_v` | V |
| Current | `current_ma` | mA |
| Efficiency | `efficiency * 100` | % |

## Notes

- JavaScript lives in `app/static/dashboard.js` — loaded via `<script src="/static/dashboard.js">` at the bottom of the body
- CSS lives in `app/static/styles.css` — loaded via `<link rel="stylesheet">` in the `<head>`
- Use a clean, minimal design with a dark header bar and white card panels
- The page should work on both desktop and a tablet-sized screen
- Do not use any JS framework (no React, Vue, etc.)
