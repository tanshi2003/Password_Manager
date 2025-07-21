document.addEventListener('DOMContentLoaded', () => {
    // Smooth Scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        });
    });
        // Password Toggle
        const show_pw_btn = document.querySelector('#show-passwd');
        if (show_pw_btn) {
            const show_pw_icon = show_pw_btn.querySelector('img');
            const pw_input = document.querySelector('#password');
    
            show_pw_btn.addEventListener('click', () => {
                pw_input.type = pw_input.type === 'password' ? 'text' : 'password';
                show_pw_icon.src = show_pw_icon.src.includes('open') 
                    ? 'eye_closed.svg' 
                    : 'eye_open.svg';
            });
        }
    
    // Sign Up Form Submission
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', function (e) {
            e.preventDefault(); // Prevent form submission

            const password = document.getElementById('password').value;
            const confirmPasswordField = document.getElementById('confirm-password');
            const confirmPassword = confirmPasswordField ? confirmPasswordField.value : '';

            if (confirmPasswordField && password !== confirmPassword) {
                alert('Passwords do not match!');
                return;
            }

            // Simulate success message
            const successMsg = document.getElementById('success-message');
            if (successMsg) successMsg.style.display = 'block';

            setTimeout(() => {
                window.location.href = 'signin.html'; // Redirect to sign-in page
            }, 2000);
        });
    }

    // Sign In Form Submission
    const signinForm = document.getElementById('signin-form');
    if (signinForm) {
        signinForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const signinButton = document.querySelector('#signin-form button[type="submit"]');
            signinButton.disabled = true; // Disable button temporarily

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            fetch('/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })
                .then(response => response.json())
                .then(data => {
                    if (data.message && data.user) {
                        localStorage.setItem('userFirst_name', data.user.first_name || '');
                        localStorage.setItem('userEmail', data.user.email || '');
                        window.location.href = 'dashboard.html';
                    } else {
                        alert('Sign-in failed. Please try again.');
                        signinButton.disabled = false;
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    signinButton.disabled = false;
                });
        });
    }

    // Forgot Password Functionality
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const modal = document.getElementById('forgot-password-modal');
    const closeBtn = document.querySelector('.close-btn');
    const resetButton = document.getElementById('reset-password-btn');
    const resetEmail = document.getElementById('reset-email');
    const resetMessage = document.getElementById('reset-message');

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (modal) modal.style.display = 'block';
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
        });
    }

    if (resetButton) {
        resetButton.addEventListener('click', () => {
            const email = resetEmail ? resetEmail.value.trim() : '';
            if (!email) {
                alert('Please enter an email address!');
                return;
            }

            resetButton.disabled = true;

            fetch('/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })
                .then(response => response.json())
                .then(data => {
                    if (data.message) {
                        resetMessage.textContent = 'A password update link has been sent to your email!';
                        resetMessage.style.display = 'block';
                    } else {
                        alert('Email not found. Please try again.');
                    }
                })
                .catch(error => console.error('Error:', error))
                .finally(() => resetButton.disabled = false);
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            if (modal) modal.style.display = 'none';
        }
    });
    // Hide button when clicking outside the password field (guarded)
    // Commented out because passwordInput and generateBtn are not defined in all pages
    // document.addEventListener("click", function (event) {
    //   if (typeof passwordInput !== 'undefined' && typeof generateBtn !== 'undefined') {
    //     if (!passwordInput.contains(event.target) && !generateBtn.contains(event.target)) {
    //         generateBtn.style.display = "none";
    //     }
    //   }
    // });
    // Logout Functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            alert('Logged out successfully!');
            window.location.href = 'signin.html';
        });
    }
});