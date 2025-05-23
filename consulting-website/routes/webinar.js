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
            CREATE TABLE IF NOT EXISTS webinars (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                slug VARCHAR(255) NOT NULL UNIQUE,
                category VARCHAR(100) NOT NULL,
                subcategory VARCHAR(100),
                date DATETIME NOT NULL,
                registration_start DATETIME NOT NULL,
                registration_end DATETIME NOT NULL,
                description TEXT NOT NULL,
                image VARCHAR(255),
                imageDescription TEXT,
                imageCaption TEXT,
                imageCaptionLink VARCHAR(255),
                youtubeLink VARCHAR(255),
                speaker VARCHAR(255),
                duration VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS webinar_participants (
                id INT AUTO_INCREMENT PRIMARY KEY,
                webinar_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (webinar_id) REFERENCES webinars(id) ON DELETE CASCADE,
                UNIQUE (webinar_id, email)
            )
        `);
        connection.release();
        console.log('Webinars and Participants tables initialized');
    } catch (err) {
        console.error('Error initializing tables:', {
            error: err.message,
            stack: err.stack
        });
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

// Serve static files
router.use(express.static(path.join(__dirname, '..', 'public')));

// Handle /webinar/:slug requests
router.get('/webinar/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'webinar-detail.html'));
});

// POST /api/webinars - Create a new webinar
router.post('/webinars', upload.single('image'), async (req, res) => {
    console.log('POST /api/webinars - Request body:', {
        ...req.body,
        image: req.file ? 'File uploaded' : 'No file'
    });
    try {
        const {
            title,
            category,
            subcategory,
            date,
            registration_start,
            registration_end,
            description,
            imageDescription,
            imageCaption,
            imageCaptionLink,
            youtubeLink,
            speaker,
            duration
        } = req.body;

        if (!title || !category || !date || !registration_start || !registration_end || !description) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(date)) {
            return res.status(400).json({ error: 'Invalid date format (YYYY-MM-DDTHH:MM)' });
        }

        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(registration_start) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(registration_end)) {
            return res.status(400).json({ error: 'Invalid registration date format (YYYY-MM-DDTHH:MM)' });
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
            `INSERT INTO webinars (title, slug, category, subcategory, date, registration_start, registration_end, description, image, imageDescription, imageCaption, imageCaptionLink, youtubeLink, speaker, duration)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title,
                slug,
                category,
                subcategory || null,
                date,
                registration_start,
                registration_end,
                description,
                imageUrl,
                imageDescription || null,
                imageCaption || null,
                imageCaptionLink || null,
                youtubeLink || null,
                speaker || null,
                duration || null
            ]
        );

        console.log('Successfully created webinar:', { webinarId: result.insertId, slug });
        res.status(201).json({
            message: 'Webinar created successfully',
            webinarId: result.insertId,
            slug
        });
    } catch (err) {
        console.error('Error creating webinar:', {
            error: err.message,
            stack: err.stack,
            body: req.body
        });
        if (err.message.includes('Only images')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Failed to create webinar' });
    }
});

// GET /api/webinars - Fetch webinars with pagination, search, and sort
router.get('/webinars', async (req, res) => {
    console.log('GET /api/webinars - Request params:', req.query);
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const category = req.query.category || '';
        const subcategory = req.query.subcategory || '';
        const sort = req.query.sort || 'date DESC';

        let query = `
            SELECT id, title, slug, category, subcategory, date, registration_start, registration_end, description, image, imageDescription, imageCaption, imageCaptionLink, youtubeLink, speaker, duration
            FROM webinars
            WHERE 1=1
        `;
        const queryParams = [];

        if (search) {
            query += ` AND (title LIKE ? OR description LIKE ? OR speaker LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
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

        const [webinars] = await pool.query(query, queryParams);
        console.log(`Successfully fetched ${webinars.length} webinars`);
        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) as total FROM webinars WHERE 1=1` +
            (search ? ` AND (title LIKE ? OR description LIKE ? OR speaker LIKE ?)` : '') +
            (category ? ` AND category = ?` : '') +
            (subcategory ? ` AND subcategory = ?` : ''),
            search ? [...[`%${search}%`, `%${search}%`, `%${search}%`], ...(category ? [category] : []), ...(subcategory ? [subcategory] : [])] :
            [...(category ? [category] : []), ...(subcategory ? [subcategory] : [])]
        );

        res.json({
            webinars,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (err) {
        console.error('Error fetching webinars:', {
            error: err.message,
            stack: err.stack,
            query: req.query
        });
        res.status(500).json({ error: 'Failed to fetch webinars' });
    }
});

// GET /api/webinars/:slug - Fetch a single webinar by slug
router.get('/webinars/:slug', async (req, res) => {
    console.log('GET /api/webinars/:slug - Request params:', { slug: req.params.slug });
    try {
        const slug = req.params.slug;
        const [webinars] = await pool.query(
            `SELECT id, title, slug, category, subcategory, date, registration_start, registration_end, description, image, imageDescription, imageCaption, imageCaptionLink, youtubeLink, speaker, duration
             FROM webinars
             WHERE slug = ?`,
            [slug]
        );

        console.log('Webinar fetch result:', webinars.length ? 'Found' : 'Not found');
        if (webinars.length === 0) {
            return res.status(404).json({ error: 'Webinar not found' });
        }

        res.json(webinars[0]);
    } catch (err) {
        console.error('Error fetching webinar by slug:', {
            error: err.message,
            stack: err.stack,
            slug: req.params.slug
        });
        res.status(500).json({ error: 'Failed to fetch webinar' });
    }
});

// GET /api/webinars/suggestions/:slug - Fetch suggested webinars
router.get('/webinars/suggestions/:slug', async (req, res) => {
    console.log('GET /api/webinars/suggestions/:slug - Request params:', {
        slug: req.params.slug,
        limit: req.query.limit
    });
    try {
        const slug = req.params.slug;
        let query = `SELECT id, title, slug, image, imageDescription FROM webinars`;
        const params = [];

        // If a specific webinar slug is provided and it's not '0'
        if (slug && slug !== '0') {
            const [current] = await pool.query(
                `SELECT category, subcategory FROM webinars WHERE slug = ?`,
                [slug]
            );
            
            if (current.length > 0) {
                query += ` WHERE slug != ? AND (category = ? OR subcategory = ?)`;
                params.push(
                    slug,
                    current[0].category,
                    current[0].subcategory || current[0].category
                );
            }
        }

        // Add limit and random order
        query += ` ORDER BY RAND() LIMIT ?`;
        params.push(parseInt(req.query.limit) || 3);

        const [suggestions] = await pool.query(query, params);
        console.log(`Successfully fetched ${suggestions.length} suggestions`);
        res.json(suggestions);
    } catch (err) {
        console.error('Error fetching suggestions:', {
            error: err.message,
            stack: err.stack,
            slug: req.params.slug
        });
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
});

// POST /api/webinars/:id/register - Register a participant for a webinar
router.post('/webinars/:id/register', async (req, res) => {
    console.log('POST /api/webinars/:id/register - Request:', {
        webinarId: req.params.id,
        body: req.body
    });
    try {
        const webinarId = parseInt(req.params.id);
        const { name, email, phone } = req.body;

        if (isNaN(webinarId)) {
            return res.status(400).json({ error: 'Invalid webinar ID' });
        }

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (phone && !/^\+?\d{10,15}$/.test(phone)) {
            return res.status(400).json({ error: 'Invalid phone number format' });
        }

        // Check if webinar exists and registration is open
        const [webinars] = await pool.query(
            `SELECT registration_start, registration_end FROM webinars WHERE id = ?`,
            [webinarId]
        );
        if (webinars.length === 0) {
            return res.status(404).json({ error: 'Webinar not found' });
        }

        const now = new Date();
        const regStart = new Date(webinars[0].registration_start);
        const regEnd = new Date(webinars[0].registration_end);

        if (now < regStart) {
            return res.status(400).json({ error: 'Registration has not yet started' });
        }
        if (now > regEnd) {
            return res.status(400).json({ error: 'Registration has closed' });
        }

        // Insert participant
        try {
            await pool.query(
                `INSERT INTO webinar_participants (webinar_id, name, email, phone)
                 VALUES (?, ?, ?, ?)`,
                [webinarId, name, email, phone || null]
            );
            console.log('Successfully registered participant:', {
                webinarId: req.params.id,
                email: req.body.email
            });
            res.status(201).json({ message: 'Registration successful' });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Email already registered for this webinar' });
            }
            throw err;
        }
    } catch (err) {
        console.error('Error registering participant:', {
            error: err.message,
            stack: err.stack,
            webinarId: req.params.id,
            body: req.body
        });
        res.status(500).json({ error: 'Failed to register participant' });
    }
});

// GET /api/webinars/:id/participants - Fetch participants for a webinar
router.get('/webinars/:id/participants', async (req, res) => {
    try {
        const webinarId = parseInt(req.params.id);
        if (isNaN(webinarId)) {
            return res.status(400).json({ error: 'Invalid webinar ID' });
        }

        // First check if webinar exists
        const [webinar] = await pool.query(
            `SELECT id FROM webinars WHERE id = ?`,
            [webinarId]
        );

        if (webinar.length === 0) {
            return res.status(404).json({ error: 'Webinar not found' });
        }

        const [participants] = await pool.query(
            `SELECT id, name, email, phone, registered_at
             FROM webinar_participants
             WHERE webinar_id = ?
             ORDER BY registered_at DESC`,
            [webinarId]
        );

        res.json(participants);
    } catch (err) {
        console.error('Error fetching participants:', err);
        res.status(500).json({ error: 'Failed to fetch participants' });
    }
});

// PUT /api/webinars/:id - Update a webinar
// Update a webinar
router.put('/api/webinars/:id', upload.single('image'), async (req, res) => {
    const webinarId = req.params.id;
    const {
      title,
      description,
      duration,
      date,
      time,
      meetingLink,
      buttonText,
      buttonColor,
      buttonTextColor,
    } = req.body;
  
    if (!title || !description || !date || !time || !meetingLink) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
  
    try {
      // Fetch existing webinar to get current image filename
      const [existingRows] = await db.promise().query('SELECT * FROM webinars WHERE id = ?', [webinarId]);
      if (existingRows.length === 0) {
        return res.status(404).json({ error: 'Webinar not found' });
      }
      const existingWebinar = existingRows[0];
  
      // If a new image is uploaded, delete the old one
      let imageName = existingWebinar.image;
      if (req.file) {
        // Delete old image
        if (imageName) {
          const oldImagePath = path.join(__dirname, '../uploads', imageName);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        imageName = req.file.filename;
      }
  
      // Generate a new slug from the title
      const slug = title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
  
      // Update database
      await db.promise().query(
        `UPDATE webinars
         SET title = ?, description = ?, duration = ?, date = ?, time = ?, image = ?, slug = ?, meetingLink = ?, buttonText = ?, buttonColor = ?, buttonTextColor = ?
         WHERE id = ?`,
        [
          title,
          description,
          duration || '',
          date,
          time,
          imageName,
          slug,
          meetingLink,
          buttonText || '',
          buttonColor || '',
          buttonTextColor || '',
          webinarId,
        ]
      );
  
      res.status(200).json({ message: 'Webinar updated successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });
  

// DELETE /api/webinars/:id - Delete a webinar
router.delete('/webinars/:id', async (req, res) => {
    console.log('DELETE /api/webinars/:id - Request params:', { id: req.params.id });
    try {
        const webinarId = parseInt(req.params.id);
        if (isNaN(webinarId)) {
            return res.status(400).json({ error: 'Invalid webinar ID' });
        }

        const [result] = await pool.query('DELETE FROM webinars WHERE id = ?', [webinarId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Webinar not found' });
        }

        res.json({ message: 'Webinar deleted successfully' });
    } catch (err) {
        console.error('Error deleting webinar:', err);
        res.status(500).json({ error: 'Failed to delete webinar' });
    }
});

// Initialize database
initializeDatabase().catch(err => {
    console.error('Failed to initialize database:', {
        error: err.message,
        stack: err.stack
    });
    process.exit(1);
});

module.exports = router;