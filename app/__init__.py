from flask import Flask
from app.database import init_db


def create_app():
    app = Flask(__name__)

    init_db()

    # Weather thread and route blueprints registered in later chunks

    return app
