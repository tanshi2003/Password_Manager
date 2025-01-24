const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const path = require('path');
const os = require('os');
const session = require('express-session');

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
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'password_manager'
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
            req.session.user = user;
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
