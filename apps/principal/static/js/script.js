document.addEventListener('DOMContentLoaded', function () {
    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    hamburger.addEventListener('click', function () {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    // Close mobile menu when clicking a link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });

    // Smooth scrolling for all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            // Remove active class from all form cards
            document.querySelectorAll('.form-card').forEach(card => {
                card.classList.remove('active-form');
            });

            const targetId = this.getAttribute('href');

            // If it's a form section, highlight it
            if (targetId.includes('form-section')) {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.classList.add('active-form');
                }
            }

            // Scroll to the target element
            const target = document.querySelector(targetId);
            if (target) {
                // Calculate header height for offset
                const headerHeight = document.querySelector('header').offsetHeight;

                // Calculate position to scroll to (element position - header height - additional padding)
                const elementPosition = target.getBoundingClientRect().top + window.pageYOffset;
                const offsetPosition = elementPosition - headerHeight - 20;

                // Smooth scroll to the element
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Form submission handlers
    const contactForm = document.getElementById('contact-form');
    const registerForm = document.getElementById('register-form');
    const newsletterForm = document.getElementById('newsletter-form');

    // Contact form submission
    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();

        // In a real Django app, you would use AJAX to submit the form
        // or let Django handle the form submission

        // Simulate form submission
        const formData = new FormData(contactForm);

        // Validate form (simple validation for demo)
        const email = formData.get('email');
        const message = formData.get('message');

        if (!email || !message) {
            document.getElementById('contact-error').style.display = 'block';
            document.getElementById('contact-success').style.display = 'none';
            return;
        }

        // Simulate successful submission
        document.getElementById('contact-success').style.display = 'block';
        document.getElementById('contact-error').style.display = 'none';
        contactForm.reset();

        // In a real Django app, this would be handled by Django views
        console.log('Contact form submitted:', Object.fromEntries(formData));
    });

    // Registration form submission
    registerForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const formData = new FormData(registerForm);

        // Validate password match
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm_password');

        if (password !== confirmPassword) {
            document.getElementById('register-error').textContent = 'Passwords do not match.';
            document.getElementById('register-error').style.display = 'block';
            document.getElementById('register-success').style.display = 'none';
            return;
        }

        if (password.length < 8) {
            document.getElementById('register-error').textContent = 'Password must be at least 8 characters long.';
            document.getElementById('register-error').style.display = 'block';
            document.getElementById('register-success').style.display = 'none';
            return;
        }

        // Simulate successful registration
        document.getElementById('register-success').style.display = 'block';
        document.getElementById('register-error').style.display = 'none';
        registerForm.reset();

        console.log('Registration form submitted:', Object.fromEntries(formData));
    });

    // Newsletter form submission
    newsletterForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const formData = new FormData(newsletterForm);

        // Get selected interests
        const interests = [];
        document.querySelectorAll('input[name="interests"]:checked').forEach(checkbox => {
            interests.push(checkbox.value);
        });

        // Simulate successful subscription
        document.getElementById('newsletter-success').style.display = 'block';
        document.getElementById('newsletter-error').style.display = 'none';
        newsletterForm.reset();

        console.log('Newsletter form submitted:', {
            name: formData.get('name'),
            email: formData.get('email'),
            interests: interests,
            frequency: formData.get('frequency')
        });
    });

    // Highlight the active form when page loads if URL has a hash
    if (window.location.hash) {
        const targetElement = document.querySelector(window.location.hash);
        if (targetElement && targetElement.classList.contains('form-card')) {
            targetElement.classList.add('active-form');
        }
    }

    // Redirect to another page on button click
    document.getElementById('form-rapido').forEach(button => {
        button.addEventListener('click', function () {
            alert('Formulário enviado com sucesso!');
        });
    });
});

