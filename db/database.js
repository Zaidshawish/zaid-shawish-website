const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'portfolio.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDB() {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Settings table
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- Skills table
    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      level INTEGER DEFAULT 80,
      category TEXT DEFAULT 'Technical',
      sort_order INTEGER DEFAULT 0
    );

    -- Timeline table
    CREATE TABLE IF NOT EXISTS timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0
    );

    -- Projects table
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      long_description TEXT,
      icon TEXT DEFAULT '🔧',
      image TEXT,
      tags TEXT DEFAULT '[]',
      status TEXT DEFAULT 'active',
      github_url TEXT,
      demo_url TEXT,
      featured INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Articles table
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      content TEXT,
      excerpt TEXT,
      cover_image TEXT,
      tags TEXT DEFAULT '[]',
      category TEXT DEFAULT 'General',
      status TEXT DEFAULT 'draft',
      views INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Comments table
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER,
      author_name TEXT NOT NULL,
      author_email TEXT,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    );

    -- Messages (Contact Form)
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      subject TEXT,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Media library
    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT,
      mimetype TEXT,
      size INTEGER,
      path TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Login attempts (brute force protection)
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default admin
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('zaid');
  if (!adminExists) {
    const hash = bcrypt.hashSync('1977', 10);
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('zaid', hash, 'admin');
    console.log('✅ Default admin created: zaid / 1977');
  }

  // Seed default settings
  const defaultSettings = {
    site_title: 'Zaid Shawish',
    site_subtitle: 'Education Developer & AI Systems Architect',
    site_description: 'Personal portfolio of Zaid Shawish — UAE-based education development expert and AI/hardware systems builder.',
    site_keywords: 'Zaid Shawish, education, AI, Arduino, UAE',
    cv_url: '',
    email: 'zaid@example.com',
    phone: '+971 — —',
    linkedin: 'linkedin.com/in/zaid-shawish',
    location: 'UAE — Warisan',
    stat1_num: '259K+', stat1_label: 'Students Assessed',
    stat2_num: '4', stat2_label: 'Active Projects',
    stat3_num: 'UAE', stat3_label: 'Based In',
    stat4_num: '10+', stat4_label: 'Years Exp.',
    about_text: 'I work in education development with a focus on integrated continuing education in the UAE — including academic-level assessment systems, institutional development for correctional facilities, and large-scale exam operations (259K+ students). Alongside this, I build AI/ML and hardware projects that solve real-world problems.',
    hero_tagline: 'Education Development Expert & AI Systems Architect — shaping the future of learning and intelligent technology across the UAE.',
    comments_enabled: '1',
    newsletter_enabled: '0'
  };

  const upsert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(defaultSettings)) upsert.run(k, v);

  // Seed default skills
  const skillCount = db.prepare('SELECT COUNT(*) as c FROM skills').get().c;
  if (skillCount === 0) {
    const skills = [
      ['Education Management', 95, 'Professional'],
      ['Project Planning', 90, 'Professional'],
      ['Arduino / Embedded', 85, 'Technical'],
      ['AI / Machine Learning', 75, 'Technical'],
      ['Python', 70, 'Technical'],
      ['Computer Vision', 68, 'Technical'],
      ['C++', 65, 'Technical'],
      ['English', 72, 'Language']
    ];
    const ins = db.prepare('INSERT INTO skills (name, level, category, sort_order) VALUES (?, ?, ?, ?)');
    skills.forEach(([n, l, c], i) => ins.run(n, l, c, i));
  }

  // Seed default timeline
  const tlCount = db.prepare('SELECT COUNT(*) as c FROM timeline').get().c;
  if (tlCount === 0) {
    const tl = [
      ['2024+', 'مدرسة التمكين الأكاديمي', 'Led institutional development for correctional facility schools & integrated continuing education reform'],
      ['2023+', 'المراقب الذكي', 'Architecting an AI/ML live-video security system for high-security environments'],
      ['2022+', 'Hardware Projects', 'Smart Car Robot (ESP32/Arduino) + Frozen Logistics QC System'],
      ['2019+', 'Academic Assessment Lead', 'Managing large-scale academic assessment operations for 259K+ students']
    ];
    const ins = db.prepare('INSERT INTO timeline (year, title, description, sort_order) VALUES (?, ?, ?, ?)');
    tl.forEach(([y, t, d], i) => ins.run(y, t, d, i));
  }

  // Seed default projects
  const projCount = db.prepare('SELECT COUNT(*) as c FROM projects').get().c;
  if (projCount === 0) {
    const projects = [
      ['المراقب الذكي', 'AI/ML live-video security system detecting threats in sensitive environments.', '👁', '["AI/ML","Computer Vision","Python","Deep Learning"]', 'dev', 1],
      ['Smart Car Robot', 'Arduino + ESP32 camera smart car with autonomous navigation.', '🤖', '["Arduino","ESP32","C++","Robotics"]', 'active', 1],
      ['Frozen Logistics QC', 'Arduino-based quality control for frozen-product logistics.', '❄️', '["Arduino","IoT","Sensors","C++"]', 'active', 0],
      ['مدرسة التمكين الأكاديمي', 'Integrated continuing education for correctional facilities.', '📚', '["Education","SwiftAssess","Administration"]', 'active', 1]
    ];
    const ins = db.prepare('INSERT INTO projects (title, description, icon, tags, status, featured) VALUES (?, ?, ?, ?, ?, ?)');
    projects.forEach(p => ins.run(...p));
  }

  console.log('✅ Database initialized');
}

initDB();
module.exports = db;
