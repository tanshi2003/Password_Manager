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

    // Sign Up Form Submission
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', function (e) {
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('password_confirm').value;

            if (password !== confirmPassword) {
                e.preventDefault();
                alert('Passwords do not match!');
            }
        });

        signupForm.addEventListener('submit', function (e) {
            e.preventDefault();  // Prevent the form from actually submitting

            // Simulate successful sign-up (you could add more validation here if needed)
            document.getElementById('success-message').style.display = 'block';  // Show the success message

            // Optionally, delay redirection to allow users to see the success message for a moment
            setTimeout(function () {
                window.location.href = 'signin.html';  // Redirect to the sign-in page after 2 seconds
            }, 2000);
        });
    }

    // Sign In Form Submission
    const signinForm = document.getElementById('signin-form');
    if (signinForm) {
        signinForm.addEventListener('submit', function (e) {
            e.preventDefault();  // Prevent default form submission

            // Get user input values
            const first_name = document.getElementById('first_name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Send POST request to the server
            fetch('/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ first_name, email, password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    // Store user details in localStorage
                    localStorage.setItem('userFirst_name', data.user.first_name);
                    localStorage.setItem('userEmail', data.user.email);

                    // Redirect to the dashboard
                    window.location.href = 'dashboard.html';
                } else {
                    alert('Sign-in failed. Please try again.');
                }
            })
            .catch(error => console.error('Error:', error));
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
            console.log('Forgot Password link clicked');
            if (modal) {
                modal.style.display = 'block';
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            console.log('Close button clicked');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }

    if (resetButton) {
        resetButton.addEventListener('click', () => {
            const email = resetEmail ? resetEmail.value : '';
            console.log('Reset button clicked, Email:', email);

            fetch('/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.message) {
                        console.log('Reset email sent');
                        if (resetMessage) {
                            resetMessage.textContent = 'A password reset link has been sent to your email!';
                            resetMessage.style.display = 'block';
                        }
                    } else {
                        alert('Email not found. Please try again.');
                    }
                })
                .catch((error) => console.error('Error:', error));
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            console.log('Clicked outside modal');
            if (modal) {
                modal.style.display = 'none';
            }
        }
    });
    // Handle Reset Password Request
app.post('/reset-password', (req, res) => {
    const { token, 'new-password': newPassword, 'confirm-password': confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        return res.status(400).send('Passwords do not match.');
    }

    // Find the user by reset token
    const sql = 'SELECT * FROM users WHERE reset_token = ?';
    db.query(sql, [token], (err, results) => {
        if (err) throw err;
        if (results.length === 0) {
            return res.status(400).send('Invalid or expired reset token.');
        }

        const user = results[0];
        // Hash the new password
        bcrypt.hash(newPassword, 10, (hashErr, hash) => {
            if (hashErr) throw hashErr;

            // Update the user's password and clear the reset token
            const updateSql = 'UPDATE users SET password = ?, reset_token = NULL WHERE id = ?';
            db.query(updateSql, [hash, user.id], (updateErr) => {
                if (updateErr) throw updateErr;

                res.send('Password has been successfully reset.');
            });
        });
    });
});

    // // Theme Switcher (Light/Dark Mode)
    // const themeSwitch = document.createElement('button');
    // themeSwitch.innerText = 'Switch Theme';
    // themeSwitch.classList.add('theme-switcher');
    // document.body.appendChild(themeSwitch);

    // // Load theme from localStorage if set
    // if (localStorage.getItem('theme') === 'dark') {
    //     document.body.classList.add('dark-theme');
    // } else {
    //     document.body.classList.remove('dark-theme');
    // }

    // // Toggle theme on button click
    // themeSwitch.addEventListener('click', () => {
    //     document.body.classList.toggle('dark-theme');

    //     // Save theme preference to localStorage
    //     if (document.body.classList.contains('dark-theme')) {
    //         localStorage.setItem('theme', 'dark');
    //     } else {
    //         localStorage.removeItem('theme');
    //     }
    // });

    // Logout Functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            alert('Logged out successfully!');
            window.location.href = 'signin.html'; // Redirect to sign-in page
        });
    }
});
