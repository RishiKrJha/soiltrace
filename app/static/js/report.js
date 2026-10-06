const description = document.querySelector('#description');
const descriptionCount = document.querySelector('#description-count');
const observationForm = document.querySelector('#observation-form');
const countryInput = document.querySelector('#country');
const countryCodeInput = document.querySelector('#country-code');
const countryOptions = document.querySelector('#country-options');
const countryStatus = document.querySelector('#country-status');
const regionFieldset = document.querySelector('#region-fieldset');
const regionInput = document.querySelector('#region');
const regionCodeInput = document.querySelector('#region-code');
const regionOptions = document.querySelector('#region-options');
const regionRequiredInput = document.querySelector('#region-required');
const regionRequiredMarker = document.querySelector('#region-required-marker');
const regionStatus = document.querySelector('#region-status');

let countries = [];
let selectedCountry = null;
const statesCache = new Map();

function updateDescriptionCount() {
    if (description && descriptionCount) {
        descriptionCount.textContent = `${description.value.length} / ${description.maxLength} characters`;
    }
}

function clearRegion() {
    regionInput.value = '';
    regionCodeInput.value = '';
    regionOptions.replaceChildren();
}

function hideRegion() {
    clearRegion();
    regionInput.disabled = true;
    regionInput.required = false;
    regionFieldset.hidden = true;
    regionRequiredInput.value = 'no';
    regionStatus.textContent = '';
}

function applyStates(country, states, preserveValue = false) {
    if (!states.length) {
        // No regions for this country — keep the fieldset fully hidden.
        hideRegion();
        return;
    }

    regionFieldset.hidden = false;

    if (!preserveValue) {
        clearRegion();
    }
    regionInput.disabled = false;
    regionInput.required = true;
    regionInput.placeholder = 'Start typing a state or region';
    regionRequiredInput.value = 'yes';
    regionRequiredMarker.hidden = false;
    regionStatus.textContent = 'Select a state or region from the suggestions.';
    regionOptions.replaceChildren(
        ...states.map((state) => new Option(state.name, state.name))
    );
    const selectedRegion = states.find(
        (state) => state.name.toLocaleLowerCase() === regionInput.value.trim().toLocaleLowerCase()
    );
    regionCodeInput.value = selectedRegion?.state_code || '';
    regionInput.setCustomValidity(selectedRegion ? '' : 'Select a state or region from the suggestions.');
}

function handleStatesLoadFailure() {
    // Graceful degradation: do not block form submission if the external states API fails
    regionFieldset.hidden = false;
    regionInput.disabled = false;
    regionInput.required = false;
    regionRequiredInput.value = 'no';
    regionRequiredMarker.hidden = true;
    regionInput.placeholder = 'State or region (optional)';
    regionStatus.textContent = 'Could not load regional suggestions. You may type your state/region manually or leave blank.';
    regionInput.setCustomValidity('');
}

async function loadStates(country, preserveValue = false) {
    const countryIso = country.iso2;

    if (statesCache.has(countryIso)) {
        applyStates(country, statesCache.get(countryIso), preserveValue);
        return;
    }

    // Show loading state
    regionFieldset.hidden = false;
    regionInput.disabled = true;
    regionStatus.textContent = 'Loading states or regions...';

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        const response = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ country: country.name }),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        // Ensure user hasn't switched country while request was in flight
        if (selectedCountry?.iso2 !== countryIso) {
            return;
        }

        const result = await response.json();
        if (!response.ok || result.error || !result.data || !Array.isArray(result.data.states)) {
            throw new Error('States data unavailable.');
        }

        const states = result.data.states;
        statesCache.set(countryIso, states);
        applyStates(country, states, preserveValue);
    } catch (_error) {
        if (selectedCountry?.iso2 !== countryIso) {
            return;
        }
        handleStatesLoadFailure();
    }
}

function selectCountry(preserveRegion = false) {
    const value = countryInput.value.trim().toLocaleLowerCase();
    selectedCountry = countries.find(
        (country) => country.name.toLocaleLowerCase() === value
    ) || null;

    countryCodeInput.value = selectedCountry?.iso2 || '';
    countryInput.setCustomValidity(selectedCountry ? '' : 'Select a country from the suggestions.');
    if (selectedCountry) {
        loadStates(selectedCountry, preserveRegion);
    } else {
        hideRegion();
    }
}

function selectRegion() {
    if (!selectedCountry || regionInput.disabled) {
        return;
    }
    const states = statesCache.get(selectedCountry.iso2) || [];
    const value = regionInput.value.trim().toLocaleLowerCase();
    const selectedRegion = states.find(
        (state) => state.name.toLocaleLowerCase() === value
    );
    regionCodeInput.value = selectedRegion?.state_code || '';
    if (states.length > 0) {
        regionInput.setCustomValidity(selectedRegion ? '' : 'Select a state or region from the suggestions.');
    } else {
        regionInput.setCustomValidity('');
    }
}

async function loadLocationOptions() {
    try {
        const countriesUrl = countryInput?.dataset.countriesUrl || '/static/countries.json';
        const response = await fetch(countriesUrl);
        const result = await response.json();
        const countriesList = Array.isArray(result) ? result : result.data;
        if (!response.ok || !Array.isArray(countriesList)) {
            throw new Error('Location data was unavailable.');
        }
        countries = countriesList;
        countryOptions.replaceChildren(
            ...countries.map((country) => new Option(country.name, country.name))
        );
        countryInput.disabled = false;
        countryStatus.textContent = 'Start typing, then select a country from the suggestions.';
        selectCountry(true);
    } catch (_error) {
        countryStatus.textContent = 'Country options could not load. Please refresh and try again.';
    }
}

description?.addEventListener('input', updateDescriptionCount);
countryInput?.addEventListener('input', () => selectCountry(false));
countryInput?.addEventListener('change', () => selectCountry(false));
regionInput?.addEventListener('input', selectRegion);
regionInput?.addEventListener('change', selectRegion);
observationForm?.addEventListener('submit', (event) => {
    selectCountry(true);
    selectRegion();
    if (!selectedCountry || (regionInput.required && !regionCodeInput.value && !regionInput.value)) {
        event.preventDefault();
        observationForm.reportValidity();
    }
});

updateDescriptionCount();
loadLocationOptions();
