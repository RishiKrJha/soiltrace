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
// Populated after the API loads — countries whose `states` array is empty.
// We derive this from the API rather than maintaining a hardcoded allowlist.
const countriesWithoutRegions = new Set();

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

function showRegion(country, preserveValue = false) {
    const states = countriesWithoutRegions.has(country.iso2) ? [] : country.states || [];
    regionFieldset.hidden = false;

    if (!states.length) {
        clearRegion();
        regionInput.disabled = true;
        regionInput.required = false;
        regionInput.placeholder = 'No state or region is required';
        regionRequiredInput.value = 'no';
        regionRequiredMarker.hidden = true;
        regionStatus.textContent = `${country.name} does not require a state or region.`;
        return;
    }

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
}

function selectCountry(preserveRegion = false) {
    const value = countryInput.value.trim().toLocaleLowerCase();
    selectedCountry = countries.find(
        (country) => country.name.toLocaleLowerCase() === value
    ) || null;

    countryCodeInput.value = selectedCountry?.iso2 || '';
    countryInput.setCustomValidity(selectedCountry ? '' : 'Select a country from the suggestions.');
    if (selectedCountry) {
        showRegion(selectedCountry, preserveRegion);
    } else {
        hideRegion();
    }
}

function selectRegion() {
    if (!selectedCountry || regionInput.disabled) {
        return;
    }
    const value = regionInput.value.trim().toLocaleLowerCase();
    const selectedRegion = selectedCountry.states.find(
        (state) => state.name.toLocaleLowerCase() === value
    );
    regionCodeInput.value = selectedRegion?.state_code || '';
    regionInput.setCustomValidity(selectedRegion ? '' : 'Select a state or region from the suggestions.');
}

async function loadLocationOptions() {
    try {
        const response = await fetch('https://countriesnow.space/api/v0.1/countries/states');
        const result = await response.json();
        if (!response.ok || result.error || !Array.isArray(result.data)) {
            throw new Error('Location data was unavailable.');
        }
        countries = result.data;
        // Derive the set of countries that report no states/regions from the API response.
        countriesWithoutRegions.clear();
        for (const country of countries) {
            if (!country.states || !country.states.length) {
                countriesWithoutRegions.add(country.iso2);
            }
        }
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
