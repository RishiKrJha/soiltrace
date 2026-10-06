/**
 * SoilTrace - Interactive Homepage & Awareness Engine
 * Features:
 * 1. Live Soil Risk & Threshold Analyzer (MoEFCC 2015, EU Directive, WHO Standards)
 * 2. Pedosphere Stratigraphy Horizon Switcher (0-20cm, 20-80cm, 80cm+)
 * 3. Verified Contamination Hotspots Dossier Explorer
 * 4. Scroll-Triggered Reveal Animations
 */

(function () {
    'use strict';

    // --- CONTAMINANT STANDARDS DATABASE ---
    const CONTAMINANT_DATA = {
        lead: {
            name: 'Lead (Pb)',
            symbol: 'Pb',
            atomicNumber: 82,
            unit: 'mg/kg',
            defaultVal: 85,
            min: 0,
            max: 500,
            limits: {
                agricultural: 70,
                residential: 140,
                industrial: 260
            },
            statutoryAuthority: 'MoEFCC (2015) Screening Standard & EU Directive 86/278/EEC',
            cropStandard: 'FSSAI Vegetable Maximum Limit: 2.5 mg/kg',
            healthImpact: 'Potent cumulative neurotoxin causing irreversible cognitive deficits and developmental delay in children. WHO / IHME attributes 3.5 million cardiovascular deaths globally in 2023 directly to lead exposure.',
            agriImpact: 'Strong root bioaccumulation in leafy vegetables. The NEERI Yamuna Floodplain study revealed spinach accumulating 14.1 mg/kg of lead—nearly 6 times the FSSAI legal safety cap.',
            remediation: 'Apply woody biochar amendment (achieves up to 72.9% lead immobilization), induce insoluble pyromorphite formation with phosphorus, or utilize phytoremediation with Indian mustard (Brassica juncea).'
        },
        cadmium: {
            name: 'Cadmium (Cd)',
            symbol: 'Cd',
            atomicNumber: 48,
            unit: 'mg/kg',
            defaultVal: 2.2,
            min: 0,
            max: 30,
            step: 0.1,
            limits: {
                agricultural: 1.4,
                residential: 10,
                industrial: 22
            },
            statutoryAuthority: 'MoEFCC (2015) Guidelines & EU LUCAS Baseline (Mean 0.20 mg/kg)',
            cropStandard: 'WHO/FAO Vegetable Permissible Limit: 0.30 mg/kg',
            healthImpact: 'Bioaccumulates in human kidneys, inducing irreversible renal tubular dysfunction, chronic kidney failure, and severe bone demineralization (osteomalacia / Itai-itai syndrome).',
            agriImpact: 'High soil-to-plant transfer factor via zinc transport channels. Readily taken up by wheat, rice, and brassica crops from historical phosphate fertilizer applications.',
            remediation: 'Lignocellulose-derived biochar amendment achieves up to 96.34% reduction in soil cadmium bioavailability. Adjust soil pH to neutral/alkaline (>6.5) using agricultural lime to suppress mobility.'
        },
        chromium: {
            name: 'Hexavalent Chromium Cr(VI)',
            symbol: 'Cr(VI)',
            atomicNumber: 24,
            unit: 'mg/kg',
            defaultVal: 1.2,
            min: 0,
            max: 20,
            step: 0.1,
            limits: {
                agricultural: 0.4,
                residential: 0.4,
                industrial: 1.4
            },
            statutoryAuthority: 'MoEFCC (2015) Environmental Standards & CPCB Framework',
            cropStandard: 'Drinking Water Leaching Threshold: 0.05 mg/L (WHO)',
            healthImpact: 'Group 1 human carcinogen. Chronic exposure causes severe gastrointestinal ulcers, bronchogenic carcinomas, and ulcerating contact dermatitis.',
            agriImpact: 'Extremely soluble and mobile in oxidised soils. Stunts root elongation, inhibits seed germination, and percolates rapidly into groundwater aquifers.',
            remediation: 'In-situ chemical reduction via Stannous Chloride (SnCl₂) converts soluble Cr(VI) to insoluble Trivalent Chromium Cr(III) precipitate. Alternatively, deploy microbial reduction with Bacillus subtilis.'
        },
        arsenic: {
            name: 'Arsenic (As)',
            symbol: 'As',
            atomicNumber: 33,
            unit: 'mg/kg',
            defaultVal: 16,
            min: 0,
            max: 100,
            limits: {
                agricultural: 12,
                residential: 12,
                industrial: 12
            },
            statutoryAuthority: 'MoEFCC (2015) Soil Screening Values',
            cropStandard: 'FAO/WHO Maximum Level in Polished Rice: 0.2 mg/kg',
            healthImpact: 'Systemic carcinogen causing arsenicosis (hyperkeratosis and melanosis skin lesions), peripheral neuropathy (15.4% incidence in Nadia, WB), and bladder/skin cancers.',
            agriImpact: 'Highly bioavailable in anaerobic submerged soils (paddy cultivation). Plants absorb arsenic as arsenate/arsenite, triggering straighthead disease in rice crops.',
            remediation: 'Implement Alternate Wetting and Drying (AWD) irrigation to aerate soils, amend with iron oxide nanoparticles to bind arsenic, or cultivate arsenic-hyperaccumulating ferns (Pteris vittata).'
        },
        nickel: {
            name: 'Nickel (Ni)',
            symbol: 'Ni',
            atomicNumber: 28,
            unit: 'mg/kg',
            defaultVal: 65,
            min: 0,
            max: 250,
            limits: {
                agricultural: 50,
                residential: 50,
                industrial: 50
            },
            statutoryAuthority: 'MoEFCC (2015) & EU Directive 86/278/EEC (30-75 mg/kg limit)',
            cropStandard: 'Critical Phytotoxic Soil Threshold: >60 mg/kg',
            healthImpact: 'Contact dermatitis (nickel allergy), respiratory inflammation, and cellular oxidative stress upon airborne dust exposure.',
            agriImpact: 'Essential trace micronutrient in minute amounts, but elevated levels induce acute chlorosis, nutrient lockout of iron/zinc, and root tissue necrosis.',
            remediation: 'Soil organic carbon enrichment through humified compost to complex free Ni²⁺ ions, combined with phytomining using nickel hyperaccumulator plants.'
        }
    };

    // --- STRATIGRAPHY HORIZONS DATA ---
    const HORIZONS_DATA = {
        topsoil: {
            name: '0 – 20 cm: Epipedon & Rhizosphere',
            badge: 'Biological Hotspot',
            depthText: 'Active Root Zone & Surface Organic Layer',
            pollutants: 'Microplastics (12.5 Mt mulch films), Agrochemical residues, Lead particulate dust, Cadmium from phosphate fertilizers.',
            dynamics: 'Contains highest biological activity (microbial biomass carbon, dehydrogenase enzyme respiration). This horizon is where plant root capillaries directly absorb ionic heavy metals and transport them into edible agricultural crops.',
            status: 'Vulnerable to erosion, compaction, and agrochemical saturation. 73% of Indian soils show organic carbon deficiency (<0.75%) here.'
        },
        subsoil: {
            name: '20 – 80 cm: Illuvial B-Horizon',
            badge: 'Mineral Retention Zone',
            depthText: 'Clay & Iron Oxide Accumulation Layer',
            pollutants: 'Leached Cadmium, Copper, Zinc, and persistent organic compounds (POPs).',
            dynamics: 'Characterized by high cation exchange capacity. Heavy metals bind tightly to clay platelets and sesquioxides, creating persistent subterranean contamination reservoirs that resist natural degradation for centuries.',
            status: 'Acting as an underground buffer; once saturation thresholds are exceeded, contaminants breakthrough into deep groundwater.'
        },
        bedrock: {
            name: '80+ cm: Deep Substratum & Aquifers',
            badge: 'Aquifer Vector',
            depthText: 'Water Table & Weathered Bedrock Matrix',
            pollutants: 'Soluble Hexavalent Chromium Cr(VI), Arsenic, Industrial Solvents, Nitrates.',
            dynamics: 'Water-soluble and mobile contaminants breach the soil matrix and contaminate groundwater aquifers. In the TCCL Ranipet hotspot, Cr(VI) groundwater levels reached 277.6 mg/L—exceeding the WHO safe drinking limit by 5,550 times.',
            status: 'Critical vector for regional human ingestion via drinking water tubewells and deep agricultural irrigation borewells.'
        }
    };

    // --- HOTSPOTS DATA ---
    const HOTSPOTS_DATA = {
        ranipet: {
            title: 'Ranipet TCCL Industrial Corridor',
            location: 'Ranipet, Tamil Nadu, India',
            contaminant: 'Hexavalent Chromium Cr(VI)',
            peakValue: '5,596 mg/kg (Soil) | 277.6 mg/L (Groundwater)',
            legalStatus: 'Confirmed Contaminated Site (CPCB & NGT)',
            cost: '₹206 Crore (Soil ₹194 Cr + Water ₹12 Cr)',
            vector: 'Decades of open-air dumping of Chromium Ore Processing Residue (COPR) caused acute aquifer leaching exceeding drinking water caps by 5,550×.',
            details: 'National Green Tribunal remediation mandates ordered excavation, stabilization, and deep groundwater pump-and-treat systems to halt regional toxic dispersion.'
        },
        yamuna: {
            title: 'Yamuna River Agricultural Floodplains',
            location: 'Delhi-NCR, India (Usmanpur, Mayur Vihar, Geeta Colony)',
            contaminant: 'Lead (Pb) & Cadmium (Cd) Bioaccumulation',
            peakValue: 'Spinach: 14.1 mg/kg Pb | Veg Cd Mean: 2.34 mg/kg',
            legalStatus: 'Documented NEERI & University of Delhi Study',
            cost: 'Multi-crore Public Health Burden',
            vector: 'Irrigation of winter vegetables with industrial effluent-choked river water. Produce sold across major wholesale mandis (Azadpur, Ghazipur).',
            details: 'Spinach samples exceeded FSSAI lead thresholds by nearly 600%. Clinical surveys revealed 23% of tested local children exhibited blood lead >10 µg/dL.'
        },
        jajmau: {
            title: 'Jajmau Tannery Sludge Complex',
            location: 'Kanpur, Uttar Pradesh, India',
            contaminant: 'Total Chromium & Hexavalent Chromium',
            peakValue: '40,500 mg/kg Total Cr | 1,400 mg/kg Cr(VI)',
            legalStatus: 'High-Priority CPCB Remediation Site',
            cost: 'Severely Degraded Arable Ecosystem',
            vector: 'Decades of unscientific tannery sludge disposal and untreated industrial effluent irrigation across peri-urban agricultural soils.',
            details: 'Local community health audits revealed almost double the incidence of chronic gastrointestinal distress (39.3% vs 19.1%) and quadruple the rate of severe skin lesions.'
        },
        bhopal: {
            title: 'Bhopal UCIL Legacy Chemical Complex',
            location: 'Bhopal, Madhya Pradesh, India',
            contaminant: 'Carbaryl, Aldicarb, Mercury, Arsenic, Lead',
            peakValue: 'Subsurface Pesticide & Heavy Metal Plume',
            legalStatus: 'Centrally Geofenced Contaminated Site (CPCB)',
            cost: 'Ongoing Multi-Decadal Remediation Liability',
            vector: 'Pesticide manufacturing waste and solar evaporation pond breaches resulting in persistent organochlorine and heavy metal saturation.',
            details: 'Sampling by CPCB confirmed carbaryl present in 75% of perimeter samples, with mercury and arsenic penetrating deep into municipal groundwater aquifers.'
        },
        sukinda: {
            title: 'Sukinda Valley Chromite Mining Basin',
            location: 'Jajpur District, Odisha, India',
            contaminant: 'Hexavalent Chromium Cr(VI) Runoff',
            peakValue: 'Severe Surface & Agricultural Water Contamination',
            legalStatus: 'Major Mining Overburden Remediation Site',
            cost: 'Ecological Restoration In Progress',
            vector: 'Massive open-cast chromite ore mining tailings exposed to rainfall leaching hexavalent chromium into the Brahmani river basin.',
            details: 'Affects thousands of surrounding agricultural families relying on local waterways for irrigation and personal consumption.'
        }
    };

    // --- DOM INITIALIZATION ---
    document.addEventListener('DOMContentLoaded', function () {
        initRiskAnalyzer();
        initStratigraphyExplorer();
        initHotspotsExplorer();
        initScrollAnimations();
        initSmoothAnchors();
    });

    // 1. RISK ANALYZER ENGINE
    function initRiskAnalyzer() {
        const contaminantSelect = document.getElementById('analyzer-contaminant');
        const landUseRadios = document.querySelectorAll('input[name="land-use"]');
        const valueSlider = document.getElementById('analyzer-slider');
        const valueInput = document.getElementById('analyzer-value');
        const unitDisplay = document.getElementById('analyzer-unit');

        if (!contaminantSelect || !valueSlider || !valueInput) return;

        function getCurrentLandUse() {
            const checked = document.querySelector('input[name="land-use"]:checked');
            return checked ? checked.value : 'agricultural';
        }

        function updateSliderLimits() {
            const key = contaminantSelect.value;
            const data = CONTAMINANT_DATA[key];
            if (!data) return;

            valueSlider.min = data.min;
            valueSlider.max = data.max;
            valueSlider.step = data.step || 1;
            unitDisplay.textContent = data.unit;

            // Reset value to reasonable default if outside bounds
            let cur = parseFloat(valueInput.value);
            if (isNaN(cur) || cur > data.max || cur < data.min) {
                valueSlider.value = data.defaultVal;
                valueInput.value = data.defaultVal;
            }
            calculateRisk();
        }

        function calculateRisk() {
            const key = contaminantSelect.value;
            const data = CONTAMINANT_DATA[key];
            const landUse = getCurrentLandUse();
            const val = parseFloat(valueInput.value) || 0;
            if (!data) return;

            const statutoryLimit = data.limits[landUse] || data.limits.agricultural;
            const ratio = val / statutoryLimit;

            // DOM elements to update
            const statusBadge = document.getElementById('analyzer-status-badge');
            const statusSummary = document.getElementById('analyzer-status-summary');
            const gaugeBar = document.getElementById('analyzer-gauge-bar');
            const limitDisplay = document.getElementById('analyzer-limit-display');
            const authorityDisplay = document.getElementById('analyzer-authority');
            const healthDisplay = document.getElementById('analyzer-health');
            const agriDisplay = document.getElementById('analyzer-agri');
            const remedyDisplay = document.getElementById('analyzer-remedy');
            const cropStandardDisplay = document.getElementById('analyzer-crop-standard');

            limitDisplay.textContent = `${statutoryLimit} ${data.unit}`;
            authorityDisplay.textContent = data.statutoryAuthority;
            healthDisplay.textContent = data.healthImpact;
            agriDisplay.textContent = data.agriImpact;
            remedyDisplay.textContent = data.remediation;
            if (cropStandardDisplay) {
                cropStandardDisplay.textContent = data.cropStandard;
            }

            // Determine status
            let statusText = '';
            let statusClass = '';
            let summaryText = '';
            let gaugePercent = Math.min(100, Math.max(5, (val / (statutoryLimit * 2.5)) * 100));

            if (ratio <= 0.6) {
                statusText = 'Low Baseline (Safe)';
                statusClass = 'status-safe';
                summaryText = `Concentration is well within the statutory limit (${((1 - ratio) * 100).toFixed(0)}% below legal cutoff). Natural background levels intact.`;
            } else if (ratio <= 1.0) {
                statusText = 'Permissible Threshold (Caution)';
                statusClass = 'status-caution';
                summaryText = `Concentration approaches the regulatory threshold (${(ratio * 100).toFixed(0)}% of legal limit). Monitor closely to prevent soil saturation.`;
            } else if (ratio <= 2.5) {
                statusText = 'Elevated Contamination (Non-Compliant)';
                statusClass = 'status-warning';
                const exceedPct = ((ratio - 1) * 100).toFixed(0);
                summaryText = `Exceeds the ${landUse} legal safety limit by +${exceedPct}%. High risk of vegetative uptake and groundwater migration.`;
            } else {
                statusText = 'Severe Toxic Hazard (Critical)';
                statusClass = 'status-danger';
                const times = ratio.toFixed(1);
                summaryText = `Extreme contamination: ${times}x times the statutory threshold! Requires immediate soil containment and official site remediation.`;
            }

            statusBadge.textContent = statusText;
            statusBadge.className = `status-badge ${statusClass}`;
            statusSummary.textContent = summaryText;

            gaugeBar.style.width = `${gaugePercent}%`;
            gaugeBar.className = `gauge-progress ${statusClass}`;
        }

        // Event Listeners
        contaminantSelect.addEventListener('change', updateSliderLimits);
        landUseRadios.forEach(radio => radio.addEventListener('change', calculateRisk));

        valueSlider.addEventListener('input', function () {
            valueInput.value = this.value;
            calculateRisk();
        });

        valueInput.addEventListener('input', function () {
            valueSlider.value = this.value;
            calculateRisk();
        });

        // Initial setup
        updateSliderLimits();
    }

    // 2. STRATIGRAPHY HORIZONS SWITCHER
    function initStratigraphyExplorer() {
        const horizonButtons = document.querySelectorAll('[data-horizon-target]');
        if (!horizonButtons.length) return;

        const nameEl = document.getElementById('horizon-name');
        const badgeEl = document.getElementById('horizon-badge');
        const depthEl = document.getElementById('horizon-depth');
        const pollutantsEl = document.getElementById('horizon-pollutants');
        const dynamicsEl = document.getElementById('horizon-dynamics');
        const statusEl = document.getElementById('horizon-status');
        const layers = document.querySelectorAll('.stratum-layer');

        horizonButtons.forEach(btn => {
            btn.addEventListener('click', function () {
                const targetKey = this.getAttribute('data-horizon-target');
                const data = HORIZONS_DATA[targetKey];
                if (!data) return;

                // Update active button state
                horizonButtons.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-selected', 'false');
                });
                this.classList.add('active');
                this.setAttribute('aria-selected', 'true');

                // Update layer highlight
                layers.forEach(layer => {
                    if (layer.getAttribute('data-layer') === targetKey) {
                        layer.classList.add('stratum-highlighted');
                    } else {
                        layer.classList.remove('stratum-highlighted');
                    }
                });

                // Update text with quick cross-fade
                if (nameEl) nameEl.textContent = data.name;
                if (badgeEl) badgeEl.textContent = data.badge;
                if (depthEl) depthEl.textContent = data.depthText;
                if (pollutantsEl) pollutantsEl.textContent = data.pollutants;
                if (dynamicsEl) dynamicsEl.textContent = data.dynamics;
                if (statusEl) statusEl.textContent = data.status;
            });
        });
    }

    // 3. HOTSPOTS EXPLORER
    function initHotspotsExplorer() {
        const hotspotButtons = document.querySelectorAll('[data-hotspot-target]');
        if (!hotspotButtons.length) return;

        const titleEl = document.getElementById('hotspot-title');
        const locEl = document.getElementById('hotspot-location');
        const contamEl = document.getElementById('hotspot-contaminant');
        const peakEl = document.getElementById('hotspot-peak');
        const statusEl = document.getElementById('hotspot-status');
        const costEl = document.getElementById('hotspot-cost');
        const vectorEl = document.getElementById('hotspot-vector');
        const detailsEl = document.getElementById('hotspot-details');

        hotspotButtons.forEach(btn => {
            btn.addEventListener('click', function () {
                const targetKey = this.getAttribute('data-hotspot-target');
                const data = HOTSPOTS_DATA[targetKey];
                if (!data) return;

                hotspotButtons.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-selected', 'false');
                });
                this.classList.add('active');
                this.setAttribute('aria-selected', 'true');

                if (titleEl) titleEl.textContent = data.title;
                if (locEl) locEl.textContent = data.location;
                if (contamEl) contamEl.textContent = data.contaminant;
                if (peakEl) peakEl.textContent = data.peakValue;
                if (statusEl) statusEl.textContent = data.legalStatus;
                if (costEl) costEl.textContent = data.cost;
                if (vectorEl) vectorEl.textContent = data.vector;
                if (detailsEl) detailsEl.textContent = data.details;
            });
        });
    }

    // 4. SCROLL REVEAL ANIMATIONS
    function initScrollAnimations() {
        const revealElements = document.querySelectorAll('.reveal-on-scroll');
        if (!revealElements.length || !('IntersectionObserver' in window)) {
            // Fallback: make everything visible immediately
            revealElements.forEach(el => el.classList.add('is-revealed'));
            return;
        }

        const observer = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-revealed');
                        obs.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: 0.12,
                rootMargin: '0px 0px -40px 0px'
            }
        );

        revealElements.forEach(el => observer.observe(el));
    }

    // 5. SMOOTH ANCHOR NAVIGATION
    function initSmoothAnchors() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href').slice(1);
                if (!targetId) return;
                const targetElem = document.getElementById(targetId);
                if (targetElem) {
                    e.preventDefault();
                    targetElem.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
})();

