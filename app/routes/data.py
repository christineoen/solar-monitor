import time
from flask import Blueprint, request, jsonify
from app.state import state
from app.database import insert_sensor_reading
from app.efficiency import calculate_efficiency

data_bp = Blueprint('data', __name__)


@data_bp.route('/data', methods=['POST'])
def receive_data():
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "expected JSON body"}), 400

    missing = [f for f in ("voltage_v", "current_ma", "power_mw") if f not in body]
    if missing:
        return jsonify({"error": f"missing fields: {', '.join(missing)}"}), 400

    for field in ("voltage_v", "current_ma", "power_mw"):
        if not isinstance(body[field], (int, float)):
            return jsonify({"error": f"{field} must be numeric"}), 400

    state["voltage_v"]  = body["voltage_v"]
    state["current_ma"] = body["current_ma"]
    state["power_mw"]   = body["power_mw"]
    state["last_esp32_contact"] = time.time()

    calculate_efficiency()
    insert_sensor_reading(
        body["voltage_v"],
        body["current_ma"],
        body["power_mw"],
        state["efficiency"],
        state["alert_active"],
    )

    command = state["pending_command"]
    state["pending_command"] = "none"

    return jsonify({"command": command}), 200
