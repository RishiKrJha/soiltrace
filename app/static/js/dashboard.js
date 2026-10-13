/**
 * SoilTrace AI Overview Controller
 * 
 * Manages the interactive AI Overview section with:
 * - Dynamic cooldown (30s for same scope, 10s when switching scopes)
 * - In-memory cooldown state (automatically resets on full page reload / hard reload)
 * - On-demand ephemeral generation for country filters
 * - Seamless AJAX updates without reloading the dashboard
 */
(function () {
    const btn = document.getElementById('ai-update-btn');
    if (!btn) return;

    const btnText = document.getElementById('ai-btn-text');
    const overviewText = document.getElementById('ai-overview-text');
    const kicker = document.getElementById('ai-overview-kicker');
    const metaModel = document.getElementById('ai-meta-model');
    const metaReports = document.getElementById('ai-meta-reports');
    const metaTime = document.getElementById('ai-meta-time');
    const loadingState = document.getElementById('ai-overview-loading');

    // In-memory runtime state: resets on page load / hard reload
    let lastRequestedScope = null;
    let lastRequestTimestamp = 0;
    let countdownInterval = null;

    function getCurrentScope() {
        return btn.getAttribute('data-current-scope') || 'global';
    }

    function getScopeName() {
        const scope = getCurrentScope();
        if (scope === 'global' || !scope) return 'Global';
        return btn.getAttribute('data-scope-name') || scope;
    }

    function getBaseButtonText() {
        const scope = getCurrentScope();
        if (scope === 'global' || !scope) {
            return 'Update Overview';
        }
        const name = getScopeName();
        return `Generate ${name} Overview`;
    }

    function updateButtonUI(remainingSecs = 0) {
        if (remainingSecs > 0) {
            btn.disabled = true;
            btn.classList.add('ai-btn-cooldown');
            btnText.textContent = `Please wait (${remainingSecs}s)`;
        } else {
            btn.disabled = false;
            btn.classList.remove('ai-btn-cooldown');
            btnText.textContent = getBaseButtonText();
        }
    }

    function startCooldown(seconds) {
        clearInterval(countdownInterval);
        let remaining = seconds;
        updateButtonUI(remaining);

        countdownInterval = setInterval(() => {
            remaining -= 1;
            if (remaining <= 0) {
                clearInterval(countdownInterval);
                updateButtonUI(0);
            } else {
                updateButtonUI(remaining);
            }
        }, 1000);
    }

    btn.addEventListener('click', async function (e) {
        e.preventDefault();
        const currentScope = getCurrentScope();
        const now = Date.now();

        // Check dynamic cooldown if a previous request was made in this session
        if (lastRequestTimestamp > 0) {
            const isSameScope = (lastRequestedScope === currentScope);
            const requiredCooldownSecs = isSameScope ? 30 : 10;
            const elapsedSecs = Math.floor((now - lastRequestTimestamp) / 1000);
            const remaining = requiredCooldownSecs - elapsedSecs;

            if (remaining > 0) {
                startCooldown(remaining);
                return;
            }
        }

        // Enter loading state
        btn.disabled = true;
        btn.classList.add('ai-btn-loading');
        btnText.textContent = 'Analyzing reports...';
        if (loadingState) loadingState.style.display = 'flex';
        if (overviewText) overviewText.style.opacity = '0.35';

        try {
            const targetCountryCode = (currentScope === 'global') ? '' : currentScope;
            const response = await fetch('/api/ai-overview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    country_code: targetCountryCode,
                    force: true,
                }),
            });

            if (!response.ok) {
                throw new Error(`Server returned HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.success && data.summary) {
                if (overviewText) {
                    overviewText.textContent = data.summary;
                    overviewText.style.opacity = '1';
                }

                if (kicker) {
                    if (data.is_ephemeral && data.scope_label) {
                        kicker.textContent = `${data.scope_label} pulse`;
                    } else {
                        kicker.textContent = 'Community pulse';
                    }
                }

                if (metaModel) {
                    metaModel.textContent = data.model_used || 'Automated Synthesis';
                }

                if (metaReports) {
                    metaReports.textContent = `${data.report_count} observations`;
                }

                if (metaTime) {
                    metaTime.textContent = data.updated_label || 'Just updated';
                }

                // Cooldown:
                // If they click again for the same scope, 30s.
                // If they switch scope, 10s cooldown rule will apply on next attempt.
                lastRequestedScope = currentScope;
                lastRequestTimestamp = Date.now();
                startCooldown(30);
            } else {
                throw new Error(data.message || 'Unknown response format');
            }
        } catch (err) {
            console.error('SoilTrace AI Overview error:', err);
            if (overviewText) overviewText.style.opacity = '1';
            updateButtonUI(0);
        } finally {
            if (loadingState) loadingState.style.display = 'none';
            btn.classList.remove('ai-btn-loading');
        }
    });

    // Mobile read more / show less toggle
    const expandBtn = document.getElementById('ai-expand-btn');
    if (expandBtn && overviewText) {
        expandBtn.addEventListener('click', function () {
            const isCurrentlyCollapsed = overviewText.classList.contains('is-collapsed');
            const expandText = expandBtn.querySelector('.ai-expand-text');

            if (isCurrentlyCollapsed) {
                overviewText.classList.remove('is-collapsed');
                overviewText.classList.add('is-expanded');
                expandBtn.setAttribute('aria-expanded', 'true');
                if (expandText) expandText.textContent = 'Show less';
            } else {
                overviewText.classList.remove('is-expanded');
                overviewText.classList.add('is-collapsed');
                expandBtn.setAttribute('aria-expanded', 'false');
                if (expandText) expandText.textContent = 'Read more';
            }
        });
    }

    // Initial state: ready to go (resets on full reload)
    updateButtonUI(0);
})();

