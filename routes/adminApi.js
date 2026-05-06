const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { requireAuthAPI, checkBruteForce, recordFailedAttempt, clearAttempts, JWT_SECRET } = require('../middleware/auth');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|pdf|zip|doc|docx/;
  cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
}});

// ===== AUTH =====
router.post('/login', checkBruteForce, async (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    recordFailedAttempt(req.ip);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  clearAttempts(req.ip);
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  res.cookie('admin_token', token, { httpOnly: true, maxAge: 86400000, sameSite: 'strict' });
  res.json({ success: true, token });
});

router.post('/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ success: true });
});

router.get('/me', requireAuthAPI, (req, res) => res.json(req.user));

// ===== SETTINGS =====
router.get('/settings', requireAuthAPI, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = {};
  rows.forEach(r => s[r.key] = r.value);
  res.json(s);
});

router.put('/settings', requireAuthAPI, (req, res) => {
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const update = db.transaction((data) => {
    for (const [k, v] of Object.entries(data)) upsert.run(k, String(v));
  });
  update(req.body);
  res.json({ success: true });
});

// ===== PROJECTS =====
router.get('/projects', requireAuthAPI, (req, res) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  projects.forEach(p => { try { p.tags = JSON.parse(p.tags); } catch { p.tags = []; } });
  res.json(projects);
});

router.post('/projects', requireAuthAPI, (req, res) => {
  const { title, description, long_description, icon, tags, status, github_url, demo_url, featured } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const result = db.prepare('INSERT INTO projects (title,description,long_description,icon,tags,status,github_url,demo_url,featured) VALUES (?,?,?,?,?,?,?,?,?)').run(title, description, long_description, icon || '🔧', JSON.stringify(tags || []), status || 'active', github_url, demo_url, featured ? 1 : 0);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/projects/:id', requireAuthAPI, (req, res) => {
  const { title, description, long_description, icon, tags, status, github_url, demo_url, featured } = req.body;
  db.prepare('UPDATE projects SET title=?,description=?,long_description=?,icon=?,tags=?,status=?,github_url=?,demo_url=?,featured=? WHERE id=?').run(title, description, long_description, icon || '🔧', JSON.stringify(tags || []), status, github_url, demo_url, featured ? 1 : 0, req.params.id);
  res.json({ success: true });
});

router.delete('/projects/:id', requireAuthAPI, (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== ARTICLES =====
router.get('/articles', requireAuthAPI, (req, res) => {
  const articles = db.prepare('SELECT id,title,slug,category,status,views,created_at FROM articles ORDER BY created_at DESC').all();
  res.json(articles);
});

router.get('/articles/:id', requireAuthAPI, (req, res) => {
  const a = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  try { a.tags = JSON.parse(a.tags); } catch { a.tags = []; }
  res.json(a);
});

function slugify(text) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '').replace(/\-\-+/g, '-').substring(0, 100);
}

router.post('/articles', requireAuthAPI, (req, res) => {
  const { title, content, excerpt, cover_image, tags, category, status } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  let slug = slugify(title);
  const existing = db.prepare('SELECT id FROM articles WHERE slug = ?').get(slug);
  if (existing) slug += '-' + Date.now();
  const result = db.prepare('INSERT INTO articles (title,slug,content,excerpt,cover_image,tags,category,status) VALUES (?,?,?,?,?,?,?,?)').run(title, slug, content, excerpt, cover_image, JSON.stringify(tags || []), category || 'General', status || 'draft');
  res.json({ success: true, id: result.lastInsertRowid, slug });
});

router.put('/articles/:id', requireAuthAPI, (req, res) => {
  const { title, content, excerpt, cover_image, tags, category, status } = req.body;
  db.prepare('UPDATE articles SET title=?,content=?,excerpt=?,cover_image=?,tags=?,category=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(title, content, excerpt, cover_image, JSON.stringify(tags || []), category, status, req.params.id);
  res.json({ success: true });
});

router.delete('/articles/:id', requireAuthAPI, (req, res) => {
  db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== COMMENTS =====
router.get('/comments', requireAuthAPI, (req, res) => {
  const comments = db.prepare('SELECT c.*,a.title as article_title FROM comments c LEFT JOIN articles a ON c.article_id=a.id ORDER BY c.created_at DESC').all();
  res.json(comments);
});

router.put('/comments/:id', requireAuthAPI, (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE comments SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

router.delete('/comments/:id', requireAuthAPI, (req, res) => {
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== MESSAGES =====
router.get('/messages', requireAuthAPI, (req, res) => {
  res.json(db.prepare('SELECT * FROM messages ORDER BY created_at DESC').all());
});

router.put('/messages/:id/read', requireAuthAPI, (req, res) => {
  db.prepare('UPDATE messages SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.delete('/messages/:id', requireAuthAPI, (req, res) => {
  db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== SKILLS =====
router.get('/skills', requireAuthAPI, (req, res) => res.json(db.prepare('SELECT * FROM skills ORDER BY sort_order ASC').all()));

router.post('/skills', requireAuthAPI, (req, res) => {
  const { name, level, category } = req.body;
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM skills').get().m || 0;
  const result = db.prepare('INSERT INTO skills (name, level, category, sort_order) VALUES (?, ?, ?, ?)').run(name, level || 80, category || 'Technical', maxOrder + 1);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/skills/:id', requireAuthAPI, (req, res) => {
  const { name, level, category } = req.body;
  db.prepare('UPDATE skills SET name=?, level=?, category=? WHERE id=?').run(name, level, category, req.params.id);
  res.json({ success: true });
});

router.delete('/skills/:id', requireAuthAPI, (req, res) => {
  db.prepare('DELETE FROM skills WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== TIMELINE =====
router.get('/timeline', requireAuthAPI, (req, res) => res.json(db.prepare('SELECT * FROM timeline ORDER BY sort_order ASC').all()));

router.post('/timeline', requireAuthAPI, (req, res) => {
  const { year, title, description } = req.body;
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM timeline').get().m || 0;
  const result = db.prepare('INSERT INTO timeline (year, title, description, sort_order) VALUES (?, ?, ?, ?)').run(year, title, description, maxOrder + 1);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/timeline/:id', requireAuthAPI, (req, res) => {
  const { year, title, description } = req.body;
  db.prepare('UPDATE timeline SET year=?, title=?, description=? WHERE id=?').run(year, title, description, req.params.id);
  res.json({ success: true });
});

router.delete('/timeline/:id', requireAuthAPI, (req, res) => {
  db.prepare('DELETE FROM timeline WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== MEDIA =====
router.get('/media', requireAuthAPI, (req, res) => res.json(db.prepare('SELECT * FROM media ORDER BY created_at DESC').all()));

router.post('/media/upload', requireAuthAPI, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const result = db.prepare('INSERT INTO media (filename, original_name, mimetype, size, path) VALUES (?, ?, ?, ?, ?)').run(req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, '/uploads/' + req.file.filename);
  res.json({ success: true, id: result.lastInsertRowid, path: '/uploads/' + req.file.filename, filename: req.file.filename });
});

router.delete('/media/:id', requireAuthAPI, (req, res) => {
  const media = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
  if (!media) return res.status(404).json({ error: 'Not found' });
  const filePath = path.join(__dirname, '../public/uploads', media.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare('DELETE FROM media WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== USERS / PASSWORD =====
router.put('/change-password', requireAuthAPI, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!new_password || new_password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!(await bcrypt.compare(current_password, user.password))) return res.status(401).json({ error: 'Current password incorrect' });
  const hash = await bcrypt.hash(new_password, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ success: true });
});

// ===== DASHBOARD STATS =====
router.get('/dashboard', requireAuthAPI, (req, res) => {
  res.json({
    projects: db.prepare('SELECT COUNT(*) as c FROM projects').get().c,
    articles: db.prepare('SELECT COUNT(*) as c FROM articles').get().c,
    messages: db.prepare("SELECT COUNT(*) as c FROM messages WHERE is_read=0").get().c,
    comments: db.prepare("SELECT COUNT(*) as c FROM comments WHERE status='pending'").get().c,
    media: db.prepare('SELECT COUNT(*) as c FROM media').get().c,
    recent_messages: db.prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT 5').all(),
    recent_comments: db.prepare("SELECT c.*,a.title as article_title FROM comments c LEFT JOIN articles a ON c.article_id=a.id WHERE c.status='pending' LIMIT 5").all()
  });
});

module.exports = router;
