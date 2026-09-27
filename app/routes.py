from flask import render_template

def init_routes(app):
    # Define your routes here

    # Homepage route
    @app.route('/')
    def index():
        return render_template('index.html')

    # Report route
    @app.route('/report')
    def report():
        return render_template('report.html')

    #Dashboard Route
    @app.route('/dashboard')
    def dashboard():
        return render_template('dashboard.html')