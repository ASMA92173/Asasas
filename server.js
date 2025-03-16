require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const db = require('./database');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.get('/', (req, res) => {
    if (req.session.loggedin) {
        res.send('Welcome back, ' + req.session.username + '!');
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.post('/register', async (req, res, next) => {
    try {
        const { username, password, email } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const sql = "INSERT INTO users (username, password, email) VALUES (?, ?, ?)";
        await db.execute(sql, [username, hashedPassword, email]);
        res.send('Registration successful! Please <a href="/">login</a>');
    } catch (error) {
        next(error);
    }
});

app.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const sql = "SELECT * FROM users WHERE username = ?";
        const [rows] = await db.execute(sql, [username]);
        
        if (rows.length > 0) {
            const comparison = await bcrypt.compare(password, rows[0].password);
            if (comparison) {
                req.session.loggedin = true;
                req.session.username = username;
                res.send('Welcome back, ' + username + '!');
            } else {
                res.status(401).send('Incorrect Username and/or Password!');
            }
        } else {
            res.status(401).send('Incorrect Username and/or Password!');
        }
    } catch (error) {
        next(error);
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        res.redirect('/');
    });
});

// Add error handling middleware after all other middleware and routes
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke! Please try again later.');
});

// Improve database connection error handling
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
