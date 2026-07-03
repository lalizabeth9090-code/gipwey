const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.json');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'gipwey-secret-key-12345',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 2, // 2 hours
    secure: false // Set to true if using HTTPS in production, keep false for Railway default HTTP/HTTPS proxy
  }
}));

// Admin Password setting (Default: 'akugipweyehehe')
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'akugipweyehehe';

// Database helper functions
function initDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      status: 'active', // 'active', 'finished'
      winners: [],
      participants: []
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

function readDB() {
  try {
    initDB();
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database file:', error);
    return { status: 'active', winners: [], participants: [] };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing to database file:', error);
  }
}

// Initialize database on startup
initDB();

// Admin Authentication Middleware
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized. Admin access required.' });
  }
}

// ----------------- PUBLIC API ENDPOINTS -----------------

// Get current giveaway status and winner list
app.get('/api/status', (req, res) => {
  const db = readDB();
  res.json({
    status: db.status,
    winners: db.winners,
    totalParticipants: db.participants.length
  });
});

// Get participants list for public display (HIDING WhatsApp numbers)
app.get('/api/participants', (req, res) => {
  const db = readDB();
  // Strip out the whatsapp field for public safety
  const publicList = db.participants.map(p => ({
    name: p.name,
    message: p.message,
    createdAt: p.createdAt
  }));
  res.json(publicList);
});

// Register a new participant
app.post('/api/register', (req, res) => {
  const { name, whatsapp, message } = req.body;
  
  // Basic validations
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nama harus diisi.' });
  }
  if (!whatsapp || !whatsapp.trim()) {
    return res.status(400).json({ error: 'Nomor WhatsApp harus diisi.' });
  }
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Kata-kata (pesan) harus diisi.' });
  }

  // Validate format of phone number (at least 9 digits)
  const phoneDigits = whatsapp.replace(/\D/g, '');
  if (phoneDigits.length < 9 || phoneDigits.length > 15) {
    return res.status(400).json({ error: 'Nomor WhatsApp tidak valid. Masukkan nomor yang benar (9-15 digit).' });
  }

  const db = readDB();

  // Check if giveaway is still active
  if (db.status !== 'active') {
    return res.status(400).json({ error: 'Giveaway sudah selesai. Pendaftaran ditutup.' });
  }

  // Check maximum limit
  if (db.participants.length >= 100) {
    return res.status(400).json({ error: 'Kuota pendaftaran penuh. Maksimal 100 peserta.' });
  }

  // Check for duplicate Name (case insensitive)
  const normalizedNewName = name.trim().toLowerCase();
  const nameExists = db.participants.some(p => p.name.toLowerCase() === normalizedNewName);
  if (nameExists) {
    return res.status(400).json({ error: 'Nama ini sudah terdaftar. Silakan gunakan nama lain/unik.' });
  }

  // Check for duplicate WhatsApp number (comparing only digits)
  const whatsappExists = db.participants.some(p => p.whatsapp.replace(/\D/g, '') === phoneDigits);
  if (whatsappExists) {
    return res.status(400).json({ error: 'Nomor WhatsApp ini sudah terdaftar.' });
  }

  // Add new participant
  const newParticipant = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    name: name.trim(),
    whatsapp: whatsapp.trim(),
    message: message.trim(),
    createdAt: new Date().toISOString()
  };

  db.participants.push(newParticipant);
  writeDB(db);

  res.json({ success: true, message: 'Pendaftaran berhasil! Semoga beruntung!' });
});

// ----------------- ADMIN API ENDPOINTS -----------------

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.json({ success: true, message: 'Login admin berhasil!' });
  } else {
    res.status(401).json({ error: 'Password salah!' });
  }
});

// Check Admin Status
app.get('/api/admin/check', (req, res) => {
  if (req.session && req.session.isAdmin) {
    res.json({ isAdmin: true });
  } else {
    res.json({ isAdmin: false });
  }
});

// Admin Logout
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Gagal logout.' });
    }
    res.json({ success: true, message: 'Logout admin berhasil!' });
  });
});

// Admin Get Participants (WITH WhatsApp numbers)
app.get('/api/admin/participants', requireAdmin, (req, res) => {
  const db = readDB();
  res.json(db.participants);
});

// Admin Draw Giveaway Winners
app.post('/api/admin/draw', requireAdmin, (req, res) => {
  const db = readDB();
  const count = parseInt(req.body.count) || 1;

  if (db.status !== 'active') {
    return res.status(400).json({ error: 'Giveaway sudah diacak sebelumnya. Reset terlebih dahulu jika ingin mengulang.' });
  }

  if (db.participants.length === 0) {
    return res.status(400).json({ error: 'Belum ada peserta yang mendaftar!' });
  }

  const actualCount = Math.min(count, db.participants.length);
  const shuffled = [...db.participants].sort(() => 0.5 - Math.random());
  const selectedWinners = shuffled.slice(0, actualCount).map(p => ({
    name: p.name,
    whatsapp: p.whatsapp, // visible to admin in output, but we will store it
    message: p.message
  }));

  db.status = 'finished';
  // For safety and public check, we store public-facing winners but keep admin copies
  db.winners = selectedWinners.map(w => ({
    name: w.name,
    message: w.message
  }));
  
  // Save drawn winners
  writeDB(db);

  res.json({ success: true, winners: selectedWinners });
});

// Admin Reset Giveaway
app.post('/api/admin/reset', requireAdmin, (req, res) => {
  const db = readDB();
  db.status = 'active';
  db.winners = [];
  db.participants = [];
  writeDB(db);
  res.json({ success: true, message: 'Giveaway berhasil di-reset!' });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
