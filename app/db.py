import sqlite3

from flask import current_app, g


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(
            current_app.config["DATABASE"],
            timeout=30.0,
        )
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA journal_mode=WAL;")
        g.db.execute("PRAGMA synchronous=NORMAL;")
    return g.db


def close_db(_error=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = get_db()
    with db:
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS observations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                location TEXT NOT NULL DEFAULT '',
                country TEXT NOT NULL DEFAULT '',
                country_code TEXT NOT NULL DEFAULT '',
                region TEXT NOT NULL DEFAULT '',
                region_code TEXT NOT NULL DEFAULT '',
                observation_date TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'approved',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        existing_columns = {
            row['name'] for row in db.execute('PRAGMA table_info(observations)').fetchall()
        }
        for name in ('country', 'country_code', 'region', 'region_code', 'status'):
            if name not in existing_columns:
                default_val = "'approved'" if name == 'status' else "''"
                db.execute(
                    f"ALTER TABLE observations ADD COLUMN {name} TEXT NOT NULL DEFAULT {default_val}"
                )
        db.execute(
            '''CREATE INDEX IF NOT EXISTS observations_country_region_idx
               ON observations (country_code, region)'''
        )
        db.execute(
            '''CREATE INDEX IF NOT EXISTS observations_status_idx
               ON observations (status)'''
        )


def init_app(app):
    app.teardown_appcontext(close_db)
    with app.app_context():
        init_db()
