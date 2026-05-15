#include "LightSensors.h"
#include "Config.h"

void beginLightSensors() {
  pinMode(PIN_ZUO_XIA, INPUT);
  pinMode(PIN_ZUO_SHANG, INPUT);
  pinMode(PIN_YOU_SHANG, INPUT);
  pinMode(PIN_YOU_XIA, INPUT);

  analogSetPinAttenuation(PIN_ZUO_XIA, ADC_11db);
  analogSetPinAttenuation(PIN_ZUO_SHANG, ADC_11db);
  analogSetPinAttenuation(PIN_YOU_SHANG, ADC_11db);
  analogSetPinAttenuation(PIN_YOU_XIA, ADC_11db);
}

/*
  Read and derive LDR values.

  1. Read raw values from the four corners;
  2. Average top/bottom rows for vertical tracking;
  3. Average left/right columns for horizontal tracking;
  4. Calculate differences and overall light level.
*/
void readLightSensors(LightData &data) {
  data.zouxia   = analogRead(PIN_ZUO_XIA);
  data.zoushang = analogRead(PIN_ZUO_SHANG);
  data.youshang = analogRead(PIN_YOU_SHANG);
  data.youxia   = analogRead(PIN_YOU_XIA);

  data.shangZY = (data.zoushang + data.youshang) / 2;
  data.xiaZY   = (data.zouxia + data.youxia) / 2;

  data.zouSX   = (data.zoushang + data.zouxia) / 2;
  data.youSX   = (data.youshang + data.youxia) / 2;

  data.sxcz = abs(data.shangZY - data.xiaZY);
  data.zycz = abs(data.zouSX - data.youSX);

  data.avgLight = (data.zoushang + data.youshang + data.zouxia + data.youxia) / 4;
}