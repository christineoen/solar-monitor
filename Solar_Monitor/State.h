#ifndef STATE_H
#define STATE_H

/*
  This file defines operating modes and AppState. All modules share one state
  object so the dashboard, Supabase sync, sensors, and servo control stay consistent.
*/
#include <Arduino.h>
#include "LightSensors.h"
#include "PowerMonitor.h"

enum ControlMode {
  MODE_AUTO,
  MODE_MANUAL,
  MODE_CLEANING,
  MODE_TILT_CLEAR,
  MODE_BASELINE
};

struct AppState {
  LightData light;
  PowerData power;

  int baseAngle = 90;
  int panelAngle = 90;

  ControlMode mode = MODE_AUTO;

  float cleanReferencePowerW = 0.30f;
  bool needsCleaning = false;
  bool ldrTrackingEnabled = false;
  unsigned long ldrTrackingPeriodSec = 0;
  bool dashboardUploadOk = false;
  String dashboardStatus = "not_uploaded";
};

extern AppState state;

inline String modeToString(ControlMode mode) {
  switch (mode) {
    case MODE_AUTO:
      return "auto";
    case MODE_MANUAL:
      return "manual";
    case MODE_CLEANING:
      return "cleaning";
    case MODE_TILT_CLEAR:
      return "tilt_clear";
    case MODE_BASELINE:
      return "baseline";
    default:
      return "UNKNOWN";
  }
}

#endif
