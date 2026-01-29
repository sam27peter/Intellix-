const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const db = require('./db/database');

const app = express();
const PORT = 3000;

// 🔐 SESSION MUST COME AFTER app IS CREATED
app.use(session({
  secret: 'CHANGE_THIS_SECRET',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
}));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🔐 STEP 4: limit login attempts
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,                 // max 5 attempts per minute
  message: {
    error: 'Too many login attempts. Please try again after a minute.'
  }
});


// --- Data Access Helpers ---
const DATA_DIR = path.join(__dirname, 'data');

const readData = (file) => {
  const rawData = fs.readFileSync(path.join(DATA_DIR, file));
  return JSON.parse(rawData);
};

const writeData = (file, data) => {
  fs.writeFileSync(
    path.join(DATA_DIR, file),
    JSON.stringify(data, null, 2)
  );
};

// 🔐 ADMIN CHECK (REQUIRED)
const requireAdmin = (req, res, next) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// --- Multer Storage Config (SECURED) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, Date.now() + '-' + safeName);
  }
});

// 🔐 STEP 3: allow ONLY images
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/webp'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// 🔐 STEP 3: limit file size (5MB)
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});


// --- API Routes ---

// 🔐 LOGIN (HASH + SESSION) — SQLITE VERSION
app.post('/api/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;

  db.get(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, user) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      const ok = await bcrypt.compare(password, user.passwordHash);

      if (!ok) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      req.session.isAdmin = true;
      res.json({ success: true });
    }
  );
});


// Events (READ)
app.get('/api/events', (req, res) => {
  db.all(
    'SELECT * FROM events ORDER BY date ASC',
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const events = rows.map(e => ({
        ...e,
        images: e.images ? JSON.parse(e.images) : []
      }));

      res.json(events);
    }
  );
});

app.post('/api/events', requireAdmin, upload.array('images', 10), (req, res) => {
  const { title, date, description, link } = req.body;
  const images = req.files ? req.files.map(f => '/uploads/' + f.filename) : [];

  db.run(
    `INSERT INTO events (title, date, description, link, images)
     VALUES (?, ?, ?, ?, ?)`,
    [title, date, description, link || '#', JSON.stringify(images)],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database insert failed' });
      }

      res.json({
        success: true,
        event: {
          id: this.lastID,
          title,
          date,
          description,
          link,
          images
        }
      });
    }
  );
});


app.delete('/api/events/:id', requireAdmin, (req, res) => {
  db.run(
    'DELETE FROM events WHERE id = ?',
    [req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database delete failed' });
      }
      res.json({ success: true });
    }
  );
});


// Team
app.get('/api/team', (req, res) => {
  db.all('SELECT * FROM team', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.post('/api/team', requireAdmin, upload.single('photo'), (req, res) => {
  const { name, role, dept } = req.body;
  const photo = req.file ? '/uploads/' + req.file.filename : null;

  db.run(
    `INSERT INTO team (name, role, dept, photo)
     VALUES (?, ?, ?, ?)`,
    [name, role, dept, photo],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database insert failed' });
      }

      res.json({
        success: true,
        member: {
          id: this.lastID,
          name,
          role,
          dept,
          photo
        }
      });
    }
  );
});

app.delete('/api/team/:id', requireAdmin, (req, res) => {
  db.run(
    'DELETE FROM team WHERE id = ?',
    [req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database delete failed' });
      }
      res.json({ success: true });
    }
  );
});


// Projects
app.get('/api/projects', (req, res) => {
  db.all('SELECT * FROM projects', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});


app.post('/api/projects', requireAdmin, (req, res) => {
  const { title, description, tech, repoLink } = req.body;

  db.run(
    `INSERT INTO projects (title, description, tech, repoLink)
     VALUES (?, ?, ?, ?)`,
    [title, description, tech, repoLink || '#'],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database insert failed' });
      }

      res.json({
        success: true,
        project: {
          id: this.lastID,
          title,
          description,
          tech,
          repoLink
        }
      });
    }
  );
});


app.delete('/api/projects/:id', requireAdmin, (req, res) => {
  db.run(
    'DELETE FROM projects WHERE id = ?',
    [req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database delete failed' });
      }
      res.json({ success: true });
    }
  );
});


// Settings
app.get('/api/settings', (req, res) => {
  db.get(
    'SELECT value FROM settings WHERE key = ?',
    ['gformsLink'],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        gformsLink: row ? row.value : '#'
      });
    }
  );
});


app.post('/api/settings', requireAdmin, (req, res) => {
  const { url } = req.body;

  db.run(
    `
    INSERT INTO settings (key, value)
    VALUES ('gformsLink', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    [url],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database update failed' });
      }

      res.json({
        success: true,
        settings: { gformsLink: url }
      });
    }
  );
});

// 🔐 STEP 3: multer error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
