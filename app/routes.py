from datetime import date

from flask import flash, redirect, render_template, request, url_for

from .db import get_db


CATEGORIES = (
    ("plastic-waste", "Plastic waste"),
    ("agricultural-waste", "Agricultural waste"),
    ("industrial-waste", "Industrial waste"),
    ("chemical-waste", "Chemical waste"),
    ("e-waste", "E-waste"),
    ("construction-waste", "Construction waste"),
    ("other", "Other"),
)
CATEGORY_LABELS = dict(CATEGORIES)


def clean_field(name, maximum):
    return request.form.get(name, "").strip()[:maximum]


def init_routes(app):
    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/report', methods=('GET', 'POST'))
    def report():
        if request.method == 'POST':
            name = clean_field('name', 100)
            location = clean_field('location', 200)
            observation_date = clean_field('observation_date', 10)
            category = clean_field('category', 50)
            description = clean_field('description', 2000)
            errors = []

            if not location:
                errors.append('Enter the location or area name.')
            if not description:
                errors.append('Describe what you observed.')
            if category not in CATEGORY_LABELS:
                errors.append('Choose a pollution category.')
            try:
                parsed_date = date.fromisoformat(observation_date)
                if parsed_date > date.today():
                    errors.append('Observation date cannot be in the future.')
            except ValueError:
                errors.append('Enter a valid observation date.')

            if errors:
                for error in errors:
                    flash(error, 'error')
                return render_template('report.html', categories=CATEGORIES, form=request.form, today=date.today().isoformat()), 400

            db = get_db()
            db.execute(
                '''INSERT INTO observations (name, location, observation_date, category, description)
                   VALUES (?, ?, ?, ?, ?)''',
                (name or None, location, observation_date, category, description),
            )
            db.commit()
            return redirect(url_for('report', submitted='1'))

        return render_template(
            'report.html', categories=CATEGORIES, form={}, today=date.today().isoformat()
        )

    @app.route('/dashboard')
    def dashboard():
        db = get_db()
        total = db.execute('SELECT COUNT(*) FROM observations').fetchone()[0]
        location_total = db.execute(
            'SELECT COUNT(DISTINCT location) FROM observations'
        ).fetchone()[0]
        category_counts = db.execute(
            '''SELECT category, COUNT(*) AS total
               FROM observations GROUP BY category ORDER BY total DESC, category ASC'''
        ).fetchall()
        location_counts = db.execute(
            '''SELECT location, COUNT(*) AS total
               FROM observations GROUP BY location ORDER BY total DESC, location ASC LIMIT 5'''
        ).fetchall()
        recent_observations = db.execute(
            '''SELECT name, location, observation_date, category, description, created_at
               FROM observations ORDER BY created_at DESC, id DESC LIMIT 10'''
        ).fetchall()
        return render_template(
            'dashboard.html',
            total=total,
            location_total=location_total,
            category_counts=category_counts,
            location_counts=location_counts,
            recent_observations=recent_observations,
            category_labels=CATEGORY_LABELS,
        )
