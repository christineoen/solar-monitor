from flask import Flask
from app.database import init_db
from app.weather import start_weather_thread
from app.routes.data import data_bp
from app.routes.status import status_bp
from app.routes.history import history_bp


def create_app():
    app = Flask(__name__)

    init_db()
    start_weather_thread()

    app.register_blueprint(data_bp)
    app.register_blueprint(status_bp)
    app.register_blueprint(history_bp)

    # command_bp registered in next chunk

    return app
