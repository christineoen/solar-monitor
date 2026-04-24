from flask import Blueprint, request, jsonify
from app.state import state

command_bp = Blueprint('command', __name__)

VALID_COMMANDS = {"clean", "reset"}


@command_bp.route('/command', methods=['POST'])
def receive_command():
    body = request.get_json(silent=True)
    if not body or "command" not in body:
        return jsonify({"error": "missing field: command"}), 400

    command = body["command"]
    if command not in VALID_COMMANDS:
        return jsonify({"error": f"invalid command: must be one of {sorted(VALID_COMMANDS)}"}), 400

    state["pending_command"] = command

    if command == "reset":
        state["alert_active"] = False
        state["below_threshold_since"] = None

    return jsonify({"ok": True}), 200
