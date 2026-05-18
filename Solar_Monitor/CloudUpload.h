#ifndef CLOUD_UPLOAD_H
#define CLOUD_UPLOAD_H

//Upload current ESP32 sensor/servo state to sensor_readings;Read dashboard commands from solar_commands.
void beginCloudUpload();
void pollDashboardCommand();
void uploadSensorReadingToDashboard();

#endif
