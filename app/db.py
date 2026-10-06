import sqlite3

from flask import current_app, g


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(current_app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
    return g.db


def close_db(_error=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    get_db().execute(
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
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    existing_columns = {
        row['name'] for row in get_db().execute('PRAGMA table_info(observations)').fetchall()
    }
    for name in ('country', 'country_code', 'region', 'region_code'):
        if name not in existing_columns:
            get_db().execute(
                f"ALTER TABLE observations ADD COLUMN {name} TEXT NOT NULL DEFAULT ''"
            )
    get_db().execute(
        '''CREATE INDEX IF NOT EXISTS observations_country_region_idx
           ON observations (country_code, region)'''
    )
    get_db().commit()


def init_app(app):
    app.teardown_appcontext(close_db)
    with app.app_context():
        init_db()
