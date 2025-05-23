require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const rateLimit = require('express-rate-limit');
const validator = require('validator');

const router = express.Router();

// Create MySQL connection pool
const pool = mysql.createPool({
    host: 'localhost',
    port: 3308, // Changed from 3306 to 3308 to match your MySQL server
    user: 'root',
    password: 'shivam972',
    database:  'secure_admin_panel',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
});

// Rate limiting for auth routes
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Too many login attempts, please try again later'
});

// Admin login route
router.post('/login', limiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        // Input validation
        if (!username || !password) {
            return res.status(400).json({ 
                status: 'error',
                message: 'Username and password are required' 
            });
        }

        if (!validator.isAlphanumeric(username) || username.length > 50) {
            return res.status(400).json({ 
                status: 'error',
                message: 'Username must be alphanumeric and less than 50 characters' 
            });
        }

        // Get connection from pool
        const connection = await pool.getConnection();

        try {
            // Query to find user
            const [rows] = await connection.execute(
                'SELECT * FROM users WHERE username = ? AND role = "admin"',
                [username]
            );

            if (rows.length === 0) {
                return res.status(401).json({ 
                    status: 'error',
                    message: 'Invalid credentials' 
                });
            }

            const user = rows[0];

            // Check password
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ 
                    status: 'error',
                    message: 'Invalid credentials' 
                });
            }

            // Update last login
            await connection.execute(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [user.id]
            );

            // Generate JWT
            const token = jwt.sign(
                { 
                    id: user.id, 
                    username: user.username, 
                    role: user.role 
                },
                process.env.JWT_SECRET || 'your-secure-jwt-secret-here',
                { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
            );

            // Set cookie
            res.cookie('token', token, {
                expires: new Date(Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRES) || 3600) * 1000),
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            });

            res.status(200).json({
                status: 'success',
                data: {
                    id: user.id,
                    username: user.username,
                    role: user.role
                }
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Internal server error' 
        });
    }
});

bcrypt.hash('newsecurepassword123', 12).then(console.log);

module.exports = router;