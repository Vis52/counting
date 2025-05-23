const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// MySQL Connection Pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'shivam972', // Replace with your MySQL password
    port: 3308,
    database: 'grp_career',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Ensure blogs table exists
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        await connection.query(`
            CREATE DATABASE IF NOT EXISTS grp_career
        `);
        await connection.query(`
            USE grp_career
        `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS blogs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                date DATE NOT NULL,
                description TEXT NOT NULL,
                image VARCHAR(255),
                imageDescription TEXT,
                imageCaption TEXT,
                imageCaptionLink VARCHAR(255),
                youtubeLink VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        connection.release();
        console.log('Blogs table initialized');
    } catch (err) {
        console.error('Error initializing blogs table:', err);
        throw err;
    }
}

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'uploads'); // Move up one directory to project root
        try {
            await fs.mkdir(uploadPath, { recursive: true });
            cb(null, uploadPath);
        } catch (err) {
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (!file || !file.originalname) {
            return cb(new Error('No file uploaded or file is malformed'));
        }
    
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only images (jpeg, jpg, png, gif) are allowed'));
        }
    }
    ,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// POST /api/blogs - Create a new vlog
router.post('/blogs', upload.single('image'), async (req, res) => {
    try {
        const {
            title,
            category,
            date,
            description,
            imageDescription,
            imageCaption,
            imageCaptionLink,
            youtubeLink
        } = req.body;

        // Validation
        if (!title || !category || !date || !description) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ error: 'Invalid date format (YYYY-MM-DD)' });
        }

        // Validate YouTube URL (if provided)
        if (youtubeLink && !youtubeLink.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/)) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        // Validate imageCaptionLink (requires imageCaption)
        if (imageCaptionLink && !imageCaption) {
            return res.status(400).json({ error: 'Image caption is required for caption link' });
        }

        // Image URL (if uploaded)
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        // Insert into database
        const [result] = await pool.query(
            `INSERT INTO blogs (title, category, date, description, image, imageDescription, imageCaption, imageCaptionLink, youtubeLink)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title,
                category,
                date,
                description,
                imageUrl,
                imageDescription || null,
                imageCaption || null,
                imageCaptionLink || null,
                youtubeLink || null
            ]
        );

        res.status(201).json({
            message: 'Vlog created successfully',
            blogId: result.insertId
        });
    } catch (err) {
        console.error('Error creating vlog:', err);
        if (err.message.includes('Only images')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Failed to create vlog' });
    }
});

// GET /api/blogs - Fetch blogs with pagination
router.get('/blogs', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4; // Matches vlogs.html (4 blogs per page)
        const offset = (page - 1) * limit;

        // Fetch blogs
        const [blogs] = await pool.query(
            `SELECT id, title, category, date, description, image, imageDescription, imageCaption, imageCaptionLink, youtubeLink
             FROM blogs
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        // Get total count for pagination
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM blogs`);

        res.json({
            blogs,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (err) {
        console.error('Error fetching blogs:', err);
        res.status(500).json({ error: 'Failed to fetch blogs' });
    }
});

// GET /api/blogs/:id - Fetch a single blog
router.get('/blogs/:id', async (req, res) => {
    try {
        const blogId = parseInt(req.params.id);
        if (isNaN(blogId)) {
            return res.status(400).json({ error: 'Invalid blog ID' });
        }

        const [blogs] = await pool.query(
            `SELECT id, title, category, date, description, image, imageDescription, imageCaption, imageCaptionLink, youtubeLink
             FROM blogs
             WHERE id = ?`,
            [blogId]
        );

        if (blogs.length === 0) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        res.json(blogs[0]);
    } catch (err) {
        console.error('Error fetching blog:', err);
        res.status(500).json({ error: 'Failed to fetch blog' });
    }
});

// GET /api/blogs/suggestions/:id - Fetch suggested blogs
router.get('/blogs/suggestions/:id', async (req, res) => {
    try {
        const blogId = parseInt(req.params.id);
        if (isNaN(blogId)) {
            return res.status(400).json({ error: 'Invalid blog ID' });
        }

        const [suggestions] = await pool.query(
            `SELECT id, title, image, imageDescription
             FROM blogs
             WHERE id != ?
             ORDER BY RAND()
             LIMIT 3`,
            [blogId]
        );

        res.json(suggestions);
    } catch (err) {
        console.error('Error fetching suggestions:', err);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
});

// Initialize database on module load
initializeDatabase().catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
router.delete('/blogs/:id', async (req, res) => {
    try {
        const blogId = parseInt(req.params.id);
        if (isNaN(blogId)) {
            return res.status(400).json({ error: 'Invalid blog ID' });
        }

        const [blogs] = await pool.query(
            `SELECT image FROM blogs WHERE id = ?`,
            [blogId]
        );

        if (blogs.length === 0) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        if (blogs[0].image) {
            const imagePath = path.join(__dirname, '..', blogs[0].image);
            try {
                await fs.unlink(imagePath);
            } catch (err) {
                if (err.code !== 'ENOENT') {
                    console.error('Error deleting image:', err);
                }
            }
        }

        const [result] = await pool.query(
            `DELETE FROM blogs WHERE id = ?`,
            [blogId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        res.json({ message: 'Blog deleted successfully' });
    } catch (err) {
        console.error('Error deleting blog:', err);
        res.status(500).json({ error: 'Failed to delete blog' });
    }
});

module.exports = router;