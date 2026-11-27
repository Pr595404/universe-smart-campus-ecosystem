const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { port, uploadsDir } = require('./config/env');
const { initializeSchema } = require('./models/schema');
const { seedDatabase } = require('./models/seed');

const authRoutes = require('./routes/authRoutes');
const communityRoutes = require('./routes/communityRoutes');
const campusRoutes = require('./routes/campusRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');

// Initialize SQLite schema & demo seed data
initializeSchema();
seedDatabase();

const app = express();

// Security headers configured to allow CDN scripts/styles (Bootstrap, Three.js, GSAP, Google Fonts)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Static assets & uploaded files
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.resolve(__dirname, '../frontend')));

// REST API routes
app.use('/api/auth', authRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/campus', campusRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'UniVerse 3.0 API' });
});

// Custom 404 for API vs HTML pages
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

app.use((_req, res) => {
  res.status(404).sendFile(path.resolve(__dirname, '../frontend/404.html'));
});

// Global error handler (including Multer upload validation errors)
app.use((err, _req, res, _next) => {
  console.error('[UniVerse Error]:', err.message);
  res.status(err.status || 400).json({ error: err.message || 'Internal server error.' });
});

app.listen(port, () => {
  console.log(`UniVerse 3.0 running locally at http://localhost:${port}`);
});
