document.addEventListener('DOMContentLoaded', function() {
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    
    if (navbarToggler && navbarCollapse) {
        const setMenuState = isOpen => {
            navbarCollapse.classList.toggle('active', isOpen);
            navbarToggler.classList.toggle('active', isOpen);
            navbarToggler.setAttribute('aria-expanded', String(isOpen));
        };

        navbarToggler.addEventListener('click', function() {
            const isOpen = !navbarCollapse.classList.contains('active');
            setMenuState(isOpen);
            const spans = this.querySelectorAll('span');
            spans.forEach((span, index) => {
                if (isOpen) {
                    if (index === 0) span.style.transform = 'rotate(45deg) translate(5px, 6px)';
                    if (index === 1) span.style.opacity = '0';
                    if (index === 2) span.style.transform = 'rotate(-45deg) translate(5px, -6px)';
                } else {
                    span.style.transform = 'none';
                    span.style.opacity = '1';
                }
            });
        });
        
        document.addEventListener('click', function(event) {
            if (!navbarCollapse.contains(event.target) && !navbarToggler.contains(event.target)) {
                setMenuState(false);
                const spans = navbarToggler.querySelectorAll('span');
                spans.forEach(span => {
                    span.style.transform = 'none';
                    span.style.opacity = '1';
                });
            }
        });
        
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    setMenuState(false);
                    const spans = navbarToggler.querySelectorAll('span');
                    spans.forEach(span => {
                        span.style.transform = 'none';
                        span.style.opacity = '1';
                    });
                }
            });
        });
    }
});