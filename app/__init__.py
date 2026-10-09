import os
from dotenv import load_dotenv
from flask import Flask
from . import db
from .routes import init_routes

def create_app(test_config=None):

    app = Flask(__name__, static_folder='static', template_folder='templates', instance_relative_config=True)

    #This is only for development purposes.
    load_dotenv()

    app.config.from_mapping(
        SECRET_KEY=os.environ.get('SECRET_KEY'),
        ADMIN_TOKEN=os.environ.get('ADMIN_TOKEN', os.environ.get('SECRET_KEY')),
        DATABASE=os.path.join(app.instance_path, 'soiltrace.sqlite'),
    )

    # Load the instance config, if it exists, when not testing
    if test_config is None:
        app.config.from_pyfile('config.py', silent=True)
    else:
        app.config.from_mapping(test_config)

    # Check if the SECRET_KEY is set
    if not app.config['SECRET_KEY']:
        raise RuntimeError("No SECRET_KEY set for application")

    os.makedirs(app.instance_path, exist_ok=True)

    db.init_app(app)
    init_routes(app)

    return app
