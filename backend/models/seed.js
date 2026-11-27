const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { uploadsDir } = require('../config/env');

function ensureDemoUploadFiles() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const samplePdfPath = path.join(uploadsDir, 'sample-dsa-notes.pdf');
  if (!fs.existsSync(samplePdfPath)) {
    // Minimal valid PDF document for StudyHub demo download
    const minimalPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 138 >> stream
BT /F1 18 Tf 72 720 Td (UniVerse StudyHub - Sample DSA Notes) Tj
0 -30 Td /F1 12 Tf (Demo PDF Resource: Trees, Graphs, and Dynamic Programming Summary.) Tj ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000241 00000 n
0000000430 00000 n
trailer << /Size 6 /Root 1 0 R >>
startxref
498
%%EOF`;
    fs.writeFileSync(samplePdfPath, minimalPdf, 'utf8');
  }
}

function seedDatabase() {
  ensureDemoUploadFiles();

  const existingUsers = db.prepare('SELECT COUNT(*) AS count FROM users').get();
  if (existingUsers.count > 0) return;

  // Demo identities are useful as sample content, but never ship shared default passwords.
  // Without local overrides they receive random, undisclosed passwords and users register their own account.
  const studentPass = bcrypt.hashSync(process.env.DEMO_STUDENT_PASSWORD || randomBytes(32).toString('base64url'), 10);
  const teacherPass = bcrypt.hashSync(process.env.DEMO_TEACHER_PASSWORD || randomBytes(32).toString('base64url'), 10);
  const adminPass = bcrypt.hashSync(process.env.DEMO_ADMIN_PASSWORD || randomBytes(32).toString('base64url'), 10);

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, department, semester, bio, avatar_color, portfolio_url, xp, is_demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const student1 = insertUser.run(
    'Aarav Sharma',
    'student@universe.edu',
    studentPass,
    'student',
    'Computer Science',
    'Sem 5',
    'Full-stack builder & AI enthusiast. Looking for hackathon teammates.',
    '#6366f1',
    'https://github.com/demo-aarav',
    420
  ).lastInsertRowid;

  const student2 = insertUser.run(
    'Maya Patel',
    'maya@universe.edu',
    studentPass,
    'student',
    'Information Technology',
    'Sem 5',
    'UI/UX designer & Three.js hobbyist. Love crafting clean interfaces.',
    '#06b6d4',
    'https://dribbble.com/demo-maya',
    380
  ).lastInsertRowid;

  const student3 = insertUser.run(
    'Rohan Verma',
    'rohan@universe.edu',
    studentPass,
    'student',
    'Electronics & Comm.',
    'Sem 7',
    'IoT, embedded systems, and robotics club lead.',
    '#8b5cf6',
    'https://github.com/demo-rohan',
    510
  ).lastInsertRowid;

  const teacher1 = insertUser.run(
    'Dr. Priya Nair',
    'teacher@universe.edu',
    teacherPass,
    'teacher',
    'Computer Science',
    'Faculty',
    'Associate Professor of Web Technologies & Distributed Systems.',
    '#10b981',
    '',
    260
  ).lastInsertRowid;

  const admin1 = insertUser.run(
    'Campus Admin',
    'admin@universe.edu',
    adminPass,
    'admin',
    'Administration',
    'Staff',
    'UniVerse Platform Administrator & Student Affairs Coordinator.',
    '#f59e0b',
    '',
    999
  ).lastInsertRowid;

  // Announcements
  const insertAnnouncement = db.prepare(`
    INSERT INTO announcements (title, content, priority, author_id, is_demo)
    VALUES (?, ?, ?, ?, 1)
  `);
  insertAnnouncement.run(
    'Mid-Semester Project Evaluation Schedule Released',
    'Web Technologies practical evaluations begin next Monday in Computer Lab 2. Ensure your UniVerse local build and documentation are ready.',
    'high',
    teacher1
  );
  insertAnnouncement.run(
    'Annual TechFest Hackathon Registrations Open',
    'Form teams of 2–4 using SkillSphere and register before Friday 6:00 PM to claim your slot.',
    'normal',
    admin1
  );

  // Campus Pulse Posts
  const insertPost = db.prepare(`
    INSERT INTO posts (user_id, category, content, image_url, is_demo)
    VALUES (?, ?, ?, ?, 1)
  `);
  const p1 = insertPost.run(
    student1,
    'Projects',
    'Just shipped our WebGL campus navigation prototype for UniVerse 3.0! Looking for a backend partner to integrate real-time lab availability.',
    ''
  ).lastInsertRowid;
  const p2 = insertPost.run(
    student2,
    'Clubs',
    'Design Guild workshop on glassmorphism, spatial UI, and accessibility starts at 4:00 PM in Auditorium Annex. Bring your laptops!',
    ''
  ).lastInsertRowid;
  insertPost.run(
    teacher1,
    'Academics',
    'Uploaded updated Unit 4 REST API & Express Middleware notes to StudyHub. Review them before Friday’s lab session.',
    ''
  );

  db.prepare('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)').run(p1, student2);
  db.prepare('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)').run(p1, student3);
  db.prepare('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)').run(p2, student1);
  db.prepare('INSERT INTO post_comments (post_id, user_id, content) VALUES (?, ?, ?)').run(
    p1,
    student2,
    'The 3D lighting looks super crisp! Count me in for UI polish.'
  );

  // Events
  const insertEvent = db.prepare(`
    INSERT INTO events (title, description, category, location, event_date, organizer_id, capacity, banner_theme, is_demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const futureDate = (days) => {
    const d = new Date(Date.now() + days * 86400000);
    return d.toISOString().slice(0, 16);
  };
  const e1 = insertEvent.run(
    'UniVerse HackNight 2026',
    'A 24-hour campus innovation sprint building smart campus tools, AI study assistants, and sustainable tech.',
    'Hackathon',
    'Innovation Hub & Main Auditorium',
    futureDate(5),
    admin1,
    200,
    'aurora'
  ).lastInsertRowid;
  const e2 = insertEvent.run(
    'Modern Web & 3D Graphics Symposium',
    'Deep dive into Three.js, WebGL shaders, GSAP choreography, and accessible UI architecture.',
    'Workshop',
    'Computer Lab 1',
    futureDate(9),
    teacher1,
    80,
    'cyber'
  ).lastInsertRowid;
  insertEvent.run(
    'Inter-Department Robotics Showcase',
    'Live autonomous rover demonstrations, drone obstacle course, and hardware mentoring.',
    'Tech Club',
    'Sports Complex Pavilion',
    futureDate(14),
    student3,
    150,
    'nebula'
  );

  db.prepare('INSERT INTO event_registrations (event_id, user_id) VALUES (?, ?)').run(e1, student1);
  db.prepare('INSERT INTO event_registrations (event_id, user_id) VALUES (?, ?)').run(e2, student2);

  // Lost & Found
  const insertLF = db.prepare(`
    INSERT INTO lost_found (user_id, type, item_name, description, category, location, item_date, status, is_demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  insertLF.run(
    student1,
    'lost',
    'Matte Black Sony WH-1000XM5 Headphones',
    'Left inside a dark grey carrying case near the second-floor quiet reading tables.',
    'Electronics',
    'Central Library – 2nd Floor',
    new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    'open'
  );
  insertLF.run(
    student2,
    'found',
    'SilverTI-84 Plus Calculator & Lab ID',
    'Found on bench 4 after the afternoon Signals & Systems session. Handed to lab assistant.',
    'Accessories',
    'Computer Lab 3',
    new Date(Date.now() - 172800000).toISOString().slice(0, 10),
    'open'
  );

  // StudyHub Resources
  const insertRes = db.prepare(`
    INSERT INTO study_resources (user_id, title, subject, semester, description, file_url, file_name, file_size, downloads, is_demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const r1 = insertRes.run(
    teacher1,
    'Data Structures & Algorithms — Complete Revision Pack',
    'Data Structures',
    'Sem 3',
    'Concise notes covering Trees, Graph traversals, Dijkstra, and Dynamic Programming patterns.',
    '/uploads/sample-dsa-notes.pdf',
    'sample-dsa-notes.pdf',
    520,
    42
  ).lastInsertRowid;
  insertRes.run(
    student1,
    'Express.js & SQLite REST API Lab Manual',
    'Web Technologies',
    'Sem 5',
    'Step-by-step guide to building secure Express routes, middleware, and SQLite queries.',
    '/uploads/sample-dsa-notes.pdf',
    'sample-dsa-notes.pdf',
    520,
    29
  );
  db.prepare('INSERT INTO resource_bookmarks (resource_id, user_id) VALUES (?, ?)').run(r1, student1);

  // Student Skills & Project Ideas
  const insertSkill = db.prepare('INSERT INTO student_skills (user_id, skill_name, skill_type, proficiency) VALUES (?, ?, ?, ?)');
  insertSkill.run(student1, 'Node.js', 'technical', 'Advanced');
  insertSkill.run(student1, 'JavaScript', 'technical', 'Advanced');
  insertSkill.run(student1, 'SQLite', 'technical', 'Intermediate');
  insertSkill.run(student1, 'Public Speaking', 'non-technical', 'Intermediate');

  insertSkill.run(student2, 'UI/UX Design', 'technical', 'Advanced');
  insertSkill.run(student2, 'Three.js', 'technical', 'Intermediate');
  insertSkill.run(student2, 'CSS Grid & Motion', 'technical', 'Advanced');
  insertSkill.run(student2, 'Product Strategy', 'non-technical', 'Intermediate');

  insertSkill.run(student3, 'Python', 'technical', 'Advanced');
  insertSkill.run(student3, 'Embedded IoT', 'technical', 'Advanced');
  insertSkill.run(student3, 'Team Leadership', 'non-technical', 'Advanced');

  db.prepare(`
    INSERT INTO project_ideas (user_id, title, description, needed_skills, status, is_demo)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(
    student1,
    'Smart Lab Occupancy Tracker',
    'Real-time dashboard showing free workstations across campus computer labs using lightweight sensors.',
    'UI/UX Design, Embedded IoT, Three.js',
    'Recruiting'
  );

  // Badges & Quests
  const insertBadge = db.prepare('INSERT INTO badges (slug, name, description, xp_reward, icon) VALUES (?, ?, ?, ?, ?)');
  const b1 = insertBadge.run('event-explorer', 'Event Explorer', 'Registered for your first campus event.', 50, 'calendar-check').lastInsertRowid;
  insertBadge.run('team-player', 'Team Player', 'Sent or accepted a SkillSphere collaboration request.', 60, 'users');
  insertBadge.run('knowledge-sharer', 'Knowledge Sharer', 'Uploaded a verified study resource to StudyHub.', 75, 'book-open');
  insertBadge.run('campus-legend', 'Campus Legend', 'Reached 500+ XP across campus activities.', 100, 'trophy');
  insertBadge.run('innovation-master', 'Innovation Master', 'Shared a project idea on SkillSphere.', 80, 'sparkles');

  db.prepare('INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)').run(student1, b1);

  const insertQuest = db.prepare('INSERT INTO quests (slug, title, description, frequency, xp_reward, action_type) VALUES (?, ?, ?, ?, ?, ?)');
  insertQuest.run('daily-pulse', 'Share on Campus Pulse', 'Publish a post or comment on Campus Pulse.', 'daily', 25, 'post');
  insertQuest.run('daily-study', 'Explore StudyHub', 'Bookmark or download a study resource.', 'daily', 20, 'resource');
  insertQuest.run('weekly-event', 'Join a Campus Event', 'Register for any upcoming campus event.', 'weekly', 60, 'event');
  insertQuest.run('weekly-collab', 'Connect on SkillSphere', 'Send a teammate collaboration request.', 'weekly', 75, 'collab');

  // Anonymous Feedback
  const insertFB = db.prepare('INSERT INTO anonymous_feedback (category, content, status, likes, is_demo) VALUES (?, ?, ?, ?, 1)');
  insertFB.run('Facilities', 'Extend Central Library quiet zone hours until 11 PM during mid-semester exam weeks.', 'Reviewed', 34);
  insertFB.run('Cafeteria', 'Add more healthy protein bowls and clearly labeled allergen tags at the main canteen.', 'Pending', 19);
  insertFB.run('IT & Wi-Fi', 'Wi-Fi signal in Auditorium Annex has improved significantly after the router upgrade!', 'Resolved', 27);

  // Marketplace
  const insertMarket = db.prepare(`
    INSERT INTO marketplace_items (user_id, title, description, category, price, condition, status, is_demo)
    VALUES (?, ?, ?, ?, ?, ?, 'available', 1)
  `);
  insertMarket.run(
    student2,
    'Designing Data-Intensive Applications (Paperback)',
    'Clean copy with zero highlights. Essential reference for distributed systems.',
    'Books',
    450,
    'Like New'
  );
  insertMarket.run(
    student3,
    'Arduino Uno R4 + Sensor Starter Kit',
    'Complete kit with breadboard, ultrasonic sensor, jumper wires, and case.',
    'Electronics',
    850,
    'Good'
  );

  // Tasks & Notifications for demo student
  db.prepare('INSERT INTO tasks (user_id, title, due_date, completed) VALUES (?, ?, ?, 0)').run(
    student1,
    'Submit Web Technologies Lab 12 Report',
    futureDate(2).slice(0, 10)
  );
  db.prepare('INSERT INTO tasks (user_id, title, due_date, completed) VALUES (?, ?, ?, 0)').run(
    student1,
    'Finalize HackNight team skills on SkillSphere',
    futureDate(4).slice(0, 10)
  );

  db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(
    student1,
    'Welcome to UniVerse 3.0',
    'Your demo student account is active. Explore events, StudyHub, and Campus Quest!'
  );
}

module.exports = { seedDatabase };
