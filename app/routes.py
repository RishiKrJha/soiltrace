from datetime import date, timedelta

from flask import flash, redirect, render_template, request, url_for

from .db import get_db


CATEGORIES = (
    ("plastic-waste", "Plastic waste"),
    ("agricultural-waste", "Agricultural waste"),
    ("industrial-waste", "Industrial waste"),
    ("chemical-waste", "Chemical waste"),
    ("e-waste", "E-waste"),
    ("construction-waste", "Construction waste"),
    ("other", "Other or not sure"),
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
            if request.form.get('website', ''):
                return '', 204

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
            if request.form.get('consent') != 'yes':
                errors.append('Confirm that you understand this is a public observation.')
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
        recent_total = db.execute(
            'SELECT COUNT(*) FROM observations WHERE observation_date >= ?',
            ((date.today() - timedelta(days=30)).isoformat(),),
        ).fetchone()[0]
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
        trend_rows = db.execute(
            '''SELECT substr(observation_date, 1, 7) AS month, COUNT(*) AS total
               FROM observations GROUP BY month ORDER BY month DESC LIMIT 12'''
        ).fetchall()

        category_colors = {
            'plastic-waste': '#d66f45',
            'agricultural-waste': '#bb993e',
            'industrial-waste': '#697b68',
            'chemical-waste': '#ad5d68',
            'e-waste': '#607d92',
            'construction-waste': '#9a765e',
            'other': '#8a8c86',
        }
        category_data = []
        running_total = 0
        for item in category_counts:
            item_total = item['total']
            percentage = round((item_total / total) * 100) if total else 0
            category_data.append({
                'category': item['category'],
                'label': CATEGORY_LABELS[item['category']],
                'total': item_total,
                'percentage': percentage,
                'color': category_colors[item['category']],
                'start': running_total,
                'end': running_total + (item_total / total * 100) if total else 0,
            })
            running_total += item_total / total * 100 if total else 0

        location_data = [
            {
                'location': item['location'],
                'total': item['total'],
                'percentage': round((item['total'] / total) * 100) if total else 0,
            }
            for item in location_counts
        ]
        trend_data = [
            {
                'label': date.fromisoformat(f"{item['month']}-01").strftime("%b %y"),
                'total': item['total'],
            }
            for item in reversed(trend_rows)
        ]
        trend_max = max((item['total'] for item in trend_data), default=1)
        return render_template(
            'dashboard.html',
            total=total,
            recent_total=recent_total,
            location_total=location_total,
            category_data=category_data,
            top_category=category_data[0] if category_data else None,
            location_data=location_data,
            recent_observations=recent_observations,
            trend_data=trend_data,
            trend_max=trend_max,
            category_labels=CATEGORY_LABELS,
        )
