from flask import Blueprint, jsonify
from app.state import state, seconds_since_last_contact

status_bp = Blueprint('status', __name__)


@status_bp.route('/status', methods=['GET'])
def get_status():
    return jsonify({
        "voltage_v":         state["voltage_v"],
        "current_ma":        state["current_ma"],
        "power_mw":          state["power_mw"],
        "expected_power_mw": state["expected_power_mw"],
        "efficiency":        state["efficiency"],
        "irradiance_wm2":    state["irradiance_wm2"],
        "alert_active":      state["alert_active"],
        "pending_command":   state["pending_command"],
        "last_esp32_contact": seconds_since_last_contact(),
    }), 200
