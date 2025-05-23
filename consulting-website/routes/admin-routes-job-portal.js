const express = require('express');
const mysql = require('mysql2');
const router = express.Router();

// MySQL Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'shivam972',
    database: 'grp_career',
    port: 3308
});

db.connect(err => {
    if (err) console.error('MySQL connection error:', err);
    else console.log('Connected to MySQL database');
});

// Middleware for admin authentication
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader === 'admin123') { // Replace with secure auth in production
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// Get department counts
router.get('/dept-counts', (req, res) => {
    db.query(
        'SELECT department, COUNT(*) as count FROM jobs WHERE DATE_ADD(posted, INTERVAL active_duration DAY) > NOW() GROUP BY department',
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            const counts = {};
            results.forEach(row => { counts[row.department] = row.count; });
            res.json(counts);
        }
    );
});

// Get all jobs (public)
router.get('/jobs', (req, res) => {
    db.query('SELECT * FROM jobs', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        const jobs = results.map(job => ({
            id: job.id,
            title: job.title,
            department: job.department,
            location: job.location,
            type: job.type,
            salary: job.salary,
            posted: job.posted,
            description: job.description,
            tags: JSON.parse(job.tags),
            requirements: job.requirements,
            active_duration: job.active_duration
        }));
        res.json(jobs);
    });
});

// Create a job (admin)
router.post('/jobs', authenticateAdmin, (req, res) => {
    const { title, department, location, type, salary, posted, description, tags, requirements, active_duration } = req.body;
    if (!title || !department || !location || !type || !salary || !posted || !description || !tags || !requirements || !active_duration) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    db.query(
        `INSERT INTO jobs (title, department, location, type, salary, posted, description, tags, requirements, active_duration) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, department, location, type, salary, posted, description, JSON.stringify(tags), requirements, active_duration],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: result.insertId });
        }
    );
});

// Update a job (admin)
router.put('/jobs/:id', authenticateAdmin, (req, res) => {
    const { title, department, location, type, salary, posted, description, tags, requirements, active_duration } = req.body;
    if (!title || !department || !location || !type || !salary || !posted || !description || !tags || !requirements || !active_duration) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    db.query(
        `UPDATE jobs SET title = ?, department = ?, location = ?, type = ?, salary = ?, posted = ?, description = ?, tags = ?, requirements = ?, active_duration = ? WHERE id = ?`,
        [title, department, location, type, salary, posted, description, JSON.stringify(tags), requirements, active_duration, req.params.id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ error: 'Job not found' });
            res.json({ message: 'Job updated' });
        }
    );
});

// Delete a job (admin)
router.delete('/jobs/:id', authenticateAdmin, (req, res) => {
    db.query(`DELETE FROM jobs WHERE id = ?`, [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Job not found' });
        res.json({ message: 'Job deleted' });
    });
});

// Get all applications (admin)
router.get('/applications', authenticateAdmin, (req, res) => {
    db.query('SELECT * FROM applications', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Delete an application (admin)
router.delete('/applications/:id', authenticateAdmin, (req, res) => {
    db.query(`DELETE FROM applications WHERE id = ?`, [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Application not found' });
        res.json({ message: 'Application deleted' });
    });
});

// Store partial submission (public)
router.post('/partial-submissions', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    db.query(
        `INSERT INTO partial_submissions (email, submitted_at) VALUES (?, NOW())`,
        [email],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Partial submission stored' });
        }
    );
});

// Get partial submissions (admin)
router.get('/partial-submissions', authenticateAdmin, (req, res) => {
    db.query('SELECT * FROM partial_submissions', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Delete partial submission (admin)
router.delete('/partial-submissions/:id', authenticateAdmin, (req, res) => {
    db.query(`DELETE FROM partial_submissions WHERE id = ?`, [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Partial submission not found' });
        res.json({ message: 'Partial submission deleted' });
    });
});

// Get admins (admin)
router.get('/admins', authenticateAdmin, (req, res) => {
    db.query('SELECT * FROM admins', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Create or update admin (admin)
router.post('/admins', authenticateAdmin, (req, res) => {
    const { id, name, title, email } = req.body;
    if (!name || !title || !email) return res.status(400).json({ error: 'All fields are required' });
    if (id) {
        db.query(
            `UPDATE admins SET name = ?, title = ?, email = ? WHERE id = ?`,
            [name, title, email, id],
            (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                if (result.affectedRows === 0) return res.status(404).json({ error: 'Admin not found' });
                res.json({ message: 'Admin updated' });
            }
        );
    } else {
        db.query(
            `INSERT INTO admins (name, title, email) VALUES (?, ?, ?)`,
            [name, title, email],
            (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ id: result.insertId });
            }
        );
    }
});

// Delete admin (admin)
router.delete('/admins/:id', authenticateAdmin, (req, res) => {
    db.query(`DELETE FROM admins WHERE id = ?`, [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Admin not found' });
        res.json({ message: 'Admin deleted' });
    });
});

module.exports = router;