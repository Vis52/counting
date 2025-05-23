const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
router.use(cors());

// MySQL Connection (same as contactRoutes)
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'shivam972',
    port: 3308,
    database: 'grp_career'
});

db.connect(err => {
    if (err) throw err;
    console.log('Snehil routes MySQL Connected');
});
// Add this to hr_dashboard.js to verify the routes are being hit
router.use((req, res, next) => {
    console.log(`HR Dashboard route accessed: ${req.method} ${req.path}`);
    next();
  });

// Health check route
router.get('/hr-route-test', (req, res) => {
    res.json({ success: true, message: 'HR routes are active and responding!' });
});

// Get all students
router.get('/students', (req, res) => {
    const query = 'SELECT * FROM student_contacts ORDER BY submission_date DESC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching students:', err.message, err.stack); // Enhanced logging
            return res.status(500).json({ error: 'Error fetching students' });
        }
        res.json({ data: results });
    });
});

// Get all professionals
router.get('/professionals', (req, res) => {
    const query = 'SELECT * FROM professional_contacts ORDER BY submission_date DESC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching professionals:', err.message, err.stack); // Enhanced logging
            return res.status(500).json({ error: 'Error fetching professionals' });
        }
        res.json({ data: results });
    });
});

// Get all companies
router.get('/companies', (req, res) => {
    const query = 'SELECT * FROM company_contacts ORDER BY submission_date DESC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching companies:', err.message, err.stack); // Enhanced logging
            return res.status(500).json({ error: 'Error fetching companies' });
        }
        res.json({ data: results });
    });
});

// Get single student by ID
router.get('/students/:id', (req, res) => {
    const query = 'SELECT * FROM student_contacts WHERE id = ?';
    db.query(query, [req.params.id], (err, results) => {
        if (err) {
            console.error('Error fetching student:', err);
            return res.status(500).json({ error: 'Error fetching student' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        res.json({ data: results[0] });
    });
});

// Get single professional by ID
router.get('/professionals/:id', (req, res) => {
    const query = 'SELECT * FROM professional_contacts WHERE id = ?';
    db.query(query, [req.params.id], (err, results) => {
        if (err) {
            console.error('Error fetching professional:', err);
            return res.status(500).json({ error: 'Error fetching professional' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Professional not found' });
        }
        res.json({ data: results[0] });
    });
});

// Get single company by ID
router.get('/companies/:id', (req, res) => {
    const query = 'SELECT * FROM company_contacts WHERE id = ?';
    db.query(query, [req.params.id], (err, results) => {
        if (err) {
            console.error('Error fetching company:', err);
            return res.status(500).json({ error: 'Error fetching company' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }
        res.json({ data: results[0] });
    });
});

// File download endpoint
router.get('/uploads/:filename', (req, res) => {
    const { type, filename } = req.params;
    const uploadDir = './uploads';
    const filePath = path.join(filename);

    // Validate filename to prevent directory traversal
    if (!filename.match(/^[a-zA-Z0-9_\-.]+$/)) {
        return res.status(400).json({ error: 'Invalid filename' });
    }

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath, (err) => {
        if (err) {
            console.error('Error downloading file:', err);
            res.status(500).json({ error: 'Error downloading file' });
        }
    });
});
// Add to hr_dashboard.js
router.get('/debug-ids', (req, res) => {
    const queries = {
      students: 'SELECT id FROM student_contacts',
      professionals: 'SELECT id FROM professional_contacts',
      companies: 'SELECT id FROM company_contacts'
    };
    
    db.query(queries.students, (err, students) => {
      if (err) return res.status(500).json({error: err.message});
      
      db.query(queries.professionals, (err, professionals) => {
        if (err) return res.status(500).json({error: err.message});
        
        db.query(queries.companies, (err, companies) => {
          if (err) return res.status(500).json({error: err.message});
          
          res.json({
            available_student_ids: students.map(r => r.id),
            available_professional_ids: professionals.map(r => r.id),
            available_company_ids: companies.map(r => r.id)
          });
        });
      });
    });
  });
module.exports = router;