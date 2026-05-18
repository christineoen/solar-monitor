#include "Trajectory.h"
#include "Config.h"
#include "State.h"
#include "LightSensors.h"

#include <ESP32Servo.h>
#include <math.h>

static Servo servoBase;
static Servo servoPanel;


int clampAngle(int angle) {
  if (angle < 0) return 0;
  if (angle > 180) return 180;
  return angle;
}

void beginServos() {
  servoBase.setPeriodHertz(50);
  servoPanel.setPeriodHertz(50);

  servoBase.attach(SERVO_BASE_PIN, 500, 2500);
  servoPanel.attach(SERVO_PANEL_PIN, 500, 2500);

  servoBase.write(state.baseAngle);
  servoPanel.write(state.panelAngle);

  delay(300);
}

void setBaseAngle(int angle) {
  state.baseAngle = clampAngle(angle);
  servoBase.write(state.baseAngle);
}

void setPanelAngle(int angle) {
  state.panelAngle = clampAngle(angle);
  servoPanel.write(state.panelAngle);
}

void moveToAngles(int baseTarget, int panelTarget) {
  baseTarget = clampAngle(baseTarget);
  panelTarget = clampAngle(panelTarget);

  while (state.baseAngle != baseTarget || state.panelAngle != panelTarget) {
    if (state.baseAngle < baseTarget) state.baseAngle++;
    else if (state.baseAngle > baseTarget) state.baseAngle--;

    if (state.panelAngle < panelTarget) state.panelAngle++;
    else if (state.panelAngle > panelTarget) state.panelAngle--;

    servoBase.write(state.baseAngle);
    servoPanel.write(state.panelAngle);

    delay(10);
  }
}

void moveToAnglesTimed(int baseTarget, int panelTarget, unsigned long durationMs) {
  baseTarget = clampAngle(baseTarget);
  panelTarget = clampAngle(panelTarget);

  if (durationMs == 0) {
    moveToAngles(baseTarget, panelTarget);
    return;
  }

  int startBase = state.baseAngle;
  int startPanel = state.panelAngle;
  unsigned long startedAt = millis();

  while (true) {
    unsigned long elapsed = millis() - startedAt;
    float progress = elapsed >= durationMs ? 1.0f : (float)elapsed / (float)durationMs;

    int nextBase = startBase + (int)round((baseTarget - startBase) * progress);
    int nextPanel = startPanel + (int)round((panelTarget - startPanel) * progress);

    setBaseAngle(nextBase);
    setPanelAngle(nextPanel);

    if (progress >= 1.0f) {
      break;
    }

    delay(20);
  }

  setBaseAngle(baseTarget);
  setPanelAngle(panelTarget);
}


void applyLightTrackingControl() {
  readLightSensors(state.light);

  // Same behavior as taiyang.ino: lower analog value means stronger light.
  if (state.light.zycz > LDR_HORIZONTAL_REACTION) {
    int direction = LDR_INVERT_HORIZONTAL ? -1 : 1;
    if (state.light.youSX < state.light.zouSX) {
      setBaseAngle(state.baseAngle + direction * LDR_HORIZONTAL_STEP_DEG);
      delay(1);
    } else if (state.light.zouSX < state.light.youSX) {
      setBaseAngle(state.baseAngle - direction * LDR_HORIZONTAL_STEP_DEG);
      delay(1);
    }
  }

  if (state.light.sxcz > LDR_VERTICAL_REACTION) {
    int direction = LDR_INVERT_VERTICAL ? -1 : 1;
    if (state.light.xiaZY < state.light.shangZY) {
      setPanelAngle(state.panelAngle + direction * LDR_VERTICAL_STEP_DEG);
      delay(1);
    } else if (state.light.shangZY < state.light.xiaZY) {
      setPanelAngle(state.panelAngle - direction * LDR_VERTICAL_STEP_DEG);
      delay(1);
    }
  }
}

void applyCleaningPosition() {
  setPanelAngle(CLEAN_PANEL_ANGLE);
}
