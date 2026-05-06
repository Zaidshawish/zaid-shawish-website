const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET settings
router.get('/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = {};
  rows.forEach(r => s[r.key] = r.value);
  res.json(s);
});

// GET projects
router.get('/projects', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY featured DESC, created_at DESC').all();
  projects.forEach(p => { try { p.tags = JSON.parse(p.tags); } catch { p.tags = []; } });
  res.json(projects);
});

// GET single project
router.get('/projects/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  try { p.tags = JSON.parse(p.tags); } catch { p.tags = []; }
  res.json(p);
});

// GET articles (published only)
router.get('/articles', (req, res) => {
  const { search, category, tag, page = 1, limit = 10 } = req.query;
  let query = "SELECT id,title,slug,excerpt,cover_image,tags,category,views,created_at FROM articles WHERE status='published'";
  const params = [];
  if (search) { query += ' AND (title LIKE ? OR excerpt LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (category) { query += ' AND category = ?'; params.push(category); }
  if (tag) { query += ' AND tags LIKE ?'; params.push(`%${tag}%`); }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
  const articles = db.prepare(query).all(...params);
  articles.forEach(a => { try { a.tags = JSON.parse(a.tags); } catch { a.tags = []; } });
  res.json(articles);
});

// GET single article
router.get('/articles/:slug', (req, res) => {
  const a = db.prepare("SELECT * FROM articles WHERE slug = ? AND status = 'published'").get(req.params.slug);
  if (!a) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE articles SET views = views + 1 WHERE id = ?').run(a.id);
  try { a.tags = JSON.parse(a.tags); } catch { a.tags = []; }
  const comments = db.prepare("SELECT id,author_name,content,created_at FROM comments WHERE article_id=? AND status='approved' ORDER BY created_at DESC").all(a.id);
  a.comments = comments;
  res.json(a);
});

// POST comment
router.post('/articles/:slug/comments', (req, res) => {
  const commentsEnabled = db.prepare("SELECT value FROM settings WHERE key='comments_enabled'").get()?.value;
  if (commentsEnabled !== '1') return res.status(403).json({ error: 'Comments disabled' });
  const article = db.prepare("SELECT id FROM articles WHERE slug=? AND status='published'").get(req.params.slug);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  const { author_name, author_email, content } = req.body;
  if (!author_name || !content) return res.status(400).json({ error: 'Name and content required' });
  if (content.length > 1000) return res.status(400).json({ error: 'Comment too long' });
  db.prepare('INSERT INTO comments (article_id, author_name, author_email, content) VALUES (?, ?, ?, ?)').run(article.id, author_name.substring(0, 100), author_email?.substring(0, 200), content.substring(0, 1000));
  res.json({ success: true, message: 'Comment submitted for review' });
});

// GET skills
router.get('/skills', (req, res) => {
  res.json(db.prepare('SELECT * FROM skills ORDER BY sort_order ASC, level DESC').all());
});

// GET timeline
router.get('/timeline', (req, res) => {
  res.json(db.prepare('SELECT * FROM timeline ORDER BY sort_order ASC').all());
});

// POST contact message
router.post('/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !message) return res.status(400).json({ error: 'Name and message are required' });
  if (message.length > 3000) return res.status(400).json({ error: 'Message too long' });
  db.prepare('INSERT INTO messages (name, email, subject, message) VALUES (?, ?, ?, ?)').run(
    name.substring(0, 200), email?.substring(0, 200), subject?.substring(0, 300), message.substring(0, 3000)
  );
  res.json({ success: true, message: 'Message received! Thank you.' });
});

module.exports = router;
