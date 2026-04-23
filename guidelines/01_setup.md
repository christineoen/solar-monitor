# 01 — Flask App Setup

## What to build

The Flask application factory, entry point, and requirements file.

## requirements.txt

```
flask
requests
```

No other dependencies. SQLite is part of Python's standard library. Do not add flask-sqlalchemy or any ORM — use raw sqlite3.

## app/__init__.py

Create a Flask app factory function `create_app()` that:

1. Creates the Flask app instance
2. Calls `init_db()` from `app/database.py` to ensure tables exist
3. Starts the weather polling background thread from `app/weather.py`
4. Registers all route blueprints:
   - `app.routes.data` → no url prefix
   - `app.routes.status` → no url prefix
   - `app.routes.history` → no url prefix
   - `app.routes.command` → no url prefix
5. Registers the route for serving the dashboard: `GET /` returns `render_template('index.html')`
6. Returns the app instance

## run.py

Entry point. Import `create_app`, create the app, and run it:

```python
from app import create_app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
```

`host='0.0.0.0'` is required so the ESP32 on the same Wi-Fi network can reach the server by the laptop's local IP address (e.g. `http://192.168.1.105:5000`).

## Notes

- Do not use `debug=True` in production — the reloader will start the weather thread twice
- The app should start cleanly with `python run.py` from the project root
