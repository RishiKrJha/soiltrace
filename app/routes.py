from flask import render_template

def init_routes(app):
    # Define your routes here

    # Homepage route
    @app.route('/')
    def index():
        return render_template('index.html')