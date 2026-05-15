#include <Arduino.h>

#include "Config.h"
#include "State.h"
#include "LightSensors.h"
#include "PowerMonitor.h"
#include "Trajectory.h"
#include "WebDashboard.h"
#include "CloudUpload.h"

AppState state;

static unsigned long lastSensorReadMs = 0;
static unsigned long lastDashboardCommandPollMs = 0;
static unsigned long lastDashboardUploadMs = 0;
static unsigned long lastLdrTrackingMs = 0;
static unsigned long lastLdrTrackingPeriodStartMs = 0;
static unsigned long lastLdrTrackingPeriodSec = 0;
static unsigned long dirtyStartMs = 0;
static bool lastLdrTrackingEnabled = false;

/*
  Detect whether the panel may need cleaning.

  The panel is flagged dirty only when light is strong enough, a clean baseline
  exists, and power stays below the configured ratio for DIRTY_CONFIRM_MS.
*/
static void updateCleaningStatus() {
  bool brightEnough = state.light.avgLight < BRIGHT_LIGHT_THRESHOLD;
  bool referenceValid = state.cleanReferencePowerW > 0.05f;
  bool powerTooLow = state.power.estimatedPowerW < state.cleanReferencePowerW * CLEAN_DROP_RATIO;

  if (brightEnough && referenceValid && powerTooLow) {
    if (dirtyStartMs == 0) {
      dirtyStartMs = millis();
    }

    if (millis() - dirtyStartMs > DIRTY_CONFIRM_MS) {
      state.needsCleaning = true;
    }
  } else {
    dirtyStartMs = 0;

    if (state.power.estimatedPowerW > state.cleanReferencePowerW * 0.85f) {
      state.needsCleaning = false;
    }
  }

  if (state.needsCleaning && AUTO_TILT_WHEN_DIRTY && state.mode == MODE_AUTO) {
    state.mode = MODE_CLEANING;
    applyCleaningPosition();
  }
}

//Prints mode, LDR values, servo angles, current readings, and upload status.
static void printDebugInfo() {
  Serial.print("Mode: ");
  Serial.print(modeToString(state.mode));

  Serial.print(" | Light LT/RT/LB/RB: ");
  Serial.print(state.light.zoushang);
  Serial.print("/");
  Serial.print(state.light.youshang);
  Serial.print("/");
  Serial.print(state.light.zouxia);
  Serial.print("/");
  Serial.print(state.light.youxia);

  Serial.print(" | Base: ");
  Serial.print(state.baseAngle);

  Serial.print(" | Panel: ");
  Serial.print(state.panelAngle);

  Serial.print(" | ACS raw: ");
  Serial.print(state.power.acsRaw);
  Serial.print(" zero/delta: ");
  Serial.print(state.power.acsZeroRaw);
  Serial.print("/");
  Serial.print(state.power.acsDeltaRaw);

  Serial.print(" | Meter: ");
  Serial.print(state.power.meterOk ? "OK" : "CHECK");

  Serial.print(" | ACS V: ");
  Serial.print(state.power.acsVoltage, 3);

  Serial.print(" | Current: ");
  Serial.print(state.power.currentA, 3);

  Serial.print(" | Estimated Power: ");
  Serial.print(state.power.estimatedPowerW, 3);

  Serial.print(" | Cleaning: ");
  Serial.print(state.needsCleaning ? "YES" : "NO");

  Serial.print(" | LDR Tracking: ");
  Serial.print(state.ldrTrackingEnabled ? "ON" : "OFF");
  Serial.print("/");
  Serial.print(state.ldrTrackingPeriodSec == 0 ? "continuous" : String(state.ldrTrackingPeriodSec) + "s");

  Serial.print(" | Upload: ");
  Serial.println(state.dashboardStatus);
}

void setup() {
  Serial.begin(115200);
  delay(500);

  analogReadResolution(12);

  beginLightSensors();
  beginPowerMonitor();
  beginServos();

  beginWebDashboard();
  beginCloudUpload();

  readLightSensors(state.light);
  readPowerMonitor(state.power);

  lastSensorReadMs = millis();
  lastDashboardCommandPollMs = millis();
  lastDashboardUploadMs = millis();
  lastLdrTrackingMs = millis();

  Serial.println("System started.");
}

void loop() {
  handleWebDashboard();

  unsigned long now = millis();

  // 开关打开时，Auto 模式使用 taiyang.ino 风格的光敏追光。
  bool ldrTrackingWindowActive = false;
  if (state.mode == MODE_AUTO && state.ldrTrackingEnabled) {
    if (
      !lastLdrTrackingEnabled
      || lastLdrTrackingPeriodSec != state.ldrTrackingPeriodSec
    ) {
      lastLdrTrackingPeriodStartMs = 0;
      lastLdrTrackingMs = 0;
      lastLdrTrackingPeriodSec = state.ldrTrackingPeriodSec;
    }

    lastLdrTrackingEnabled = true;

    ldrTrackingWindowActive = true;
    if (state.ldrTrackingPeriodSec > 0) {
      unsigned long periodMs = state.ldrTrackingPeriodSec * 1000UL;
      if (
        lastLdrTrackingPeriodStartMs == 0
        || now - lastLdrTrackingPeriodStartMs >= periodMs
      ) {
        lastLdrTrackingPeriodStartMs = now;
      }

      ldrTrackingWindowActive = now - lastLdrTrackingPeriodStartMs <= LDR_TRACKING_BURST_MS;
    }

    if (ldrTrackingWindowActive && now - lastLdrTrackingMs >= LDR_TRACKING_INTERVAL_MS) {
      lastLdrTrackingMs = now;
      applyLightTrackingControl();
    }
  } else {
    lastLdrTrackingEnabled = false;
  }

  if (now - lastSensorReadMs >= SENSOR_INTERVAL_MS) {
    lastSensorReadMs = now;

    readLightSensors(state.light);
    readPowerMonitor(state.power);
    updateCleaningStatus();

    printDebugInfo();
  }

  unsigned long commandPollInterval = ldrTrackingWindowActive
    ? DASHBOARD_COMMAND_POLL_INTERVAL_DURING_LDR_MS
    : DASHBOARD_COMMAND_POLL_INTERVAL_MS;
  if (now - lastDashboardCommandPollMs >= commandPollInterval) {
    lastDashboardCommandPollMs = now;
    pollDashboardCommand();
  }

  unsigned long uploadInterval = ldrTrackingWindowActive
    ? DASHBOARD_UPLOAD_INTERVAL_DURING_LDR_MS
    : DASHBOARD_UPLOAD_INTERVAL_MS;
  if (now - lastDashboardUploadMs >= uploadInterval) {
    lastDashboardUploadMs = now;
    uploadSensorReadingToDashboard();
  }

  // Auto mode holds the current angle unless Light Tracking is enabled.
  // Cleaning and tilt-clear movement are controlled by dashboard commands.
}
