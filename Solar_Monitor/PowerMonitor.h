#ifndef POWER_MONITOR_H
#define POWER_MONITOR_H

#include <Arduino.h>

struct PowerData {
  int acsRaw = 0;
  int acsZeroRaw = 0;
  int acsDeltaRaw = 0;
  float acsVoltage = 0.0f;
  float currentA = 0.0f;
  bool meterOk = false;

  // 现在没有分压电阻，所以这里是估算电压，不是真实测量电压
  float estimatedVoltage = 0.0f;
  float estimatedPowerW = 0.0f;
};

void beginPowerMonitor();
void readPowerMonitor(PowerData &data);
void calibrateACSZero();
bool getACSZeroReady();

#endif
