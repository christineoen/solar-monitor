#ifndef LIGHT_SENSORS_H
#define LIGHT_SENSORS_H

#include <Arduino.h>

struct LightData {
  int zoushang = 0; // left top
  int youshang = 0; // right top
  int zouxia = 0;   // left bottom
  int youxia = 0;   // right bottom

  // Average value of the top row and bottom row.
  int shangZY = 0;
  int xiaZY = 0;
  // Average value of the left column and right column.
  int zouSX = 0;
  int youSX = 0;
  
  // Vertical and horizontal differences used to decide whether movement is needed.
  int sxcz = 0;
  int zycz = 0;

  // Average of all four sensors, used to estimate whether ambient light is strong enough.
  int avgLight = 0;
};

void beginLightSensors();
void readLightSensors(LightData &data);

#endif