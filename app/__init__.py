from flask import Flask
from app.database import init_db
from app.weather import start_weather_thread
from app.routes.data import data_bp


def create_app():
    app = Flask(__name__)

    init_db()
    start_weather_thread()

    app.register_blueprint(data_bp)

    # Remaining route blueprints registered in later chunks

    return app
