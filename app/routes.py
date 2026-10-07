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

        # --- Location filter parameters ---
        filter_country_code = request.args.get('country_code', '').strip().upper()[:2]
        filter_region_code = request.args.get('region_code', '').strip()[:20]

        # Build WHERE clause fragments used across queries
        where_parts = []
        where_args = []
        if filter_country_code:
            where_parts.append("country_code = ?")
            where_args.append(filter_country_code)
            if filter_region_code:
                where_parts.append("region_code = ?")
                where_args.append(filter_region_code)
        where_clause = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""

        total = db.execute(
            f'SELECT COUNT(*) FROM observations {where_clause}', where_args
        ).fetchone()[0]
        recent_total = db.execute(
            f'SELECT COUNT(*) FROM observations {where_clause}'
            + (' AND ' if where_clause else ' WHERE ')
            + 'observation_date >= ?',
            where_args + [(date.today() - timedelta(days=30)).isoformat()],
        ).fetchone()[0]
        country_total = db.execute(
            f"SELECT COUNT(DISTINCT country_code) FROM observations {where_clause}"
            + (' AND ' if where_clause else ' WHERE ')
            + "country_code <> ''",
            where_args,
        ).fetchone()[0]
        category_counts = db.execute(
            f'''SELECT category, COUNT(*) AS total
               FROM observations {where_clause}
               GROUP BY category ORDER BY total DESC, category ASC''',
            where_args,
        ).fetchall()
        regional_counts = db.execute(
            f'''SELECT CASE WHEN region <> '' THEN region || ', ' || country ELSE country END AS label,
                      COUNT(*) AS total
               FROM observations
               {where_clause}
               {('AND' if where_clause else 'WHERE')} country_code <> ''
               GROUP BY country_code, country, region
               ORDER BY total DESC, label ASC LIMIT 5''',
            where_args,
        ).fetchall()
        recent_observations = db.execute(
            f'''SELECT country, region, observation_date, category, description, created_at
               FROM observations {where_clause}
               ORDER BY created_at DESC, id DESC LIMIT 10''',
            where_args,
        ).fetchall()
        trend_rows = db.execute(
            f'''SELECT substr(observation_date, 1, 7) AS month, COUNT(*) AS total
               FROM observations {where_clause}
               GROUP BY month ORDER BY month DESC LIMIT 12''',
            where_args,
        ).fetchall()

        # Distinct countries for filter dropdown (always unfiltered)
        filter_countries = db.execute(
            """SELECT DISTINCT country, country_code FROM observations
               WHERE country_code <> '' ORDER BY country ASC"""
        ).fetchall()

        # Distinct regions for the selected country (for the region sub-filter)
        filter_regions = []
        if filter_country_code:
            filter_regions = db.execute(
                """SELECT DISTINCT region, region_code FROM observations
                   WHERE country_code = ? AND region <> ''
                   ORDER BY region ASC""",
                (filter_country_code,),
            ).fetchall()

        # Active filter labels for display
        active_country_name = ''
        active_region_name = ''
        if filter_country_code:
            row = db.execute(
                'SELECT country FROM observations WHERE country_code = ? LIMIT 1',
                (filter_country_code,),
            ).fetchone()
            active_country_name = row['country'] if row else filter_country_code
        if filter_region_code and filter_country_code:
            row = db.execute(
                'SELECT region FROM observations WHERE country_code = ? AND region_code = ? LIMIT 1',
                (filter_country_code, filter_region_code),
            ).fetchone()
            active_region_name = row['region'] if row else filter_region_code

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
                'label': CATEGORY_LABELS.get(item['category'], item['category'].replace('-', ' ').title()),
                'total': item_total,
                'percentage': percentage,
                'color': category_colors.get(item['category'], '#8a8c86'),
                'start': running_total,
                'end': segment_end,
            })
            running_total = segment_end

        regional_top = regional_counts[0]['total'] if regional_counts else 1
        regional_data = [
            {
                'label': item['label'],
                'total': item['total'],
                'percentage': round((item['total'] / regional_top) * 100),
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
            filter_countries=filter_countries,
            filter_regions=filter_regions,
            filter_country_code=filter_country_code,
            filter_region_code=filter_region_code,
            active_country_name=active_country_name,
            active_region_name=active_region_name,
        )

    @app.errorhandler(404)
    def page_not_found(e):
        return render_template('404.html'), 404
