import hashlib
import json
import logging
import os
import urllib.error
import urllib.request

logger = logging.getLogger(__name__)

# Complete model list prioritized strictly by available Google AI Studio rate limits:
# Tier 1 (14,400 RPD, 30 RPM): gemma-4-26b, gemma-4-31b
# Tier 2 (500 RPD, 15 RPM):   gemini-3.5-flash-lite, gemini-3.1-flash-lite
# Tier 3 (20 RPD, 10 RPM):    gemini-2.5-flash-lite
# Tier 4 (20 RPD, 5 RPM):     gemini-3.8-flash, gemini-3.7-flash, gemini-3.6-flash, gemini-3-flash, gemini-2.5-flash
# Fallback standards:         gemini-2.0-flash, gemini-1.5-flash
DEFAULT_MODEL_CASCADE = [
    "gemma-4-26b",
    "gemma-4-31b",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3-flash",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
]


def get_model_cascade(custom_models=None):
    """
    Dynamically retrieve models from:
    1. custom_models parameter (from Flask config)
    2. GEMINI_MODELS environment variable
    3. DEFAULT_MODEL_CASCADE (full list sorted by limits)
    """
    if custom_models:
        return custom_models

    env_models = os.environ.get("GEMINI_MODELS", "").strip()
    if env_models:
        return [m.strip() for m in env_models.split(",") if m.strip()]

    return DEFAULT_MODEL_CASCADE


def compute_stats_hash(stats):
    """
    Compute a deterministic SHA-256 hash of the aggregated stats.
    Used for cache invalidation when underlying data changes.
    """
    stable_repr = {
        "scope": stats.get("scope_label", "Global"),
        "total": stats.get("total", 0),
        "recent_total": stats.get("recent_total", 0),
        "country_total": stats.get("country_total", 0),
        "categories": [
            (c.get("category"), c.get("total"))
            for c in stats.get("category_data", [])
        ],
        "regions": [
            (r.get("label"), r.get("total"))
            for r in stats.get("regional_data", [])
        ],
        "trends": [
            (t.get("label"), t.get("total"))
            for t in stats.get("trend_data", [])
        ],
    }
    dumped = json.dumps(stable_repr, sort_keys=True)
    return hashlib.sha256(dumped.encode("utf-8")).hexdigest()


def generate_fallback_summary(stats):
    """
    Detailed, deterministic rule-based summary grounded strictly in real dashboard data.
    Ensures 100% uptime if Google AI Studio is unreachable or no API key is provided.
    """
    total = stats.get("total", 0)
    scope = stats.get("scope_label", "Global")
    categories = stats.get("category_data", [])
    regions = stats.get("regional_data", [])
    recent = stats.get("recent_total", 0)

    if total == 0:
        return (
            f"No community soil observations are currently recorded for {scope}. "
            "As citizens submit local field observations, this automated synthesis will "
            "track emerging waste categories, regional hotspots, and monthly reporting velocity."
        )

    scope_str = "globally" if scope == "Global" else f"in {scope}"

    top_cat = categories[0] if categories else {"label": "Uncategorized waste", "percentage": 0, "total": 0}
    sec_cat = categories[1] if len(categories) > 1 else None

    if sec_cat:
        cat_details = (
            f"{top_cat['label']} forms the primary reported pollution category at {top_cat['percentage']}% "
            f"({top_cat['total']} reports), followed by {sec_cat['label']} at {sec_cat['percentage']}% "
            f"({sec_cat['total']} reports)."
        )
    else:
        cat_details = f"{top_cat['label']} represents the primary concern, accounting for {top_cat['percentage']}% ({top_cat['total']} reports) of entries."

    top_regions = [f"{r['label']} ({r['total']})" for r in regions[:3]] if regions else []
    if top_regions:
        reg_details = f"Geographically, submissions are concentrated around {', '.join(top_regions)}."
    else:
        reg_details = f"Reports are distributed across various documented locales {scope_str}."

    recent_pct = round((recent / total) * 100) if total else 0
    velocity_details = (
        f"Over the last 30 days, {recent} new observations ({recent_pct}% of total records) "
        "were submitted, reflecting active citizen surveillance."
    )

    takeaway = (
        "These community patterns highlight key ground-level priority areas for targeted remediation and inspection; "
        "however, they represent crowdsourced public field notes rather than certified laboratory soil analyses."
    )

    return f"Across {total} community observations recorded {scope_str}, {cat_details} {reg_details} {velocity_details} {takeaway}"


def format_overview_prompt(stats):
    """
    Create a strictly constrained data-grounded prompt for the Gemini/Gemma models.
    """
    scope = stats.get("scope_label", "Global")
    total = stats.get("total", 0)
    recent = stats.get("recent_total", 0)
    categories = stats.get("category_data", [])
    regions = stats.get("regional_data", [])
    trends = stats.get("trend_data", [])

    category_str = (
        ", ".join(
            f"{c['label']} ({c['total']} reports, {c['percentage']}%)"
            for c in categories[:4]
        )
        if categories
        else "None recorded"
    )

    region_str = (
        ", ".join(
            f"{r['label']} ({r['total']} reports)"
            for r in regions[:4]
        )
        if regions
        else "None recorded"
    )

    trend_str = (
        ", ".join(
            f"{t['label']} ({t['total']} reports)"
            for t in trends[-4:]
        )
        if trends
        else "No trend history"
    )

    return f"""You are the environmental data analyst for SoilTrace, a citizen science platform tracking unverified community-reported soil pollution signals.

Write a detailed, factual, and analytical paragraph (~90 to 130 words) summarizing these current community observations for scope: {scope}.

Data:
- Total community observations on record: {total}
- Recent reports (last 30 days): {recent}
- Leading reported categories: {category_str}
- Most reported regions/locations: {region_str}
- Recent monthly trend: {trend_str}

Strict Guidelines:
1. Detail both the primary and secondary reported soil-pollution categories with their percentages/counts.
2. Highlight the key regions or municipalities with the highest reporting concentrations.
3. Discuss the 30-day reporting momentum and any evident monthly pattern from the data.
4. Conclude with a clear takeaway on what these community observations suggest for environmental attention.
5. Clearly emphasize that these reflect unverified citizen field observations rather than certified laboratory findings.
6. Do NOT invent figures, places, or scientific claims beyond the provided data.
7. Keep the response to a cohesive single paragraph of approximately 90–130 words without markdown headers or bullet points.
"""


def call_gemini_model(model_name, prompt, api_key, timeout=12):
    """
    Make an HTTP POST request to Google AI Studio's Generative Language API
    using only Python standard library urllib.request.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 300,
        },
    }

    req_data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=req_data,
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=timeout) as response:
        result = json.loads(response.read().decode("utf-8"))
        candidates = result.get("candidates", [])
        if candidates and "content" in candidates[0] and "parts" in candidates[0]["content"]:
            parts = candidates[0]["content"]["parts"]
            text = "".join(part.get("text", "") for part in parts).strip()
            if text:
                return text
        raise ValueError("No text content returned in candidates")


def generate_overview(stats, api_key=None, custom_models=None):
    """
    Generates an AI overview by cascading through models according to quota priority.
    Falls back gracefully if quota is exhausted (429) or endpoint fails.
    Returns tuple: (summary_text, model_used)
    """
    if not api_key:
        logger.info("GEMINI_API_KEY is not set. Using rule-based fallback summary.")
        return generate_fallback_summary(stats), "Deterministic Rule Synthesis"

    models_to_try = get_model_cascade(custom_models)
    prompt = format_overview_prompt(stats)

    for model in models_to_try:
        try:
            logger.info("Attempting AI summary generation with model: %s", model)
            text = call_gemini_model(model, prompt, api_key)
            # Remove any wrapping markdown quotes or bold headlines if the model generated them
            cleaned = text.strip().replace('"', '').strip()
            if cleaned.startswith("Overview:"):
                cleaned = cleaned[len("Overview:"):].strip()
            return cleaned, model
        except urllib.error.HTTPError as e:
            logger.warning("Model %s returned HTTP error %d: %s. Trying next model...", model, e.code, e.reason)
            continue
        except Exception as e:
            logger.warning("Model %s failed with error: %s. Trying next model...", model, str(e))
            continue

    logger.warning("All models in cascade failed or rate-limited. Falling back to rule-based summary.")
    return generate_fallback_summary(stats), "Fallback Rule Synthesis"


def get_cached_overview(db, cache_key="global"):
    """
    Retrieve cached overview for cache_key from SQLite database.
    """
    row = db.execute(
        """SELECT cache_key, summary, model_used, stats_hash, report_count, updated_at
           FROM ai_summary_cache
           WHERE cache_key = ?""",
        (cache_key,),
    ).fetchone()
    if row:
        return dict(row)
    return None


def set_cached_overview(db, cache_key, summary, model_used, stats_hash, report_count):
    """
    Persistently store or update the AI overview in SQLite.
    """
    with db:
        db.execute(
            """INSERT INTO ai_summary_cache
               (cache_key, summary, model_used, stats_hash, report_count, updated_at)
               VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
               ON CONFLICT(cache_key) DO UPDATE SET
                   summary = excluded.summary,
                   model_used = excluded.model_used,
                   stats_hash = excluded.stats_hash,
                   report_count = excluded.report_count,
                   updated_at = CURRENT_TIMESTAMP""",
            (cache_key, summary, model_used, stats_hash, report_count),
        )

