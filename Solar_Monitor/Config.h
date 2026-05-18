#ifndef CONFIG_H
#define CONFIG_H

// =========================
//This file centralizes Wi-Fi, Supabase, sensor pins, servo pins, ACS712 current, sensor settings, tracking control constants, and cleaning detection thresholds.
// =========================

#include <Arduino.h>

// =========================
// Wi-Fi settings
// =========================
static const char* WIFI_SSID = "wifi-name";
static const char* WIFI_PASSWORD = "password";
static const unsigned long WIFI_RECONNECT_INTERVAL_MS = 10000;

// =========================
// Supabase settings
// =========================
static const char* SUPABASE_URL = "https://mxptqjxphdvnoawkfyut.supabase.co";
static const char* SUPABASE_KEY = "sb_publishable_4HbNTR4F89JNgpwzCTnXHQ_ni8TufDW";

static const char* SUPABASE_READINGS_TABLE = "sensor_readings";
static const char* SUPABASE_COMMANDS_TABLE = "solar_commands";

static const unsigned long DASHBOARD_HTTP_TIMEOUT_MS = 1500;
static const unsigned long DASHBOARD_UPLOAD_INTERVAL_MS = 1000;
static const unsigned long DASHBOARD_UPLOAD_INTERVAL_DURING_LDR_MS = 5000;
static const unsigned long DASHBOARD_COMMAND_POLL_INTERVAL_MS = 1200;
static const unsigned long DASHBOARD_COMMAND_POLL_INTERVAL_DURING_LDR_MS = 5000;

// Perth: UTC+8. NTP provides local time for time-based trajectory control.
static const char* NTP_SERVER = "pool.ntp.org";
static const long GMT_OFFSET_SEC = 8 * 3600;
static const int DAYLIGHT_OFFSET_SEC = 0;

// =========================
// LDR sensor pins
// =========================
static const int PIN_ZUO_XIA   = 34;   // 左下
static const int PIN_ZUO_SHANG = 35;   // 左上
static const int PIN_YOU_SHANG = 36;   // 右上
static const int PIN_YOU_XIA   = 39;   // 右下

// =========================
// Servo pins
// =========================
static const int SERVO_BASE_PIN  = 25; // 左右舵机
static const int SERVO_PANEL_PIN = 26; // 上下舵机

// =========================
/* ACS712 pins
   The ACS712 currently uses GPIO35. GPIO35 is ADC1, so it works while Wi-Fi is enabled.
   Conflict with the pins of the ldr（PIN_ZUO_SHANG）. 
   ACS712 can only be connected to ADC1, so the current monitoring is on but the tracing light is off. 
   Later, when switching to the ina219, there will be no conflict */
// =========================
static const int ACS_PIN = 35;

// =========================
// ACS712 Settings
// The current module is ACS712-5A, so sensitivity is 0.185 V/A.
// =========================
static const float ACS_SENSITIVITY = 0.185f;
static const float ACS_ZERO_DEFAULT = 2.5f;

// Extreme ADC values usually indicate a disconnected sensor, short, or wiring issue.
static const int ACS_DISCONNECTED_RAW_MIN = 20;
static const int ACS_DISCONNECTED_RAW_MAX = 4075;

// Small-current noise threshold. A 5 mA dead zone prevents jitter around zero.
static const float CURRENT_NOISE_FLOOR_A = 0.005f;
static const float CURRENT_FILTER_ALPHA = 0.45f;
static const int CURRENT_ZERO_RESET_COUNT = 5;

// =========================
// Without a voltage divider/INA219, power can only be estimated.
// Estimated Power = nominal panel voltage, assumed as 6V, multiplied by current.
// =========================
static const float NOMINAL_SOLAR_VOLTAGE = 6.0f;

// =========================
// Control parameters
// Keep horizontal tracking more sensitive because side light can produce a
// smaller left/right average difference after the panel frame partially shades sensors.
// =========================
static const int LDR_HORIZONTAL_REACTION = 6;
static const int LDR_VERTICAL_REACTION = 12;

// Sensor refresh interval
static const unsigned long SENSOR_INTERVAL_MS = 1000;

// LDR tracking refresh interval and servo step size per adjustment.
static const unsigned long LDR_TRACKING_INTERVAL_MS = 1;
static const int LDR_HORIZONTAL_STEP_DEG = 1;
static const int LDR_VERTICAL_STEP_DEG = 1;
static const unsigned long LDR_TRACKING_BURST_MS = 5000;
static const unsigned long LDR_TRACKING_MAX_PERIOD_SEC = 24UL * 60UL * 60UL;
static const bool LDR_INVERT_HORIZONTAL = true;
static const bool LDR_INVERT_VERTICAL = false;

// =========================
// Cleaning detection parameters
// =========================
static const float CLEAN_DROP_RATIO = 0.70f;
static const int BRIGHT_LIGHT_THRESHOLD = 1800;
static const unsigned long DIRTY_CONFIRM_MS = 30000;

static const bool AUTO_TILT_WHEN_DIRTY = false;

// Cleaning angle
static const int CLEAN_PANEL_ANGLE = 180;
static const unsigned long DASHBOARD_COMMAND_MOVE_MS = 5000;

#endif
