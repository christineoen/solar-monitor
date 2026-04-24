from flask import Blueprint, request, jsonify
from app.database import get_sensor_history, get_weather_history

history_bp = Blueprint('history', __name__)


@history_bp.route('/history/sensor', methods=['GET'])
def sensor_history():
    try:
        minutes = int(request.args.get('minutes', 60))
        if minutes <= 0:
            raise ValueError
    except (ValueError, TypeError):
        minutes = 60

    return jsonify({"readings": get_sensor_history(minutes)}), 200


@history_bp.route('/history/weather', methods=['GET'])
def weather_history():
    try:
        hours = int(request.args.get('hours', 24))
        if hours <= 0:
            raise ValueError
    except (ValueError, TypeError):
        hours = 24

    return jsonify({"readings": get_weather_history(hours)}), 200
