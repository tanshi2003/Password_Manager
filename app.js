require("dotenv").config();
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const path = require('path');
const os = require('os');
const session = require('express-session');
const nodemailer = require('nodemailer');

const app = express();

// Middleware to parse incoming request bodies
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Use sessions for tracking logins
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// MySQL connection configuration
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});


// Connect to MySQL
db.connect((err) => {
    if (err) throw err;
    console.log('Connected to the database');
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

// Nodemailer transporter configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'tanshikhandelwal03@gmail.com', // Replace with your email
        pass: 'zdkf iggg feci imkt'   // Replace with your app password
    }
});

// Serve Update Password Page
app.get('/reset-password', (req, res) => {
    const { token } = req.query;
    // Render a simple HTML form to update the password
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Update Password</title>
        </head>
        <body>
            <h2>Update Password</h2>
            <form action="/reset-password" method="POST">
                <input type="hidden" name="token" value="${token}" required>
                <div>
                    <label for="new-password">New Password:</label>
                    <input type="password" id="new-password" name="new-password" required>
                </div>
                <div>
                    <label for="confirm-password">Confirm Password:</label>
                    <input type="password" id="confirm-password" name="confirm-password" required>
                </div>
                <button type="submit">Update Password</button>
            </form>
        </body>
        </html>
    `);
});

// Handle Update Password Request
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

            // Log hashed password
            console.log('Hashed Password:', hash);

            // Update the user's password and clear the reset token
            const updateSql = 'UPDATE users SET password = ?, plain_password = ?, reset_token = NULL WHERE id = ?';
            db.query(updateSql, [hash, newPassword, user.id], (updateErr, result) => {
                if (updateErr) throw updateErr;

                // Log the result of the update query
                console.log('Updated password in DB for user:', user.id, 'Result:', result);
                
                // Verify if the password update was successful
                if (result.changedRows === 1) {
                    console.log('Password has been successfully updated for user ID:', user.id);

                    // Update the session with the new password after reset
                    req.session.user = req.session.user || {};
                    req.session.user.password = hash;
                    req.session.user.plain_password = newPassword;

                    res.send('Password has been successfully updated.');
                } else {
                    console.error('Failed to update the password for user ID:', user.id);
                    res.status(500).send('Failed to update the password.');
                }
            });
        });
    });
});

// Forget Password Route
app.post('/forgot-password', (req, res) => {
    const { email } = req.body;

    // Check if the email exists in the database
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], (err, results) => {
        if (err) throw err;
        if (results.length === 0) {
            return res.status(400).json({ message: 'Email not found' });
        }

        // Generate a reset token
        const resetToken = Math.random().toString(36).substr(2);
        console.log('Generated reset token:', resetToken); // Log the generated reset token
        const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

        // Save the reset token in the database
        const updateSql = 'UPDATE users SET reset_token = ? WHERE email = ?';
        db.query(updateSql, [resetToken, email], (updateErr, result) => {
            if (updateErr) throw updateErr;
            console.log('Updated reset token in DB for email:', email, 'Result:', result); // Log the DB update result

            // Send the reset link via email, only if the token is successfully updated in DB
            if (result.affectedRows === 1) {
                const mailOptions = {
                    from: 'tanshikhandelwal03@gmail.com', // Replace with your email
                    to: email,
                    subject: 'Password Reset',
                    text: `Please use the following link to update your password: ${resetLink}`
                };

                transporter.sendMail(mailOptions, (mailErr, info) => {
                    if (mailErr) {
                        console.error('Error sending email:', mailErr);
                        return res.status(500).json({ message: 'Failed to send email' });
                    }
                    res.json({ message: 'Password update link sent to email' });
                });
            } else {
                console.error('Failed to update the reset token in DB for email:', email);
                res.status(500).json({ message: 'Failed to generate reset link. Try again later.' });
            }
        });
    });
});

// Serve Home Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Sign Up Route
app.post('/signup', (req, res) => {
    const { first_name, last_name, email, mobile, password } = req.body;

    // Hash the password
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) throw err;

        // Insert the user into the database with both plain and hashed passwords
        const sql = 'INSERT INTO users (first_name, last_name, email, mobile, password, plain_password) VALUES (?, ?, ?, ?, ?, ?)';
        db.query(sql, [first_name, last_name, email, mobile, hash, password], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Email already exists' });
                } else {
                    throw err;
                }
            }
            res.json({ message: 'Registration successful' });
        });
    });
});

// Sign In Route
app.post('/signin', (req, res) => {
    const { email, password } = req.body;

    // Find the user in the database
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], (err, results) => {
        if (err) throw err;
        if (results.length === 0) {
            return res.status(400).json({ message: 'User not found' });
        }

        // Compare the passwords
        const user = results[0];
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) throw err;
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid password' });
            }

            // Store user details in session
            req.session.user = { id: user.id, email: user.email, password: user.password }; // Include other fields as needed
            res.json({ message: 'User authenticated successfully', user });
        });
    });
});

// Dashboard Data Route
app.get('/dashboard-data', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // Assuming req.session.user has the user ID stored
    const userId = req.session.user.id;
    const sql = 'SELECT first_name, last_name, email, mobile, plain_password FROM users WHERE id = ?';
    db.query(sql, [userId], (err, results) => {
        if (err) throw err;
        if (results.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = results[0];
        res.json(user);
    });
});
// Get IP address
const getIpAddress = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if ('IPv4' === iface.family && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '0.0.0.0';
};
// Get hostname
const getHostName = (req) => {
    return req.protocol + '://' + req.get('host');
};

// Route to get URL and IP address
app.get('/server-info', (req, res) => {
    res.json({
        url: getHostName(req),
        ip: getIpAddress()
    });
});
