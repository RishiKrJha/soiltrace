import os
from dotenv import load_dotenv
from flask import Flask

def create_app(test_config=None):

    app = Flask(__name__, static_folder='static', template_folder='templates', instance_relative_config=True)
    
    load_dotenv()

    app.config.from_mapping(
        SECRET_KEY=os.environ.get('SECRET_KEY'),
    )

    if test_config is None:
        app.config.from_pyfile('config.py', silent=True)
    else:
        app.config.from_mapping(test_config)
    
    if not app.config['SECRET_KEY']:
        raise RuntimeError("No SECRET_KEY set for application")

    os.makedirs(app.instance_path, exist_ok=True)

    @app.route('/test')
    def test():
        return 'Test route is working!'

    return app