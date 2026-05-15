#include "CloudUpload.h"
#include "Config.h"
#include "State.h"
#include "Trajectory.h"
#include "PowerMonitor.h"

#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <math.h>


static int savedBaseAngle = 90;
static int savedPanelAngle = 90;

static bool findJsonValueStart(const String &json, const char *key, int &valueStart) {
  String pattern = "\"";
  pattern += key;
  pattern += "\"";

  int keyPos = json.indexOf(pattern);
  if (keyPos < 0) {
    return false;
  }

  int colonPos = json.indexOf(':', keyPos + pattern.length());
  if (colonPos < 0) {
    return false;
  }

  valueStart = colonPos + 1;
  while (valueStart < json.length()) {
    char c = json.charAt(valueStart);
    if (c == ' ' || c == '\n' || c == '\r' || c == '\t') {
      valueStart++;
    } else {
      break;
    }
  }

  return valueStart < json.length();
}

static bool getJsonStringValue(const String &json, const char *key, String &value) {
  int start = 0;
  if (!findJsonValueStart(json, key, start) || json.charAt(start) != '"') {
    return false;
  }

  int end = json.indexOf('"', start + 1);
  if (end < 0) {
    return false;
  }

  value = json.substring(start + 1, end);
  return true;
}

static bool getJsonFloatValue(const String &json, const char *key, float &value) {
  int start = 0;
  if (!findJsonValueStart(json, key, start)) {
    return false;
  }

  int end = start;
  while (end < json.length()) {
    char c = json.charAt(end);
    if ((c >= '0' && c <= '9') || c == '-' || c == '+' || c == '.') {
      end++;
    } else {
      break;
    }
  }

  if (end <= start) {
    return false;
  }

  value = json.substring(start, end).toFloat();
  return true;
}

static int getJsonIntOrDefault(const String &json, const char *key, int defaultValue) {
  float value = 0.0f;
  if (!getJsonFloatValue(json, key, value)) {
    return defaultValue;
  }
  return (int)round(value);
}

static bool getJsonBoolOrDefault(const String &json, const char *key, bool defaultValue) {
  int start = 0;
  if (!findJsonValueStart(json, key, start)) {
    return defaultValue;
  }

  if (json.startsWith("true", start)) {
    return true;
  }
  if (json.startsWith("false", start)) {
    return false;
  }

  float numericValue = 0.0f;
  if (getJsonFloatValue(json, key, numericValue)) {
    return numericValue != 0.0f;
  }

  return defaultValue;
}


static String supabaseUrlForTable(const char *tableName) {
  return String(SUPABASE_URL) + "/rest/v1/" + tableName;
}

static void addSupabaseHeaders(HTTPClient &http, bool jsonBody = true) {
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  if (jsonBody) {
    http.addHeader("Content-Type", "application/json");
  }
}

static bool supabaseConfigLooksReady() {
  String url = String(SUPABASE_URL);
  String key = String(SUPABASE_KEY);
  return url.startsWith("https://")
    && url.indexOf("YOUR_PROJECT_ID") < 0
    && key.length() > 30
    && key.indexOf("YOUR_SUPABASE") < 0;
}

static String buildUploadJson() {
  float voltageV = state.power.estimatedVoltage;
  float currentMa = state.power.currentA * 1000.0f;
  float powerMw = state.power.estimatedPowerW * 1000.0f;

  String json = "{";
  json += "\"location_key\":\"perth\",";
  json += "\"location_name\":\"Perth\",";
  json += "\"timezone\":\"Australia/Perth\",";

  json += "\"voltage_v\":" + String(voltageV, 3) + ",";
  json += "\"current_ma\":" + String(currentMa, 3) + ",";
  json += "\"power_mw\":" + String(powerMw, 3) + ",";
  json += "\"actual_power_mw\":" + String(powerMw, 3) + ",";

  json += "\"pan_deg\":" + String(state.baseAngle) + ",";
  json += "\"tilt_deg\":" + String(state.panelAngle) + ",";
  json += "\"servo_1_deg\":" + String(state.baseAngle) + ",";
  json += "\"servo_2_deg\":" + String(state.panelAngle) + ",";
  json += "\"servo_horizontal\":" + String(state.baseAngle) + ",";
  json += "\"servo_vertical\":" + String(state.panelAngle) + ",";

  json += "\"raw_meter_voltage_v\":" + String(state.power.acsVoltage, 4) + ",";
  json += "\"sensor_zero_ready\":" + String(getACSZeroReady() ? "true" : "false") + ",";
  json += "\"current_baseline_ma\":0,";

  json += "\"ldr_left_up\":" + String(state.light.zoushang) + ",";
  json += "\"ldr_right_up\":" + String(state.light.youshang) + ",";
  json += "\"ldr_left_down\":" + String(state.light.zouxia) + ",";
  json += "\"ldr_right_down\":" + String(state.light.youxia) + ",";
  json += "\"ldr_horizontal_diff\":" + String(state.light.zycz) + ",";
  json += "\"ldr_vertical_diff\":" + String(state.light.sxcz) + ",";

  json += "\"mode\":\"" + modeToString(state.mode) + "\",";
  json += "\"weather_category\":\"unknown\",";
  json += "\"weather_category_label\":\"No weather data\",";
  json += "\"weather_description\":\"ESP32 direct upload\"";
  json += "}";
  return json;
}

static bool patchSolarCommandAfterSensorZero() {
  WiFiClientSecure client;
  client.setInsecure(); // Prototype only. For production, use a root certificate.

  HTTPClient http;
  http.setTimeout((uint16_t)DASHBOARD_HTTP_TIMEOUT_MS);

  String endpoint = supabaseUrlForTable(SUPABASE_COMMANDS_TABLE) + "?id=eq.1";
  if (!http.begin(client, endpoint)) {
    Serial.println("Sensor zero command clear failed: http_begin");
    return false;
  }

  addSupabaseHeaders(http, true);
  http.addHeader("Prefer", "return=minimal");

  String payload = "{";
  payload += "\"sensor_zero_requested\":false,";
  payload += "\"mode\":\"" + modeToString(state.mode) + "\"";
  payload += "}";

  int statusCode = http.PATCH(payload);
  Serial.print("Sensor zero command clear status: ");
  Serial.println(statusCode);
  http.end();
  return statusCode >= 200 && statusCode < 300;
}

static void applySupabaseCommand(const String &response) {
  if (response.length() < 3 || response == "[]") {
    return;
  }

  String mode;
  if (!getJsonStringValue(response, "mode", mode)) {
    return;
  }

  mode.toLowerCase();

  bool sensorZeroRequested = getJsonBoolOrDefault(response, "sensor_zero_requested", false);
  if (sensorZeroRequested) {
    calibrateACSZero();
    readPowerMonitor(state.power);
    patchSolarCommandAfterSensorZero();
    return;
  }

  bool ldrEnabled = getJsonBoolOrDefault(response, "ldr_tracking_enabled", state.ldrTrackingEnabled);
  int trackingPeriodSec = getJsonIntOrDefault(response, "tracking_period_sec", (int)state.ldrTrackingPeriodSec);
  if (trackingPeriodSec < 0) {
    trackingPeriodSec = 0;
  }
  if ((unsigned long)trackingPeriodSec > LDR_TRACKING_MAX_PERIOD_SEC) {
    trackingPeriodSec = (int)LDR_TRACKING_MAX_PERIOD_SEC;
  }
  state.ldrTrackingEnabled = ldrEnabled;
  state.ldrTrackingPeriodSec = (unsigned long)trackingPeriodSec;

  int panTarget = getJsonIntOrDefault(response, "target_pan_deg", state.baseAngle);
  int tiltTarget = getJsonIntOrDefault(response, "target_tilt_deg", state.panelAngle);

  if (
    ldrEnabled
    && mode != "clean"
    && mode != "cleaning"
    && mode != "baseline"
    && mode != "reset_baseline"
    && mode != "tilt_clear"
    && mode != "tilt_clear_start"
    && mode != "tilt_clear_reset"
  ) {
    mode = "auto";
  }

  if (mode == "auto") {
    state.mode = MODE_AUTO;
    return;
  }

  if (mode == "manual") {
    state.mode = MODE_MANUAL;
    moveToAngles(panTarget, tiltTarget);
    return;
  }

  if (mode == "clean" || mode == "cleaning") {
    savedBaseAngle = state.baseAngle;
    savedPanelAngle = state.panelAngle;
    state.mode = MODE_CLEANING;
    moveToAngles(panTarget, tiltTarget);
    return;
  }

  if (mode == "baseline") {
    state.mode = MODE_BASELINE;
    state.needsCleaning = false;
    state.cleanReferencePowerW = 0.0f;
    moveToAnglesTimed(panTarget, tiltTarget, DASHBOARD_COMMAND_MOVE_MS);
    return;
  }

  if (mode == "reset_baseline") {
    state.mode = MODE_BASELINE;
    state.needsCleaning = false;
    state.cleanReferencePowerW = 0.0f;
    moveToAnglesTimed(panTarget, tiltTarget, DASHBOARD_COMMAND_MOVE_MS);
    return;
  }

  if (mode == "tilt_clear" || mode == "tilt_clear_start") {
    savedBaseAngle = state.baseAngle;
    savedPanelAngle = state.panelAngle;
    state.mode = MODE_TILT_CLEAR;
    moveToAnglesTimed(savedBaseAngle, tiltTarget, DASHBOARD_COMMAND_MOVE_MS);
    return;
  }

  if (mode == "tilt_clear_reset") {
    int resetBaseTarget = getJsonIntOrDefault(response, "target_pan_deg", savedBaseAngle);
    int resetPanelTarget = getJsonIntOrDefault(response, "target_tilt_deg", savedPanelAngle);
    moveToAnglesTimed(resetBaseTarget, resetPanelTarget, DASHBOARD_COMMAND_MOVE_MS);
    savedBaseAngle = resetBaseTarget;
    savedPanelAngle = resetPanelTarget;
    state.mode = MODE_AUTO;
    return;
  }
}

static bool fetchSupabaseCommand() {
  WiFiClientSecure client;
  client.setInsecure(); // Prototype only. For production, use a root certificate.

  HTTPClient http;
  http.setTimeout((uint16_t)DASHBOARD_HTTP_TIMEOUT_MS);

  String endpoint = supabaseUrlForTable(SUPABASE_COMMANDS_TABLE);
  endpoint += "?id=eq.1&select=mode,target_pan_deg,target_tilt_deg,ldr_tracking_enabled,tracking_period_sec,sensor_zero_requested";
  Serial.print("Command endpoint: ");
  Serial.println(endpoint);

  if (!http.begin(client, endpoint)) {
    state.dashboardStatus = "command_http_begin_failed";
    return false;
  }

  addSupabaseHeaders(http, false);

  int statusCode = http.GET();
  String response = http.getString();

  if (statusCode >= 200 && statusCode < 300) {
    applySupabaseCommand(response);
    http.end();
    return true;
  }

  state.dashboardStatus = "command_http_" + String(statusCode);
  Serial.print("Supabase command error: ");
  Serial.print(statusCode);
  Serial.print(" | ");
  Serial.println(response);
  http.end();
  return false;
}

static bool uploadReadingToSupabase() {
  WiFiClientSecure client;
  client.setInsecure(); 

  HTTPClient http;
  http.setTimeout((uint16_t)DASHBOARD_HTTP_TIMEOUT_MS);

  String endpoint = supabaseUrlForTable(SUPABASE_READINGS_TABLE);
  Serial.print("Upload endpoint: ");
  Serial.println(endpoint);
  if (!http.begin(client, endpoint)) {
    state.dashboardStatus = "upload_http_begin_failed";
    return false;
  }

  addSupabaseHeaders(http, true);
  http.addHeader("Prefer", "return=minimal");

  String payload = buildUploadJson();
  int statusCode = http.POST(payload);
  String response = http.getString();

  Serial.print("Supabase upload status: ");
  Serial.println(statusCode);

  if (statusCode >= 200 && statusCode < 300) {
    state.dashboardUploadOk = true;
    state.dashboardStatus = "uploaded_http_" + String(statusCode);
    http.end();
    return true;
  }

  state.dashboardUploadOk = false;
  state.dashboardStatus = "upload_http_" + String(statusCode);

  Serial.print("Supabase upload error: ");
  Serial.print(statusCode);
  Serial.print(" | ");
  Serial.println(response);

  http.end();
  return false;
}

void beginCloudUpload() {
  state.dashboardUploadOk = false;
  state.dashboardStatus = "waiting_supabase";
}

static bool canUseSupabase() {
  if (WiFi.status() != WL_CONNECTED) {
    state.dashboardUploadOk = false;
    state.dashboardStatus = "wifi_disconnected";
    return false;
  }

  if (!supabaseConfigLooksReady()) {
    state.dashboardUploadOk = false;
    state.dashboardStatus = "supabase_config_missing";
    Serial.println("Supabase config missing. Update SUPABASE_URL and SUPABASE_KEY in Config.h.");
    return false;
  }

  return true;
}

void pollDashboardCommand() {
  if (!canUseSupabase()) {
    return;
  }

  fetchSupabaseCommand();
}

void uploadSensorReadingToDashboard() {
  if (!canUseSupabase()) {
    return;
  }

  uploadReadingToSupabase();
}

