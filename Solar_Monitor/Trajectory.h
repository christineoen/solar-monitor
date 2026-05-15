#ifndef TRAJECTORY_H
#define TRAJECTORY_H

/*
  Servo movement and tracking control
  
  This module handles servo initialization, angle clamping, smooth movement,
  time-based trajectory targets, LDR tracking adjustments, and cleaning posture.
*/
#include <Arduino.h>

void beginServos();

void setBaseAngle(int angle);
void setPanelAngle(int angle);
void moveToAngles(int baseTarget, int panelTarget);
void moveToAnglesTimed(int baseTarget, int panelTarget, unsigned long durationMs);

void applyLightTrackingControl();
void applyCleaningPosition();

int clampAngle(int angle);

#endif
