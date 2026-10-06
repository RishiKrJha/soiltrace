const description = document.querySelector('#description');
const descriptionCount = document.querySelector('#description-count');

function updateDescriptionCount() {
    if (description && descriptionCount) {
        descriptionCount.textContent = `${description.value.length} / ${description.maxLength} characters`;
    }
}

description?.addEventListener('input', updateDescriptionCount);
updateDescriptionCount();
