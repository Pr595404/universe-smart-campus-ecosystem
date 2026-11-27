const db = require('../config/database');
const { recordActionProgress } = require('../utils/gamification');

exports.getDashboardSummary = (req, res) => {
  const userId = req.user.id;
  const upcomingEvents = db.prepare(`
    SELECT e.*, (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id) AS registered_count,
           EXISTS(SELECT 1 FROM event_registrations er WHERE er.event_id = e.id AND er.user_id = ?) AS is_registered
    FROM events e
    ORDER BY e.event_date ASC
    LIMIT 4
  `).all(userId);

  const announcements = db.prepare(`
    SELECT a.*, u.name AS author_name, u.role AS author_role
    FROM announcements a
    JOIN users u ON u.id = a.author_id
    ORDER BY a.created_at DESC
    LIMIT 5
  `).all();

  const recentPosts = db.prepare(`
    SELECT p.*, u.name AS author_name, u.avatar_color, u.department,
           (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS likes_count,
           (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) AS comments_count
    FROM posts p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.created_at DESC
    LIMIT 4
  `).all();

  const recentResources = db.prepare(`
    SELECT r.*, u.name AS uploader_name
    FROM study_resources r
    JOIN users u ON u.id = r.user_id
    ORDER BY r.created_at DESC
    LIMIT 4
  `).all();

  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY completed ASC, id DESC').all(userId);
  const badgeCount = db.prepare('SELECT COUNT(*) AS count FROM user_badges WHERE user_id = ?').get(userId).count;
  const regCount = db.prepare('SELECT COUNT(*) AS count FROM event_registrations WHERE user_id = ?').get(userId).count;
  const postCount = db.prepare('SELECT COUNT(*) AS count FROM posts WHERE user_id = ?').get(userId).count;

  res.json({
    stats: {
      xp: req.user.xp,
      badges: badgeCount,
      registeredEvents: regCount,
      postsCreated: postCount
    },
    upcomingEvents,
    announcements,
    recentPosts,
    recentResources,
    tasks
  });
};

exports.getPosts = (req, res) => {
  const { category, q } = req.query;
  const userId = req.user ? req.user.id : 0;
  let sql = `
    SELECT p.*, u.name AS author_name, u.role AS author_role, u.department, u.avatar_color,
           (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS likes_count,
           (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) AS comments_count,
           EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) AS liked_by_me
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE 1=1
  `;
  const params = [userId];
  if (category && category !== 'All') {
    sql += ' AND p.category = ?';
    params.push(category);
  }
  if (q) {
    sql += ' AND (p.content LIKE ? OR u.name LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY p.created_at DESC, p.id DESC';

  const posts = db.prepare(sql).all(...params);
  const getComments = db.prepare(`
    SELECT c.*, u.name AS author_name, u.avatar_color
    FROM post_comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `);
  for (const post of posts) {
    post.comments = getComments.all(post.id);
  }
  res.json({ posts });
};

exports.createPost = (req, res) => {
  const { category, content } = req.body;
  if (!content || !String(content).trim()) {
    return res.status(400).json({ error: 'Post content cannot be empty.' });
  }
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
  const result = db.prepare(`
    INSERT INTO posts (user_id, category, content, image_url, is_demo)
    VALUES (?, ?, ?, ?, 0)
  `).run(req.user.id, category || 'General', String(content).trim(), imageUrl);

  const reward = recordActionProgress(req.user.id, 'post', 10);
  res.status(201).json({ id: result.lastInsertRowid, reward });
};

exports.toggleLike = (req, res) => {
  const postId = Number(req.params.id);
  const existing = db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').get(postId, req.user.id);
  if (existing) {
    db.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').run(postId, req.user.id);
    return res.json({ liked: false });
  }
  db.prepare('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)').run(postId, req.user.id);
  res.json({ liked: true });
};

exports.addComment = (req, res) => {
  const postId = Number(req.params.id);
  const { content } = req.body;
  if (!content || !String(content).trim()) {
    return res.status(400).json({ error: 'Comment cannot be empty.' });
  }
  db.prepare('INSERT INTO post_comments (post_id, user_id, content) VALUES (?, ?, ?)').run(
    postId,
    req.user.id,
    String(content).trim()
  );
  const reward = recordActionProgress(req.user.id, 'post', 5);
  res.status(201).json({ message: 'Comment added', reward });
};

exports.deletePost = (req, res) => {
  const postId = Number(req.params.id);
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  if (post.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only delete your own posts.' });
  }
  db.prepare('DELETE FROM posts WHERE id = ?').run(postId);
  res.json({ deleted: true });
};

exports.getAnnouncements = (_req, res) => {
  const announcements = db.prepare(`
    SELECT a.*, u.name AS author_name, u.role AS author_role
    FROM announcements a
    JOIN users u ON u.id = a.author_id
    ORDER BY a.created_at DESC
  `).all();
  res.json({ announcements });
};

exports.createReport = (req, res) => {
  const { target_type, target_id, reason } = req.body;
  if (!target_type || !target_id || !reason) {
    return res.status(400).json({ error: 'Report type, target ID, and reason are required.' });
  }
  db.prepare('INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES (?, ?, ?, ?)').run(
    req.user.id,
    String(target_type),
    Number(target_id),
    String(reason).trim()
  );
  res.status(201).json({ message: 'Report submitted for admin review.' });
};

exports.createTask = (req, res) => {
  const { title, due_date } = req.body;
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'Task title is required.' });
  }
  const result = db.prepare('INSERT INTO tasks (user_id, title, due_date) VALUES (?, ?, ?)').run(
    req.user.id,
    String(title).trim(),
    due_date || ''
  );
  res.status(201).json({ id: result.lastInsertRowid });
};

exports.toggleTask = (req, res) => {
  const taskId = Number(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(taskId, req.user.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });
  db.prepare('UPDATE tasks SET completed = ? WHERE id = ?').run(task.completed ? 0 : 1, taskId);
  res.json({ completed: !task.completed });
};

exports.deleteTask = (req, res) => {
  const taskId = Number(req.params.id);
  db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(taskId, req.user.id);
  res.json({ deleted: true });
};

exports.getNotifications = (req, res) => {
  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 15').all(req.user.id);
  res.json({ notifications });
};

exports.markNotificationsRead = (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ updated: true });
};
