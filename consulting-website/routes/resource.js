const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const slugify = require('slugify');

const router = express.Router();

// MySQL Connection Pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'shivam972',
    port: 3308,
    database: 'grp_career',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Initialize Database
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        await connection.query(`CREATE DATABASE IF NOT EXISTS grp_career`);
        await connection.query(`USE grp_career`);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS resources (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                slug VARCHAR(255) NOT NULL UNIQUE,
                category VARCHAR(100) NOT NULL,
                subcategory VARCHAR(100),
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
        console.log('Resources table initialized');
    } catch (err) {
        console.error('Error initializing resources table:', err);
        throw err;
    }
}

// Multer Setup
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'Uploads');
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
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

// POST /api/resources - Create a new resource
router.post('/resources', upload.single('image'), async (req, res) => {
    try {
        const {
            title,
            category,
            subcategory,
            date,
            description,
            imageDescription,
            imageCaption,
            imageCaptionLink,
            youtubeLink
        } = req.body;

        if (!title || !category || !date || !description) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ error: 'Invalid date format (YYYY-MM-DD)' });
        }

        if (youtubeLink && !youtubeLink.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/)) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        if (imageCaptionLink && !imageCaption) {
            return res.status(400).json({ error: 'Image caption is required for caption link' });
        }

        const slug = slugify(title, { lower: true, strict: true });
        const imageUrl = req.file ? `/Uploads/${req.file.filename}` : null;

        const [result] = await pool.query(
            `INSERT INTO resources (title, slug, category, subcategory, date, description, image, imageDescription, imageCaption, imageCaptionLink, youtubeLink)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title,
                slug,
                category,
                subcategory || null,
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
            message: 'Resource created successfully',
            resourceId: result.insertId,
            slug
        });
    } catch (err) {
        console.error('Error creating resource:', err);
        if (err.message.includes('Only images')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Failed to create resource' });
    }
});

// GET /api/resources - Fetch resources with pagination, search, and sort
router.get('/resources', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const category = req.query.category || '';
        const subcategory = req.query.subcategory || '';
        const sort = req.query.sort || 'created_at DESC';

        let query = `
            SELECT id, title, slug, category, subcategory, date, description, image, imageDescription, imageCaption, imageCaptionLink, youtubeLink
            FROM resources
            WHERE 1=1
        `;
        const queryParams = [];

        if (search) {
            query += ` AND (title LIKE ? OR description LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`);
        }
        if (category) {
            query += ` AND category = ?`;
            queryParams.push(category);
        }
        if (subcategory) {
            query += ` AND subcategory = ?`;
            queryParams.push(subcategory);
        }

        query += ` ORDER BY ${sort} LIMIT ? OFFSET ?`;
        queryParams.push(limit, offset);

        const [resources] = await pool.query(query, queryParams);
        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) as total FROM resources WHERE 1=1` +
            (search ? ` AND (title LIKE ? OR description LIKE ?)` : '') +
            (category ? ` AND category = ?` : '') +
            (subcategory ? ` AND subcategory = ?` : ''),
            search ? [...[`%${search}%`, `%${search}%`], ...(category ? [category] : []), ...(subcategory ? [subcategory] : [])] :
            [...(category ? [category] : []), ...(subcategory ? [subcategory] : [])]
        );

        res.json({
            resources,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (err) {
        console.error('Error fetching resources:', err);
        res.status(500).json({ error: 'Failed to fetch resources' });
    }
});

// GET /api/resources/:slug - Fetch a single resource by slug
router.get('/resources/:slug', async (req, res) => {
    try {
        const slug = req.params.slug;
        const [resources] = await pool.query(
            `SELECT id, title, slug, category, subcategory, date, description, image, imageDescription, imageCaption, imageCaptionLink, youtubeLink
             FROM resources
             WHERE slug = ?`,
            [slug]
        );

        if (resources.length === 0) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        res.json(resources[0]);
    } catch (err) {
        console.error('Error fetching resource:', err);
        res.status(500).json({ error: 'Failed to fetch resource' });
    }
});

// GET /api/resources/suggestions/:slug - Fetch suggested resources
router.get('/resources/suggestions/:slug', async (req, res) => {
    try {
        const slug = req.params.slug;
        const [current] = await pool.query(`SELECT category, subcategory FROM resources WHERE slug = ?`, [slug]);
        if (current.length === 0) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        const [suggestions] = await pool.query(
            `SELECT id, title, slug, image, imageDescription
             FROM resources
             WHERE slug != ? AND (category = ? OR subcategory = ?)
             ORDER BY RAND()
             LIMIT 3`,
            [slug, current[0].category, current[0].subcategory || current[0].category]
        );

        res.json(suggestions);
    } catch (err) {
        console.error('Error fetching suggestions:', err);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
});

// PUT /api/resources/:id - Update a resource
router.put('/resources/:id', upload.single('image'), async (req, res) => {
    try {
        const resourceId = parseInt(req.params.id);
        if (isNaN(resourceId)) {
            return res.status(400).json({ error: 'Invalid resource ID' });
        }

        const {
            title,
            category,
            subcategory,
            date,
            description,
            imageDescription,
            imageCaption,
            imageCaptionLink,
            youtubeLink
        } = req.body;

        if (!title || !category || !date || !description) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ error: 'Invalid date format (YYYY-MM-DD)' });
        }

        if (youtubeLink && !youtubeLink.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/)) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        if (imageCaptionLink && !imageCaption) {
            return res.status(400).json({ error: 'Image caption is required for caption link' });
        }

        const slug = slugify(title, { lower: true, strict: true });
        const imageUrl = req.file ? `/Uploads/${req.file.filename}` : null;

        const [existing] = await pool.query(`SELECT image FROM resources WHERE id = ?`, [resourceId]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        if (imageUrl && existing[0].image) {
            const oldImagePath = path.join(__dirname, '..', existing[0].image);
            try {
                await fs.unlink(oldImagePath);
            } catch (err) {
                if (err.code !== 'ENOENT') {
                    console.error('Error deleting old image:', err);
                }
            }
        }

        const [result] = await pool.query(
            `UPDATE resources SET title = ?, slug = ?, category = ?, subcategory = ?, date = ?, description = ?, image = ?, imageDescription = ?, imageCaption = ?, imageCaptionLink = ?, youtubeLink = ? WHERE id = ?`,
            [
                title,
                slug,
                category,
                subcategory || null,
                date,
                description,
                imageUrl || existing[0].image,
                imageDescription || null,
                imageCaption || null,
                imageCaptionLink || null,
                youtubeLink || null,
                resourceId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        res.json({ message: 'Resource updated successfully', slug });
    } catch (err) {
        console.error('Error updating resource:', err);
        res.status(500).json({ error: 'Failed to update resource' });
    }
});

// DELETE /api/resources/:id - Delete a resource
router.delete('/resources/:id', async (req, res) => {
    try {
        const resourceId = parseInt(req.params.id);
        if (isNaN(resourceId)) {
            return res.status(400).json({ error: 'Invalid resource ID' });
        }

        const [resources] = await pool.query(`SELECT image FROM resources WHERE id = ?`, [resourceId]);
        if (resources.length === 0) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        if (resources[0].image) {
            const imagePath = path.join(__dirname, '..', resources[0].image);
            try {
                await fs.unlink(imagePath);
            } catch (err) {
                if (err.code !== 'ENOENT') {
                    console.error('Error deleting image:', err);
                }
            }
        }

        const [result] = await pool.query(`DELETE FROM resources WHERE id = ?`, [resourceId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        res.json({ message: 'Resource deleted successfully' });
    } catch (err) {
        console.error('Error deleting resource:', err);
        res.status(500).json({ error: 'Failed to delete resource' });
    }
});

// Initialize database
initializeDatabase().catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});

module.exports = router;