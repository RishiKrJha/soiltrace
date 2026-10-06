# SoilTrace

[![Python Version](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![Framework](https://img.shields.io/badge/framework-Flask%203.1-emerald.svg)](https://flask.palletsprojects.com/)
[![Database](https://img.shields.io/badge/database-SQLite-lightgrey.svg)](https://www.sqlite.org/)

**SoilTrace** is an open, community-driven soil pollution awareness and signal tracking platform. It enables individuals worldwide to record anonymous digital observations of potential soil contamination, surface emerging environmental signals, and explore aggregated trends through an interactive dashboard.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Running the Application](#running-the-application)
- [Application Walkthrough](#application-walkthrough)
  - [Home](#home)
  - [Report an Observation](#report-an-observation)
  - [Live Dashboard](#live-dashboard)
- [Database Strategy](#database-strategy)

---

## Overview

Healthy soil is vital to food security, clean groundwater, biodiversity, and climate regulation. Yet soil degradation and contamination often occur unnoticed. 

SoilTrace bridges the gap between community field observations and environmental awareness:
- Provides an easy-to-use reporting interface without requiring user accounts.
- Categorizes pollution types (plastics, agricultural runoff, industrial waste, e-waste, chemicals, construction debris).
- Employs standardized geographic taxonomies to ensure reliable regional aggregation.
- Visualizes public observations via dynamic metrics, trend cards, and distribution charts while transparently distinguishing community signals from verified laboratory datasets.

---

## Key Features

### 📋 Anonymous Observation Reporting
- **Categorized Observations**: Single-category selection (Plastic, Agricultural, Industrial, Chemical, E-waste, Construction, Other) keeping data clear and unambiguous.
- **Privacy by Design**: No account creation or exact personal addresses required. Clear contributor warnings regarding public disclosure.
- **Form Safeguards**: Client-side character counter (up to 2,000 characters), observation date constraints (no future dates), consent verification, and an anti-bot honeypot field.

### 🗺️ Controlled Geographic Taxonomy
- **Dynamic Country & Region Lookups**: Real-time integration with geographic datasets for standardized ISO country selection and context-aware administrative subdivision filtering.
- **Data Cleanliness**: Prevents misspellings, formatting discrepancies, and duplicate variants (e.g. `Delhi` vs `DElhi`).
- **Flexible Subdivisions**: Automatically adapts when countries lack first-level subdivisions.

### 📊 Live Community Dashboard
- **Contextual Key Metrics**: Total community observations, last 30-day activity, leading pollution category, and count of distinct countries represented.
- **Multi-Level Location Filters**: Filter metrics, trends, and recent reports by country and specific state/region.
- **Observation Trend Chart**: 12-month rolling histogram of monthly observation frequencies.
- **Pollution Category Distribution**: Proportional CSS conic-gradient donut visualization with itemized breakdown and percentage counts.
- **Regional Rankings**: Top 5 reported jurisdictions with comparative visual share bars.
- **Recent Activity Feed**: Timeline view of submitted observations featuring location, category tags, and field notes.

---

## Tech Stack

- **Backend**: Python 3, [Flask](https://flask.palletsprojects.com/) (Application Factory pattern)
- **Database**: SQLite (Local development / prototype storage with automatic migration support)
- **Frontend**: Semantic HTML5, Modern CSS3 (Variables, Flexbox, Grid, Conic Gradients), Vanilla JavaScript (ES6+)
- **Geographic Data**: Bundled local dataset (`app/static/countries.json`) for instant country lookups and on-demand regional subdivision querying
- **Configuration & Security**: `python-dotenv` for environment management, honeypot spam protection

---

## Project Structure

```text
soiltrace/
├── app/
│   ├── __init__.py           # Flask application factory (create_app)
│   ├── routes.py             # Route handlers (index, report, dashboard) & filtering
│   ├── db.py                 # SQLite database connection, schema, and migrations
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css     # Unified stylesheets and design system
│   │   ├── js/
│   │   │   ├── navbar.js     # Responsive mobile navigation menu toggle
│   │   │   └── report.js     # Country/region fetching and form validations
│   │   └── countries.json    # Bundled country list dataset
│   └── templates/
│       ├── base.html         # Base template with navigation, header, and footer
│       ├── index.html        # Informational homepage and platform overview
│       ├── report.html       # Public observation submission form
│       └── dashboard.html    # Interactive metrics, charts, filters, and feed
├── instance/
│   └── soiltrace.sqlite      # SQLite database file (created at runtime)
├── .env.example              # Template for environment variables
├── PLANS.md                  # Project architecture roadmap and specifications
├── requirements.txt          # Python package dependencies
└── README.md                 # Project documentation
```

---

## Getting Started

### Prerequisites

- Python 3.10 or higher
- `git`
- `pip`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/RishiKrJha/soiltrace.git
   cd soiltrace
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

### Environment Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Generate a secure secret key and set it in `.env`:
   ```bash
   python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32))" > .env
   ```
   Or edit `.env` directly:
   ```env
   SECRET_KEY=your_generated_secret_key_here
   ```

### Running the Application

Start the Flask development server:
```bash
flask --app app run --debug
```

Once running, navigate to `http://127.0.0.1:5000` in your web browser.

---

## Application Walkthrough

| Route | Description |
|---|---|
| `/` | **Home**: Platform introduction, importance of soil health, pillars of SoilTrace, and quick action links. |
| `/report` | **Report**: Multi-step observation submission form with geographic auto-completion, spam traps, and validation. |
| `/dashboard` | **Dashboard**: Global and filtered observation trends, category distribution breakdown, and recent activity records. |

---

## Database Strategy

SoilTrace currently leverages SQLite in the local `instance/` directory with automatic schema migrations implemented in `app/db.py`. 

The data access layer uses standard SQL queries, making it simple to migrate to PostgreSQL (e.g. Supabase) for production deployment with minimal changes to business logic.
