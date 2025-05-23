const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const mysql = require('mysql');
const fs = require('fs');
const cors = require('cors');
router.use(cors());

// Health check route
router.get('/contact-route-test', (req, res) => {
    res.json({ success: true, message: 'contactRoutes are active and responding!' });
});

// Handle favicon requests
router.get('/favicon.ico', (req, res) => res.status(204).end());

// MySQL Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'shivam972',
    port: 3308,
    database: 'grp_career'
});

db.connect(err => {
    if (err) throw err;
    console.log('Contact routes MySQL Connected');
});

// Multer setup
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Uploads directory created');
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const userType = req.body.user_type || 'general';
        cb(null, `${userType}-${Date.now()}-${file.originalname}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowedTypes.includes(ext)
        ? cb(null, true)
        : cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 20 * 1024 * 1024 } // 5MB
});

// Allow all potential fields (no dynamic detection needed)
const uploadFile = upload.fields([
    { name: 'resume_student', maxCount: 1 },
    { name: 'resume_professional', maxCount: 1 },
    { name: 'job_doc', maxCount: 1 }
]);

// Submit contact form
router.post('/submit-contact', uploadFile, (req, res) => {
    const { user_type, name, email } = req.body;

    if (!user_type || !name || !email) {
        return res.status(400).json({ error: 'Name, email, and user type are required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    let query, values;

    switch (user_type) {
        case 'student': {
            const { student_requirements, expected_ctc, linkedin_student, phone_student } = req.body;
            const resume_student = req.files?.resume_student?.[0]?.path || null;
    
            query = `
                INSERT INTO student_contacts 
                (name, email, phone, requirements, expected_ctc, linkedin_url, resume_path)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            values = [name, email, phone_student || null, student_requirements || null, expected_ctc || null, linkedin_student || null, resume_student];
            break;
        }
    
        case 'professional': {
            const { current_salary, notice_period, professional_requirements, linkedin_professional, phone_professional } = req.body;
            const resume_professional = req.files?.resume_professional?.[0]?.path || null;
    
            query = `
                INSERT INTO professional_contacts 
                (name, email, phone, current_salary, notice_period, requirements, linkedin_url, resume_path)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            values = [
                name, email, phone_professional || null, current_salary || null, notice_period || null,
                professional_requirements || null, linkedin_professional || null, resume_professional
            ];
            break;
        }
    
        case 'company': {
            const {
                company_name, contact_person, phone, job_roles, vacancies,
                job_description, qualifications, experience, location,
                additional_notes, website
            } = req.body;
            const job_doc = req.files?.job_doc?.[0]?.path || null;
    
            query = `
                INSERT INTO company_contacts 
                (name, email, company_name, contact_person, phone, job_roles, vacancies,
                job_description, qualifications, experience, location, additional_notes, website, job_doc_path)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            values = [
                name, email, company_name || null, contact_person || null, phone || null,
                job_roles || null, vacancies || null, job_description || null, qualifications || null,
                experience || null, location || null, additional_notes || null, website || null, job_doc
            ];
            break;
        }
    
        default:
            return res.status(400).json({ error: 'Invalid user type' });
    }
    

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('❌ Database error:', err);
            return res.status(500).json({
                error: 'Error saving contact form',
                
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }

        const messages = {
            student: 'Your student profile has been submitted successfully!',
            professional: 'Your professional profile has been submitted successfully!',
            company: 'Your company request has been submitted successfully!'
        };

        res.json({ success: messages[user_type] || 'Form submitted successfully' });
    });
});

// Table creation route
router.get('/check-tables', (req, res) => {
    const tables = [
        `CREATE TABLE IF NOT EXISTS student_contacts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL,
            requirements TEXT,
            expected_ctc VARCHAR(50),
            linkedin_url VARCHAR(255),
            resume_path VARCHAR(255),
            submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS professional_contacts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL,
            current_salary VARCHAR(50),
            notice_period VARCHAR(50),
            requirements TEXT,
            linkedin_url VARCHAR(255),
            resume_path VARCHAR(255),
            submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS company_contacts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL,
            company_name VARCHAR(100),
            contact_person VARCHAR(100),
            phone VARCHAR(20),
            job_roles VARCHAR(255),
            vacancies INT,
            job_description TEXT,
            qualifications TEXT,
            experience VARCHAR(100),
            location VARCHAR(255),
            additional_notes TEXT,
            website VARCHAR(255),
            job_doc_path VARCHAR(255),
            submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    let completed = 0;
    for (const sql of tables) {
        db.query(sql, (err) => {
            if (err) return res.status(500).json({ error: 'Error creating tables', details: err.message });
            completed++;
            if (completed === tables.length) {
                res.json({ success: 'Database tables checked/created' });
            }
        });
    }
});

// Fetch all student contacts
router.get('/students', (req, res) => {
    const query = 'SELECT * FROM student_contacts ORDER BY submission_date DESC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('❌ Error fetching student contacts:', err);
            return res.status(500).json({
                error: 'Error fetching student contacts',
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
        res.json({ success: true, data: results });
    });
});

// Fetch a specific student contact by ID
router.get('/students/:id', (req, res) => {
    const { id } = req.params;
    const query = 'SELECT * FROM student_contacts WHERE id = ?';
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('❌ Error fetching student contact:', err);
            return res.status(500).json({
                error: 'Error fetching student contact',
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Student contact not found' });
        }
        res.json({ success: true, data: results[0] });
    });
});

// Fetch all professional contacts
router.get('/professionals', (req, res) => {
    const query = 'SELECT * FROM professional_contacts ORDER BY submission_date DESC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('❌ Error fetching professional contacts:', err);
            return res.status(500).json({
                error: 'Error fetching professional contacts',
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
        res.json({ success: true, data: results });
    });
});

// Fetch a specific professional contact by ID
router.get('/professionals/:id', (req, res) => {
    const { id } = req.params;
    const query = 'SELECT * FROM professional_contacts WHERE id = ?';
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('❌ Error fetching professional contact:', err);
            return res.status(500).json({
                error: 'Error fetching professional contact',
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Professional contact not found' });
        }
        res.json({ success: true, data: results[0] });
    });
});

// Fetch all company contacts
router.get('/companies', (req, res) => {
    const query = 'SELECT * FROM company_contacts ORDER BY submission_date DESC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('❌ Error fetching company contacts:', err);
            return res.status(500).json({
                error: 'Error fetching company contacts',
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
        res.json({ success: true, data: results });
    });
});

// Fetch a specific company contact by ID
router.get('/companies/:id', (req, res) => {
    const { id } = req.params;
    const query = 'SELECT * FROM company_contacts WHERE id = ?';
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('❌ Error fetching company contact:', err);
            return res.status(500).json({
                error: 'Error fetching company contact',
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Company contact not found' });
        }
        res.json({ success: true, data: results[0] });
    });
});

module.exports = router;
