from flask import Flask, render_template
from app.database import init_db
from app.weather import start_weather_thread
from app.routes.data import data_bp
from app.routes.status import status_bp
from app.routes.history import history_bp
from app.routes.command import command_bp


def create_app():
    app = Flask(__name__)

    init_db()
    start_weather_thread()

    app.register_blueprint(data_bp)
    app.register_blueprint(status_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(command_bp)

    @app.route('/')
    def index():
        return render_template('index.html')

    return app
