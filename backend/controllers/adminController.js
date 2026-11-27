const db = require('../config/database');

exports.getPublicStats = (_req, res) => {
  const students = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'student'").get().count;
  const events = db.prepare('SELECT COUNT(*) AS count FROM events').get().count;
  const resources = db.prepare('SELECT COUNT(*) AS count FROM study_resources').get().count;
  const posts = db.prepare('SELECT COUNT(*) AS count FROM posts').get().count;
  res.json({ students, events, resources, posts });
};

exports.getAnalytics = (_req, res) => {
  const stats = {
    totalStudents: db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'student'").get().count,
    totalTeachers: db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'teacher'").get().count,
    totalEvents: db.prepare('SELECT COUNT(*) AS count FROM events').get().count,
    eventRegistrations: db.prepare('SELECT COUNT(*) AS count FROM event_registrations').get().count,
    totalPosts: db.prepare('SELECT COUNT(*) AS count FROM posts').get().count,
    pendingReports: db.prepare("SELECT COUNT(*) AS count FROM reports WHERE status = 'pending'").get().count,
    lostFoundCount: db.prepare('SELECT COUNT(*) AS count FROM lost_found').get().count,
    resourceCount: db.prepare('SELECT COUNT(*) AS count FROM study_resources').get().count
  };

  const users = db.prepare('SELECT id, name, email, role, department, semester, xp, is_demo, created_at FROM users ORDER BY created_at DESC').all();
  const reports = db.prepare(`
    SELECT r.*, u.name AS reporter_name
    FROM reports r
    JOIN users u ON u.id = r.reporter_id
    ORDER BY r.created_at DESC
  `).all();
  const feedback = db.prepare('SELECT * FROM anonymous_feedback ORDER BY created_at DESC').all();
  const events = db.prepare(`
    SELECT e.*, (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id) AS registered_count
    FROM events e
    ORDER BY e.event_date ASC
  `).all();

  res.json({ stats, users, reports, feedback, events });
};

exports.createAnnouncement = (req, res) => {
  const { title, content, priority } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required.' });
  }
  const result = db.prepare(`
    INSERT INTO announcements (title, content, priority, author_id, is_demo)
    VALUES (?, ?, ?, ?, 0)
  `).run(title.trim(), content.trim(), priority || 'normal', req.user.id);
  res.status(201).json({ id: result.lastInsertRowid });
};

exports.updateFeedbackStatus = (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!['Pending', 'Reviewed', 'Resolved'].includes(status)) {
    return res.status(400).json({ error: 'Invalid feedback status.' });
  }
  db.prepare('UPDATE anonymous_feedback SET status = ? WHERE id = ?').run(status, id);
  res.json({ status });
};

exports.updateReportStatus = (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!['pending', 'resolved', 'dismissed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid report status.' });
  }
  db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status, id);
  res.json({ status });
};

exports.deleteEvent = (req, res) => {
  db.prepare('DELETE FROM events WHERE id = ?').run(Number(req.params.id));
  res.json({ deleted: true });
};

exports.deleteUser = (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own active admin account.' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ deleted: true });
};
