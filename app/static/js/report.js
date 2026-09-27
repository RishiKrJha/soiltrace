const observationForm = document.querySelector('#observation-form');
const successMessage = document.querySelector('#success-message');
const photographInput = document.querySelector('#photograph');
const fileName = document.querySelector('#file-name');
const newObservationButton = document.querySelector('#new-observation');

photographInput?.addEventListener('change', () => {
    const [file] = photographInput.files;
    fileName.textContent = file ? file.name : '';
});

observationForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    observationForm.hidden = true;
    successMessage.hidden = false;
});

newObservationButton?.addEventListener('click', () => {
    observationForm.reset();
    fileName.textContent = '';
    observationForm.hidden = false;
    successMessage.hidden = true;
    observationForm.querySelector('input')?.focus();
});