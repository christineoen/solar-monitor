#include "PowerMonitor.h"
#include "Config.h"
#include <math.h>

static float acsZero = ACS_ZERO_DEFAULT;
static int acsZeroRaw = (int)(ACS_ZERO_DEFAULT * 4095.0f / 3.3f + 0.5f);
static bool acsZeroReady = false;
static const int ACS_ZERO_MAX_SAMPLES = 2000;
static int acsZeroReadings[ACS_ZERO_MAX_SAMPLES];
static float filteredCurrentA = 0.0f;
static bool currentFilterReady = false;
static int currentZeroStreak = 0;

static void resetCurrentFilter() {
  filteredCurrentA = 0.0f;
  currentFilterReady = false;
  currentZeroStreak = 0;
}

static float filterCurrent(float current) {
  if (!currentFilterReady) {
    filteredCurrentA = current;
    currentFilterReady = true;
  } else {
    filteredCurrentA += CURRENT_FILTER_ALPHA * (current - filteredCurrentA);
  }

  return filteredCurrentA;
}

static int readAnalogStableAverage(int pin) {
  const int groups = 9;
  const int samplesPerGroup = 32;
  int groupValues[groups];

  for (int group = 0; group < groups; group++) {
    long sum = 0;
    for (int i = 0; i < samplesPerGroup; i++) {
      sum += analogRead(pin);
      delayMicroseconds(250);
    }
    groupValues[group] = sum / samplesPerGroup;
  }

  for (int i = 1; i < groups; i++) {
    int value = groupValues[i];
    int j = i - 1;
    while (j >= 0 && groupValues[j] > value) {
      groupValues[j + 1] = groupValues[j];
      j--;
    }
    groupValues[j + 1] = value;
  }

  long trimmedSum = 0;
  for (int i = 2; i <= 6; i++) {
    trimmedSum += groupValues[i];
  }

  return trimmedSum / 5;
}

void beginPowerMonitor() {
  pinMode(ACS_PIN, INPUT);
  analogSetPinAttenuation(ACS_PIN, ADC_11db);
}

void calibrateACSZero() {
  Serial.println("ACS zero calibration started. Waiting 5 seconds before sampling.");
  delay(5000);

  unsigned long startedAt = millis();
  int samples = 0;

  while (millis() - startedAt < 10000UL && samples < ACS_ZERO_MAX_SAMPLES) {
    acsZeroReadings[samples] = analogRead(ACS_PIN);
    samples++;
    delay(5);
  }

  if (samples <= 0) {
    return;
  }

  for (int i = 1; i < samples; i++) {
    int value = acsZeroReadings[i];
    int j = i - 1;
    while (j >= 0 && acsZeroReadings[j] > value) {
      acsZeroReadings[j + 1] = acsZeroReadings[j];
      j--;
    }
    acsZeroReadings[j + 1] = value;
  }

  int median = acsZeroReadings[samples / 2];

  int firstStableIndex = 0;
  const int lowerGapThreshold = 12;
  int lowerHalfEnd = samples / 2;
  for (int i = 0; i < lowerHalfEnd; i++) {
    int gap = acsZeroReadings[i + 1] - acsZeroReadings[i];
    if (gap >= lowerGapThreshold) {
      firstStableIndex = i + 1;
    }
  }

  int raw = acsZeroReadings[firstStableIndex];
  int lowestAllowedZero = median - 1;
  if (raw < lowestAllowedZero) {
    raw = lowestAllowedZero;
  }

  acsZeroRaw = raw;
  acsZero = raw * (3.3f / 4095.0f);
  acsZeroReady = true;
  resetCurrentFilter();

  Serial.print("ACS zero calibrated to: ");
  Serial.print(acsZero, 4);
  Serial.print(" V, raw: ");
  Serial.print(acsZeroRaw);
  Serial.print(" | median: ");
  Serial.print(median);
  Serial.print(" | candidate: ");
  Serial.print(acsZeroReadings[firstStableIndex]);
  Serial.print(" | min/max: ");
  Serial.print(acsZeroReadings[0]);
  Serial.print("/");
  Serial.println(acsZeroReadings[samples - 1]);
}


bool getACSZeroReady() {
  return acsZeroReady;
}

void readPowerMonitor(PowerData &data) {
  data.acsRaw = readAnalogStableAverage(ACS_PIN);
  data.acsZeroRaw = acsZeroRaw;
  data.acsDeltaRaw = data.acsRaw - acsZeroRaw;
  data.acsVoltage = data.acsRaw * (3.3f / 4095.0f);
  data.estimatedVoltage = NOMINAL_SOLAR_VOLTAGE;

  if (
    data.acsRaw <= ACS_DISCONNECTED_RAW_MIN
    || data.acsRaw >= ACS_DISCONNECTED_RAW_MAX
  ) {
    data.meterOk = false;
    data.currentA = 0.0f;
    data.estimatedPowerW = 0.0f;
    resetCurrentFilter();
    return;
  }

  data.meterOk = true;

  float current = (data.acsVoltage - acsZero) / ACS_SENSITIVITY;

  if (current < CURRENT_NOISE_FLOOR_A) {
    current = 0.0f;
  }

  if (current <= 0.0f) {
    currentZeroStreak++;
    if (currentZeroStreak >= CURRENT_ZERO_RESET_COUNT) {
      resetCurrentFilter();
      data.currentA = 0.0f;
    } else {
      float smoothedCurrent = filterCurrent(0.0f);
      data.currentA = smoothedCurrent;
    }
  } else {
    currentZeroStreak = 0;
    float smoothedCurrent = filterCurrent(current);
    data.currentA = smoothedCurrent;
  }

  data.estimatedPowerW = data.estimatedVoltage * data.currentA;
}
