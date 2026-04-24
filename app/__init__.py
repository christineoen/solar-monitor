from flask import Flask
from app.database import init_db
from app.weather import start_weather_thread


def create_app():
    app = Flask(__name__)

    init_db()
    start_weather_thread()

    # Route blueprints registered in later chunks

    return app
