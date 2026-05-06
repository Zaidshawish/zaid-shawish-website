# Zaid Shawish — Personal Portfolio Website
**Full Stack: Node.js + Express + SQLite**

---

## 🚀 Quick Start on Replit

### Step 1: Import Project
1. Go to [replit.com](https://replit.com) and sign up/login
2. Click **+ Create Repl**
3. Choose **"Import from ZIP"** (or upload files manually)
4. Upload the `zaid-shawish-website.zip` file

### Step 2: Install Dependencies
In the Replit Shell tab, run:
```bash
npm install
```

### Step 3: Run the Server
Click the **▶ Run** button — or in Shell:
```bash
node server.js
```

### Step 4: Access Your Site
- **Public Site:** `https://your-repl-name.your-username.repl.co`
- **Admin Panel:** `https://your-repl-name.your-username.repl.co/admin`

---

## 🔐 Default Login
| Field | Value |
|-------|-------|
| Username | `zaid` |
| Password | `1977` |

> ⚠️ **Change your password immediately** after first login via Admin → Change Password

---

## 📁 Project Structure
```
zaid-shawish-website/
├── server.js              # Main server entry
├── package.json           # Dependencies
├── .env                   # Environment variables
├── db/
│   └── database.js        # SQLite setup & seed data
├── middleware/
│   └── auth.js            # JWT auth + brute force protection
├── routes/
│   ├── api.js             # Public API (projects, articles, etc.)
│   └── adminApi.js        # Admin API (all CRUD operations)
└── public/
    ├── index.html         # Main public website
    ├── admin.html         # Admin panel
    └── uploads/           # Uploaded media files
```

---

## 🗄️ Database Tables
| Table | Description |
|-------|-------------|
| `users` | Admin accounts |
| `settings` | All site settings |
| `projects` | Portfolio projects |
| `articles` | Blog posts |
| `comments` | Article comments |
| `skills` | Skills with levels |
| `timeline` | Career timeline |
| `messages` | Contact form inbox |
| `media` | Uploaded files |
| `login_attempts` | Brute force tracking |

---

## 🔧 Environment Variables (.env)
```
PORT=3000
JWT_SECRET=your_very_secret_key_here
```
> On Replit, add these in **Secrets** tab (🔒 icon) instead of .env file

---

## 🌐 Keep Replit Alive (Free)
Replit free tier sleeps after inactivity. To keep it awake:
1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Add HTTP monitor pointing to your Replit URL
3. Set interval to 5 minutes — **free forever**

---

## 📦 Admin Panel Features
- **Dashboard** — Stats overview, recent messages & comments
- **Projects** — Full CRUD with featured toggle, GitHub/Demo links
- **Articles** — Blog management with draft/publish workflow
- **Comments** — Approve / delete with pending review system
- **Skills** — Skill bars with level management
- **Timeline** — Career highlights management
- **Messages** — Contact form inbox
- **Media** — File upload with drag & drop, copy path
- **Settings** — Full site customization (title, SEO, contact info, CV URL, stats)
- **Password** — Secure password change

---

## 🛡️ Security Features
- JWT authentication (24h tokens)
- Brute force protection (5 attempts / 15 min lockout)
- Helmet.js security headers
- Rate limiting (200 req/15min global, 20 req/15min for login)
- bcrypt password hashing
- Input validation & sanitization
- SQL injection protection (parameterized queries)

---

*Built with ❤️ for Zaid Shawish — UAE 2025*
