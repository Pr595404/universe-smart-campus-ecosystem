const db = require('../config/database');
const { recordActionProgress } = require('../utils/gamification');

// --- EVENTS ---
exports.getEvents = (req, res) => {
  const { category, q } = req.query;
  const userId = req.user ? req.user.id : 0;
  let sql = `
    SELECT e.*, u.name AS organizer_name,
           (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id) AS registered_count,
           EXISTS(SELECT 1 FROM event_registrations er WHERE er.event_id = e.id AND er.user_id = ?) AS is_registered
    FROM events e
    JOIN users u ON u.id = e.organizer_id
    WHERE 1=1
  `;
  const params = [userId];
  if (category && category !== 'All') {
    sql += ' AND e.category = ?';
    params.push(category);
  }
  if (q) {
    sql += ' AND (e.title LIKE ? OR e.description LIKE ? OR e.location LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY e.event_date ASC';
  res.json({ events: db.prepare(sql).all(...params) });
};

exports.createEvent = (req, res) => {
  const { title, description, category, location, event_date, capacity, banner_theme } = req.body;
  if (!title || !description || !category || !location || !event_date) {
    return res.status(400).json({ error: 'All event fields are required.' });
  }
  const result = db.prepare(`
    INSERT INTO events (title, description, category, location, event_date, organizer_id, capacity, banner_theme, is_demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(
    String(title).trim(),
    String(description).trim(),
    String(category).trim(),
    String(location).trim(),
    String(event_date).trim(),
    req.user.id,
    Number(capacity) || 150,
    banner_theme || 'aurora'
  );
  res.status(201).json({ id: result.lastInsertRowid });
};

exports.toggleEventRegistration = (req, res) => {
  const eventId = Number(req.params.id);
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found.' });

  const existing = db.prepare('SELECT 1 FROM event_registrations WHERE event_id = ? AND user_id = ?').get(eventId, req.user.id);
  if (existing) {
    db.prepare('DELETE FROM event_registrations WHERE event_id = ? AND user_id = ?').run(eventId, req.user.id);
    return res.json({ registered: false });
  }

  db.prepare('INSERT INTO event_registrations (event_id, user_id) VALUES (?, ?)').run(eventId, req.user.id);
  const reward = recordActionProgress(req.user.id, 'event', 25);
  db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(
    req.user.id,
    'Event Registration Confirmed',
    `You are registered for "${event.title}" on ${event.event_date.replace('T', ' ')}.`
  );
  res.json({ registered: true, reward });
};

// --- LOST & FOUND ---
exports.getLostFound = (req, res) => {
  const { type, category, status, q } = req.query;
  let sql = `
    SELECT lf.*, u.name AS reporter_name, u.department AS reporter_department
    FROM lost_found lf
    JOIN users u ON u.id = lf.user_id
    WHERE 1=1
  `;
  const params = [];
  if (type && type !== 'all') {
    sql += ' AND lf.type = ?';
    params.push(type);
  }
  if (category && category !== 'All') {
    sql += ' AND lf.category = ?';
    params.push(category);
  }
  if (status && status !== 'all') {
    sql += ' AND lf.status = ?';
    params.push(status);
  }
  if (q) {
    sql += ' AND (lf.item_name LIKE ? OR lf.description LIKE ? OR lf.location LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY lf.created_at DESC, lf.id DESC';
  res.json({ items: db.prepare(sql).all(...params) });
};

exports.createLostFound = (req, res) => {
  const { type, item_name, description, category, location, item_date } = req.body;
  if (!type || !item_name || !description || !location || !item_date) {
    return res.status(400).json({ error: 'Please fill in all required item details.' });
  }
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
  const result = db.prepare(`
    INSERT INTO lost_found (user_id, type, item_name, description, category, location, item_date, image_url, is_demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(req.user.id, type, item_name.trim(), description.trim(), category || 'Other', location.trim(), item_date, imageUrl);
  res.status(201).json({ id: result.lastInsertRowid });
};

exports.markLostFoundRecovered = (req, res) => {
  const id = Number(req.params.id);
  const item = db.prepare('SELECT * FROM lost_found WHERE id = ?').get(id);
  if (!item) return res.status(404).json({ error: 'Listing not found.' });
  if (item.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the reporter or an admin can mark this recovered.' });
  }
  db.prepare("UPDATE lost_found SET status = 'recovered' WHERE id = ?").run(id);
  res.json({ status: 'recovered' });
};

// --- STUDYHUB ---
exports.getResources = (req, res) => {
  const { semester, subject, q, bookmarked } = req.query;
  const userId = req.user ? req.user.id : 0;
  let sql = `
    SELECT r.*, u.name AS uploader_name, u.role AS uploader_role,
           EXISTS(SELECT 1 FROM resource_bookmarks rb WHERE rb.resource_id = r.id AND rb.user_id = ?) AS is_bookmarked
    FROM study_resources r
    JOIN users u ON u.id = r.user_id
    WHERE 1=1
  `;
  const params = [userId];
  if (semester && semester !== 'All') {
    sql += ' AND r.semester = ?';
    params.push(semester);
  }
  if (subject && subject !== 'All') {
    sql += ' AND r.subject = ?';
    params.push(subject);
  }
  if (q) {
    sql += ' AND (r.title LIKE ? OR r.subject LIKE ? OR r.description LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (bookmarked === 'true' && userId) {
    sql += ' AND EXISTS(SELECT 1 FROM resource_bookmarks rb WHERE rb.resource_id = r.id AND rb.user_id = ?)';
    params.push(userId);
  }
  sql += ' ORDER BY r.created_at DESC, r.id DESC';
  res.json({ resources: db.prepare(sql).all(...params) });
};

exports.uploadResource = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please attach a valid study document (PDF, DOCX, PPTX, TXT, MD).' });
  }
  const { title, subject, semester, description } = req.body;
  if (!title || !subject || !semester) {
    return res.status(400).json({ error: 'Title, subject, and semester are required.' });
  }
  const result = db.prepare(`
    INSERT INTO study_resources (user_id, title, subject, semester, description, file_url, file_name, file_size, is_demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(
    req.user.id,
    title.trim(),
    subject.trim(),
    semester.trim(),
    (description || '').trim(),
    `/uploads/${req.file.filename}`,
    req.file.originalname,
    req.file.size
  );
  const reward = recordActionProgress(req.user.id, 'upload_resource', 30);
  res.status(201).json({ id: result.lastInsertRowid, reward });
};

exports.recordDownload = (req, res) => {
  const id = Number(req.params.id);
  const resource = db.prepare('SELECT * FROM study_resources WHERE id = ?').get(id);
  if (!resource) return res.status(404).json({ error: 'Resource not found.' });
  db.prepare('UPDATE study_resources SET downloads = downloads + 1 WHERE id = ?').run(id);
  const reward = req.user ? recordActionProgress(req.user.id, 'resource', 5) : { xpAwarded: 0, unlockedBadges: [] };
  res.json({ file_url: resource.file_url, file_name: resource.file_name, reward });
};

exports.toggleBookmark = (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT 1 FROM resource_bookmarks WHERE resource_id = ? AND user_id = ?').get(id, req.user.id);
  if (existing) {
    db.prepare('DELETE FROM resource_bookmarks WHERE resource_id = ? AND user_id = ?').run(id, req.user.id);
    return res.json({ bookmarked: false });
  }
  db.prepare('INSERT INTO resource_bookmarks (resource_id, user_id) VALUES (?, ?)').run(id, req.user.id);
  const reward = recordActionProgress(req.user.id, 'resource', 5);
  res.json({ bookmarked: true, reward });
};

// --- SKILLSPHERE ---
exports.getSkillSphereData = (req, res) => {
  const { skill, q } = req.query;
  const currentUserId = req.user ? req.user.id : 0;

  const mySkills = currentUserId
    ? db.prepare('SELECT * FROM student_skills WHERE user_id = ?').all(currentUserId)
    : [];
  const mySkillSet = new Set(mySkills.map((s) => s.skill_name.toLowerCase()));

  const students = db.prepare(`
    SELECT id, name, department, semester, bio, avatar_color, portfolio_url, xp, is_demo
    FROM users
    WHERE role = 'student'
    ORDER BY xp DESC
  `).all();

  const getSkills = db.prepare('SELECT * FROM student_skills WHERE user_id = ?');
  const enriched = students
    .map((st) => {
      const skills = getSkills.all(st.id);
      // Complementary skill-matching algorithm: rewards students who bring distinct skills + shared domain context
      const theirNames = skills.map((s) => s.skill_name.toLowerCase());
      const complementaryCount = theirNames.filter((n) => !mySkillSet.has(n)).length;
      const overlapCount = theirNames.filter((n) => mySkillSet.has(n)).length;
      const matchScore = currentUserId && st.id !== currentUserId
        ? Math.min(98, 55 + complementaryCount * 12 + overlapCount * 6)
        : 0;
      return { ...st, skills, matchScore };
    })
    .filter((st) => {
      if (skill && skill !== 'All') {
        const hasSkill = st.skills.some((s) => s.skill_name.toLowerCase().includes(skill.toLowerCase()));
        if (!hasSkill) return false;
      }
      if (q) {
        const matchQ =
          st.name.toLowerCase().includes(q.toLowerCase()) ||
          st.department.toLowerCase().includes(q.toLowerCase()) ||
          st.skills.some((s) => s.skill_name.toLowerCase().includes(q.toLowerCase()));
        if (!matchQ) return false;
      }
      return true;
    });

  const projects = db.prepare(`
    SELECT p.*, u.name AS owner_name, u.department AS owner_department
    FROM project_ideas p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.created_at DESC
  `).all();

  const requests = currentUserId
    ? db.prepare(`
        SELECT cr.*, s.name AS sender_name, r.name AS receiver_name
        FROM collaboration_requests cr
        JOIN users s ON s.id = cr.sender_id
        JOIN users r ON r.id = cr.receiver_id
        WHERE cr.sender_id = ? OR cr.receiver_id = ?
        ORDER BY cr.created_at DESC
      `).all(currentUserId, currentUserId)
    : [];

  res.json({ students: enriched, mySkills, projects, requests });
};

exports.addSkill = (req, res) => {
  const { skill_name, skill_type, proficiency } = req.body;
  if (!skill_name || !String(skill_name).trim()) {
    return res.status(400).json({ error: 'Skill name is required.' });
  }
  const result = db.prepare('INSERT INTO student_skills (user_id, skill_name, skill_type, proficiency) VALUES (?, ?, ?, ?)').run(
    req.user.id,
    String(skill_name).trim(),
    skill_type === 'non-technical' ? 'non-technical' : 'technical',
    proficiency || 'Intermediate'
  );
  res.status(201).json({ id: result.lastInsertRowid });
};

exports.deleteSkill = (req, res) => {
  db.prepare('DELETE FROM student_skills WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id);
  res.json({ deleted: true });
};

exports.createProjectIdea = (req, res) => {
  const { title, description, needed_skills } = req.body;
  if (!title || !description || !needed_skills) {
    return res.status(400).json({ error: 'Project title, description, and needed skills are required.' });
  }
  const result = db.prepare('INSERT INTO project_ideas (user_id, title, description, needed_skills, is_demo) VALUES (?, ?, ?, ?, 0)').run(
    req.user.id,
    title.trim(),
    description.trim(),
    needed_skills.trim()
  );
  const reward = recordActionProgress(req.user.id, 'project_idea', 20);
  res.status(201).json({ id: result.lastInsertRowid, reward });
};

exports.sendCollabRequest = (req, res) => {
  const { receiver_id, project_title, message } = req.body;
  if (!receiver_id || !project_title || !message) {
    return res.status(400).json({ error: 'Recipient, project title, and message are required.' });
  }
  if (Number(receiver_id) === req.user.id) {
    return res.status(400).json({ error: 'You cannot send a collaboration request to yourself.' });
  }
  const result = db.prepare(`
    INSERT INTO collaboration_requests (sender_id, receiver_id, project_title, message)
    VALUES (?, ?, ?, ?)
  `).run(req.user.id, Number(receiver_id), project_title.trim(), message.trim());

  db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(
    Number(receiver_id),
    'New SkillSphere Teammate Request',
    `${req.user.name} wants to collaborate on "${project_title.trim()}".`
  );

  const reward = recordActionProgress(req.user.id, 'collab', 15);
  res.status(201).json({ id: result.lastInsertRowid, reward });
};

exports.respondCollabRequest = (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }
  const reqRow = db.prepare('SELECT * FROM collaboration_requests WHERE id = ? AND receiver_id = ?').get(id, req.user.id);
  if (!reqRow) return res.status(404).json({ error: 'Collaboration request not found.' });
  db.prepare('UPDATE collaboration_requests SET status = ? WHERE id = ?').run(status, id);
  if (status === 'accepted') {
    recordActionProgress(req.user.id, 'collab', 20);
  }
  res.json({ status });
};

// --- CAMPUS QUEST ---
exports.getQuestData = (req, res) => {
  const userId = req.user ? req.user.id : 0;
  const quests = db.prepare(`
    SELECT q.*, EXISTS(SELECT 1 FROM user_quests uq WHERE uq.quest_id = q.id AND uq.user_id = ?) AS completed
    FROM quests q
    ORDER BY q.frequency ASC, q.xp_reward DESC
  `).all(userId);

  const badges = db.prepare(`
    SELECT b.*, EXISTS(SELECT 1 FROM user_badges ub WHERE ub.badge_id = b.id AND ub.user_id = ?) AS earned
    FROM badges b
    ORDER BY b.xp_reward ASC
  `).all(userId);

  const leaderboard = db.prepare(`
    SELECT id, name, department, semester, avatar_color, xp, is_demo
    FROM users
    WHERE role = 'student'
    ORDER BY xp DESC
    LIMIT 10
  `).all();

  res.json({ quests, badges, leaderboard });
};

// --- ANONYMOUS VOICE ---
exports.getFeedback = (req, res) => {
  const { category, status } = req.query;
  let sql = 'SELECT id, category, content, status, likes, is_demo, created_at FROM anonymous_feedback WHERE 1=1';
  const params = [];
  if (category && category !== 'All') {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (status && status !== 'All') {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY likes DESC, created_at DESC';
  res.json({ feedback: db.prepare(sql).all(...params) });
};

exports.createFeedback = (req, res) => {
  const { category, content } = req.body;
  if (!category || !content || !String(content).trim()) {
    return res.status(400).json({ error: 'Category and feedback message are required.' });
  }
  // Intentionally does NOT store user_id to protect student anonymity
  const result = db.prepare(`
    INSERT INTO anonymous_feedback (category, content, status, likes, is_demo)
    VALUES (?, ?, 'Pending', 0, 0)
  `).run(String(category).trim(), String(content).trim());
  res.status(201).json({ id: result.lastInsertRowid });
};

exports.likeFeedback = (req, res) => {
  const id = Number(req.params.id);
  db.prepare('UPDATE anonymous_feedback SET likes = likes + 1 WHERE id = ?').run(id);
  const row = db.prepare('SELECT likes FROM anonymous_feedback WHERE id = ?').get(id);
  res.json({ likes: row ? row.likes : 0 });
};

// --- MARKETPLACE ---
exports.getMarketplace = (req, res) => {
  const { category, q } = req.query;
  let sql = `
    SELECT m.*, u.name AS seller_name, u.department AS seller_department
    FROM marketplace_items m
    JOIN users u ON u.id = m.user_id
    WHERE 1=1
  `;
  const params = [];
  if (category && category !== 'All') {
    sql += ' AND m.category = ?';
    params.push(category);
  }
  if (q) {
    sql += ' AND (m.title LIKE ? OR m.description LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY m.created_at DESC, m.id DESC';
  res.json({ items: db.prepare(sql).all(...params) });
};

exports.createMarketplaceItem = (req, res) => {
  const { title, description, category, price, condition } = req.body;
  if (!title || !description || !category || price === undefined) {
    return res.status(400).json({ error: 'Title, description, category, and price are required.' });
  }
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
  const result = db.prepare(`
    INSERT INTO marketplace_items (user_id, title, description, category, price, condition, image_url, is_demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `).run(req.user.id, title.trim(), description.trim(), category.trim(), Number(price) || 0, condition || 'Good', imageUrl);
  res.status(201).json({ id: result.lastInsertRowid });
};

exports.markMarketplaceSold = (req, res) => {
  const id = Number(req.params.id);
  const item = db.prepare('SELECT * FROM marketplace_items WHERE id = ?').get(id);
  if (!item) return res.status(404).json({ error: 'Item not found.' });
  if (item.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the seller or admin can update this listing.' });
  }
  db.prepare("UPDATE marketplace_items SET status = 'sold' WHERE id = ?").run(id);
  res.json({ status: 'sold' });
};

// --- PROTECTED CONTACT MECHANISM ---
exports.sendProtectedMessage = (req, res) => {
  const { receiver_id, context_type, context_id, message } = req.body;
  if (!receiver_id || !context_type || !context_id || !message) {
    return res.status(400).json({ error: 'All message fields are required.' });
  }
  db.prepare(`
    INSERT INTO protected_messages (sender_id, receiver_id, context_type, context_id, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.user.id, Number(receiver_id), String(context_type), Number(context_id), String(message).trim());

  db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(
    Number(receiver_id),
    `New Protected Message (${context_type})`,
    `${req.user.name}: "${String(message).trim().slice(0, 80)}"`
  );

  res.status(201).json({ message: 'Protected message delivered without exposing contact details.' });
};
