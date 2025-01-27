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
document.getElementById('signup-form').addEventListener('submit', function (e) {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('password_confirm').value;

    if (password !== confirmPassword) {
        e.preventDefault();
        alert('Passwords do not match!');
    }
});


document.getElementById('signup-form').addEventListener('submit', function (e) {
    e.preventDefault();  // Prevent the form from actually submitting

    // Simulate successful sign-up (you could add more validation here if needed)
    document.getElementById('success-message').style.display = 'block';  // Show the success message

    // Optionally, delay redirection to allow users to see the success message for a moment
    setTimeout(function () {
        window.location.href = 'signin.html';  // Redirect to the sign-in page after 2 seconds
    }, 2000);
});

// Sign In Form Submission (Simulating Success)
document.getElementById('signin-form').addEventListener('submit', function (e) {
    e.preventDefault();  // Prevent default form submission

    // Simulate successful sign-in (in a real scenario, verify credentials here)
    alert('Sign-in successful!');
    
    // Redirect to the dashboard
    window.location.href = 'dashboard.html';
});

const credentials = JSON.parse(localStorage.getItem('credentials')) || [];

credentials.forEach(({ email }) => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${email}</td><td>Password stored securely</td>`;
    document.querySelector('tbody').appendChild(row);
});

// // Theme Switcher (Light/Dark Mode)
// const themeSwitch = document.createElement('button');
// themeSwitch.innerText = 'Switch Theme';
// themeSwitch.classList.add('theme-switcher');
// document.body.appendChild(themeSwitch);

// Load theme from localStorage if set
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-theme');
} else {
    document.body.classList.remove('dark-theme');
}

// Toggle theme on button click
themeSwitch.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');

    // Save theme preference to localStorage
    if (document.body.classList.contains('dark-theme')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.removeItem('theme');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const modal = document.getElementById('forgot-password-modal');
    const closeBtn = document.querySelector('.close-btn');
    const resetButton = document.getElementById('reset-password-btn');
    const resetEmail = document.getElementById('reset-email');
    const resetMessage = document.getElementById('reset-message');

    // Show Modal
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Forgot Password link clicked');
            if (modal) {
                modal.style.display = 'block';
            }
        });
    }

    // Close Modal
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            console.log('Close button clicked');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Simulate Sending Email
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            const email = resetEmail ? resetEmail.value : '';
            console.log('Reset button clicked, Email:', email);

            if (email) {
                // Simulating email sent process
                setTimeout(() => {
                    console.log('Email sent simulation complete');
                    if (resetMessage) {
                        resetMessage.style.display = 'block';
                    }
                    if (resetEmail) {
                        resetEmail.value = ''; // Clear email field after sending
                    }
                }, 1000);
            } else {
                console.log('Email input is empty');
            }
        });
    }

    // Close Modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            console.log('Clicked outside modal');
            if (modal) {
                modal.style.display = 'none';
            }
        }
    });
});

document.getElementById('signin-form').addEventListener('submit', function (e) {
    e.preventDefault();  // Prevent default form submission

    // Get user input values
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Send POST request to the server
    fetch('/signin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
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


// Logout Functionality (Simulating logout by redirecting to the login page)
document.getElementById('logout-btn').addEventListener('click', function() {
    alert('Logged out successfully!');
    window.location.href = 'sign.html'; // Redirect to sign-in page
});
