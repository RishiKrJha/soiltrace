from datetime import date, timedelta
import re

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
            country = clean_field('country', 100)
            country_code = clean_field('country_code', 2).upper()
            region = clean_field('region', 100)
            region_code = clean_field('region_code', 20)
            region_required = request.form.get('region_required') == 'yes'
            observation_date = clean_field('observation_date', 10)
            category = clean_field('category', 50)
            description = clean_field('description', 2000)
            errors = []

            if not country or not re.fullmatch(r'[A-Z]{2}', country_code):
                errors.append('Select a country from the suggestions.')
            if region_required and not region:
                errors.append('Select a state or region from the suggestions.')
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
                '''INSERT INTO observations
                   (name, location, country, country_code, region, region_code,
                    observation_date, category, description)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (
                    name or None, location, country, country_code, region, region_code,
                    observation_date, category, description,
                ),
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
        country_total = db.execute(
            "SELECT COUNT(DISTINCT country_code) FROM observations WHERE country_code <> ''"
        ).fetchone()[0]
        category_counts = db.execute(
            '''SELECT category, COUNT(*) AS total
               FROM observations GROUP BY category ORDER BY total DESC, category ASC'''
        ).fetchall()
        regional_counts = db.execute(
            '''SELECT CASE WHEN region <> '' THEN region || ', ' || country ELSE country END AS label,
                      COUNT(*) AS total
               FROM observations
               WHERE country_code <> ''
               GROUP BY country_code, country, region
               ORDER BY total DESC, label ASC LIMIT 5'''
        ).fetchall()
        recent_observations = db.execute(
            '''SELECT country, region, observation_date, category, description, created_at
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
            segment_end = running_total + (item_total / total * 100) if total else 0
            category_data.append({
                'category': item['category'],
                'label': CATEGORY_LABELS[item['category']],
                'total': item_total,
                'percentage': percentage,
                'color': category_colors[item['category']],
                'start': running_total,
                'end': segment_end,
            })
            running_total = segment_end

        regional_data = [
            {
                'label': item['label'],
                'total': item['total'],
                'percentage': round((item['total'] / total) * 100) if total else 0,
            }
            for item in regional_counts
        ]
        recent_data = [
            {
                'place': (
                    f"{item['region']}, {item['country']}"
                    if item['region'] else item['country'] or 'Country not provided'
                ),
                'observation_date': item['observation_date'],
                'category': item['category'],
                'description': item['description'],
            }
            for item in recent_observations
        ]
        trend_data = [
            {
                'label': date.fromisoformat(f"{item['month']}-01").strftime("%b %y"),
                'total': item['total'],
            }
            for item in reversed(trend_rows)
        ]
        trend_max = max((item['total'] for item in trend_data), default=1)
        for item in trend_data:
            item['height'] = round(item['total'] / trend_max * 100)
        donut_background = 'conic-gradient({})'.format(', '.join(
            f"{item['color']} {item['start']:.2f}% {item['end']:.2f}%"
            for item in category_data
        ))
        trend_summary = ', '.join(
            f"{item['label']} {item['total']}" for item in trend_data
        )
        return render_template(
            'dashboard.html',
            total=total,
            recent_total=recent_total,
            country_total=country_total,
            category_data=category_data,
            top_category=category_data[0] if category_data else None,
            regional_data=regional_data,
            recent_data=recent_data,
            trend_data=trend_data,
            trend_max=trend_max,
            trend_summary=trend_summary,
            donut_background=donut_background,
            category_labels=CATEGORY_LABELS,
        )
