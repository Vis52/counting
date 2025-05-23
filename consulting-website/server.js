const express = require('express');
const path = require('path');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
 
const blogRouter = require('./routes/blog.js');
const contactRoutes = require('./routes/contactRoutes');
const hr_dashboard = require('./routes/hr_dashboard');
const adminRoutes = require('./routes/admin-access');
const resourceRouter = require('./routes/resource');
const adminRoutes1 = require('./routes/admin-routes-job-portal');
const webinarRouter = require('./routes/webinar'); 


 
const fs = require('fs');
const useragent = require('useragent'); // For parsing user agent
const geoip = require('geoip-lite'); // For IP geolocation
const { v4: uuidv4 } = require('uuid'); // For generating session IDs
const cookieParser = require('cookie-parser'); // For parsing cookies

// Initialize Express app
const app = express();
const port = 3000;

// Middleware - ORDER IS IMPORTANT
app.use(cors()); // Enable CORS
app.use(cookieParser()); // Parse cookies first
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(bodyParser.json({ limit: '20mb' })); // Increase payload limit for chat data
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// Serve resource detail page for /resource/:slug
app.get('/resource/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'resource-detail.html'));
});

// Serve webinar detail page
app.get('/webinar/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'webinar-detail.html'));
});

// Catch all route for serving .html files without the .html extension
app.get('/:page', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', `${req.params.page}.html`));
});

// Default route to serve index.html when accessing the root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/webinar-detail.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'webinar-detail.html'));
});

// Special handler for beacon data on /track-exit
app.use('/track-exit', (req, res, next) => {
  if (req.method === 'POST' && 
      (req.headers['content-type'] === 'application/json' || 
       req.headers['content-type'] === 'text/plain')) {
    let data = '';
    req.on('data', chunk => {
      data += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        req.body = JSON.parse(data);
        next();
      } catch (e) {
        console.error('Error parsing beacon data:', e);
        console.error('Raw data received:', data);
        res.status(400).json({ error: 'Invalid JSON data' });
      }
    });
  } else {
    next();
  }
});

// Connect HR Dashboard routes to a unique path
app.use('/hr-dashboard', hr_dashboard);
console.log('✅ HR Dashboard routes connected');

// Create uploads directory if it doesn't exist
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Uploads directory created');
}
// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MySQL Database Connection
let db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'shivam972',
    port: 3308,
    database: 'contact_db',
    charset: 'utf8mb4' 
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error('MySQL connection error:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL database');
});

// HTML Page Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/webinar-detail.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'webinar-detail.html'));
});

// Create visitor_sessions table if it doesn't exist
db.query(`
  CREATE TABLE IF NOT EXISTS visitor_sessions (
    session_id VARCHAR(36) PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    country VARCHAR(100),
    city VARCHAR(100),
    referrer VARCHAR(255),
    landing_page VARCHAR(255) NOT NULL,
    entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    exit_time TIMESTAMP NULL,
    time_spent INT DEFAULT 0,
    page_views INT DEFAULT 1
  )
`, (err) => {
  if (err) {
      console.error('Error creating visitor_sessions table:', err);
  } else {
      console.log('visitor_sessions table ready');
  }
});

// Create page_views table if it doesn't exist
db.query(`
  CREATE TABLE IF NOT EXISTS page_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    page_url VARCHAR(255) NOT NULL,
    view_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    time_spent INT DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES visitor_sessions(session_id)
  )
`, (err) => {
  if (err) {
      console.error('Error creating page_views table:', err);
  } else {
      console.log('page_views table ready');
  }
});

// Create newsletter_subscribers table if it doesn't exist
db.query(`
  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    subscription_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) {
    console.error('Error creating newsletter_subscribers table:', err);
  } else {
    console.log('newsletter_subscribers table ready');
  }
});

// Create chat_messages table if it doesn't exist
db.query(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    interests VARCHAR(500),
    conversation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) {
    console.error('Error creating chat_messages table:', err);
  } else {
    console.log('chat_messages table ready');
  }
});

// Visitor tracking middleware
app.use((req, res, next) => {
  // Skip tracking for static files
  if (req.path.match(/\.(js|css|jpg|png|gif|ico|svg)$/)) {
      return next();
  }

  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || '';
  const agent = useragent.parse(userAgent);
  const geo = geoip.lookup(ip.split(',')[0].trim()); // Handle potential proxy IP lists
  
  // Generate or get session ID from cookie
  let sessionId = req.cookies?.session_id;
  const isNewSession = !sessionId;
  
  if (isNewSession) {
      sessionId = uuidv4();
      // Set cookie with session ID that expires in 30 days
      res.cookie('session_id', sessionId, { 
          maxAge: 30 * 24 * 60 * 60 * 1000,
          httpOnly: true 
      });
  }

  // Track the session
  if (isNewSession) {
      const landingPage = req.originalUrl;
      const referrer = req.headers.referer || 'direct';
      
      db.query(`
          INSERT INTO visitor_sessions 
          (session_id, ip_address, user_agent, device_type, browser, os, country, city, referrer, landing_page)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
          sessionId,
          ip,
          userAgent,
          agent.device.toString() || 'desktop',
          agent.toAgent(),
          agent.os.toString(),
          geo?.country || 'Unknown',
          geo?.city || 'Unknown',
          referrer.substring(0, 255),
          landingPage.substring(0, 255)
      ], (err) => {
          if (err) console.error('Error tracking new session:', err);
      });
  } else {
      // Update page views count for existing session
      db.query(`
          UPDATE visitor_sessions 
          SET page_views = page_views + 1 
          WHERE session_id = ?
      `, [sessionId], (err) => {
          if (err) console.error('Error updating page views:', err);
      });
  }

  // Track the page view
  db.query(`
      INSERT INTO page_views 
      (session_id, page_url)
      VALUES (?, ?)
  `, [
      sessionId,
      req.originalUrl.substring(0, 255)
  ], (err) => {
      if (err) console.error('Error tracking page view:', err);
  });

  // Store session ID in request for later use
  req.sessionId = sessionId;
  next();
});

// Time tracking endpoints
app.post('/track-time', (req, res) => {
  console.log('Received track-time request:', req.body);
  
  // Safely destructure with fallback to empty object
  const { sessionId, pageUrl, timeSpent } = req.body || {};
  
  if (!sessionId || !pageUrl || !timeSpent) {
    return res.status(400).json({ 
      error: 'Missing required parameters', 
      received: req.body 
    });
  }

  // Update time spent on the specific page view
  db.query(`
    UPDATE page_views 
    SET time_spent = ? 
    WHERE session_id = ? AND page_url = ?
    ORDER BY view_time DESC
    LIMIT 1
  `, [timeSpent, sessionId, pageUrl], (err) => {
    if (err) {
      console.error('Error updating page time:', err);
      return res.status(500).json({ error: 'Failed to update time' });
    }
    res.json({ success: true });
  });
});

app.post('/track-exit', (req, res) => {
  console.log('Received track-exit request:', req.body);
  
  // Safely destructure with fallback to empty object
  const { sessionId } = req.body || {};
  
  if (!sessionId) {
    return res.status(400).json({ 
      error: 'Session ID required',
      received: req.body 
    });
  }

  // Update exit time and total time spent for the session
  db.query(`
    UPDATE visitor_sessions 
    SET exit_time = CURRENT_TIMESTAMP,
      time_spent = TIMESTAMPDIFF(SECOND, entry_time, CURRENT_TIMESTAMP)
    WHERE session_id = ?
  `, [sessionId], (err) => {
    if (err) {
      console.error('Error updating exit time:', err);
      return res.status(500).json({ error: 'Failed to update exit time' });
    }
    res.json({ success: true });
  });
});

// Analytics dashboard endpoint
app.get('/analytics', (req, res) => {
  // In a real app, you'd add authentication here
  
  // Get summary stats
  db.query(`
      SELECT 
          COUNT(*) as total_visitors,
          AVG(time_spent) as avg_time_spent,
          SUM(page_views) as total_page_views,
          COUNT(DISTINCT ip_address) as unique_ips
      FROM visitor_sessions
  `, (err, results) => {
      if (err) {
          console.error('Error fetching analytics:', err);
          return res.status(500).json({ error: 'Failed to fetch analytics' });
      }
      
      const summary = results[0];
      
      // Get recent visitors
      db.query(`
          SELECT 
              session_id, ip_address, country, city, 
              entry_time, exit_time, time_spent, page_views
          FROM visitor_sessions
          ORDER BY entry_time DESC
          LIMIT 50
      `, (err, visitors) => {
          if (err) {
              console.error('Error fetching visitors:', err);
              return res.status(500).json({ error: 'Failed to fetch visitors' });
          }
          
          res.json({
              summary,
              recentVisitors: visitors
          });
      });
  });
});

// CHATBOT DATA ENDPOINT
app.post('/save-chat', (req, res) => {
  const { name, email, phone, interests, conversation } = req.body;
  
  // Basic validation
  if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
  }
  
  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
  }
  
  // Process conversation data
  let conversationData;
  try {
      // Check if conversation is already a string, otherwise stringify it
      conversationData = typeof conversation === 'string' 
          ? conversation 
          : JSON.stringify(conversation);
  } catch (e) {
      console.error('Error stringifying conversation:', e);
      return res.status(400).json({ error: 'Invalid conversation format' });
  }
  
  // Ensure we don't exceed database column limits
  const sql = `INSERT INTO chat_messages
              (name, email, phone, interests, conversation)
              VALUES (?, ?, ?, ?, ?)`;
  
  db.query(sql,
      [
          name.substring(0, 100),
          email.substring(0, 100),
          phone ? phone.substring(0, 20) : null,
          interests ? interests.substring(0, 500) : null,
          conversationData.substring(0, 5000)  // Limiting to 5000 characters
      ],
      (err, result) => {
          if (err) {
              console.error('Database error:', err);
              return res.status(500).json({
                  success: false,
                  error: 'Failed to save chat',
                  details: process.env.NODE_ENV === 'development' ? err.message : undefined
              });
          }
          res.json({
              success: true,
              message: 'Chat saved successfully',
              chatId: result.insertId
          });
      }
  );
});

// NEWSLETTER SUBSCRIPTION ROUTE
app.post('/subscribe-newsletter', (req, res) => {
  console.log('Newsletter subscription request received:', req.body);
  
  // Added debugging to check what's coming in
  if (!req.body) {
    console.error('Empty request body');
    return res.status(400).json({
      success: false,
      error: 'No data received'
    });
  }
  
  const { email } = req.body;
  
  // Validate email exists
  if (!email) {
    console.error('No email provided');
    return res.status(400).json({
      success: false,
      error: 'Please provide an email address'
    });
  }
  
  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Invalid email format:', email);
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid email address'
    });
  }
  
  // Check if email already exists
  db.query(
    'SELECT id FROM newsletter_subscribers WHERE email = ?', 
    [email],
    (err, results) => {
      if (err) {
        console.error('Database error when checking subscription:', err);
        return res.status(500).json({
          success: false,
          error: 'Database error when checking subscription'
        });
      }
      
      if (results && results.length > 0) {
        console.log('Email already subscribed:', email);
        return res.json({
          success: true,
          message: 'You are already subscribed!'
        });
      }
      
      // Insert new subscriber
      db.query(
        'INSERT INTO newsletter_subscribers (email) VALUES (?)',
        [email],
        (err, result) => {
          if (err) {
            console.error('Database error when adding subscription:', err);
            
            // Check for duplicate entry error (MySQL error code 1062)
            if (err.code === 'ER_DUP_ENTRY') {
              return res.json({
                success: true,
                message: 'You are already subscribed!'
              });
            }
            
            return res.status(500).json({
              success: false,
              error: 'Failed to subscribe',
              details: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
          }
          
          console.log('Newsletter subscription successful:', email);
          res.json({
            success: true,
            message: 'Thank you for subscribing!'
          });
        }
      );
    }
  );
});

// Add validation for contactRoutes
console.log('Loading contactRoutes...');

// Use contact routes - REMOVE the local /submit-contact endpoint since it's in contactRoutes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', contactRoutes);
console.log('contactRoutes successfully loaded');

// Add test route to validate contactRoutes is working
app.get('/test-contact-route', (req, res) => {
  console.log('Contact routes test endpoint accessed');
  res.json({ success: true, message: 'Contact routes are working!' });
});

// Database reconnection function
function handleDisconnect() {
  // Recreate the connection since the old one cannot be reused
  db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'shivam972',
    port: 3308,
    database: 'contact_db'
  });

  db.connect((err) => {
    if (err) {
      console.error('Error reconnecting to database:', err);
      setTimeout(handleDisconnect, 2000); // Try again in 2 seconds
    } else {
      console.log('Database reconnected successfully');
    }
  });
  
  db.on('error', function(err) {
    console.error('DB error after reconnection:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      handleDisconnect();
    } else {
      throw err;
    }
  });
}
app.use('/api', blogRouter);
console.log('✅ Blog routes connected');
app.use('/admin-access', adminRoutes);
console.log('✅ Admin routes connected');
app.use('/api', resourceRouter);
console.log('✅ resource routes connected');
app.use('/api/admin', adminRoutes1);
console.log('✅ admin routes connected');
app.use('/api', webinarRouter);
console.log('✅ webinar routes connected');

app.get('/blog/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'blog-detail.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Contact form endpoint: http://localhost:${port}/submit-contact`);
    console.log(`Chatbot endpoint: http://localhost:${port}/save-chat`);
    console.log(`Test contact routes at: http://localhost:${port}/test-contact-route`);
});