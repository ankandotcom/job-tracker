# TrackMyJobs

A full-stack job application tracker with AI-powered **JD auto-fill** and **Resume gap analyser**, built with Node.js, Express, PostgreSQL, and Google Gemini API.

**[Live Demo Link →](https://job-tracker-19el.onrender.com)**


## Tech stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | HTML · Tailwind-inspired CSS · JS  |
| Backend    | Node.js · Express                        |
| Database   | PostgreSQL                               |
| Auth       | JWT (access + refresh tokens, httpOnly cookie) |
| AI         | GEMINNI API |

---

## Project structure

```
job-tracker/
├── server.js                  # Express entry point
├── db/
│   ├── index.js               # pg connection pool
│   └── schema.sql             # All tables, enums, indexes, triggers
├── middleware/
│   ├── auth.js                # JWT authGuard
│   ├── rateLimit.js           # Auth / API / AI rate limiters
│   └── validate.js            # Zod validation factory
├── routes/
│   ├── auth.js                # /api/auth/*
│   ├── applications.js        # /api/applications/*
│   ├── users.js               # /api/user/*
│   ├── stats.js               # /api/stats
│   └── ai.js                  # /api/ai/parse-jd  /api/ai/gap-analysis/:id
├── services/
│   ├── authService.js         # bcrypt · JWT sign/verify
│   ├── applicationService.js  # CRUD + status history
│   ├── userService.js         # Profile + resume text
│   ├── statsService.js        # Dashboard aggregates
│   └── aiService.js           # callClaude() · parseJobDescription() · analyseGap()
└── public/
    ├── index.html             # Login / Register
    ├── dashboard.html         # Stats overview
    ├── applications.html      # List with filters
    ├── application-form.html  # Add / Edit + JD auto-fill
    ├── application-detail.html# Detail + Gap analyser
    ├── profile.html           # Name + resume editor
    ├── css/app.css
    └── js/
        ├── api.js             # Fetch wrapper, token manager, helpers
        └── nav.js             # Shared nav bar
```

---

## Setup

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 2. Clone and install

```bash
git clone <repo>
cd job-tracker
npm install
```

### 3. Environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/job_tracker
JWT_ACCESS_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_REFRESH_SECRET=<generate same way>
GEMINI_API_KEY=sk-ant-...
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

### 4. Create the database

```bash
createdb job_tracker
psql -d job_tracker -f db/schema.sql
```

### 5. Run

```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

Open [http://localhost:3000](http://localhost:3000)

---

## AI features

### JD auto-fill
On the **Add application** form, click **Paste JD**, paste a raw job description, and click **Extract fields**. The AI fills in company, role, salary range, location, key skills, and employment type.

**Endpoint:** `POST /api/ai/parse-jd`  
**Body:** `{ "jdText": "..." }`  
**Returns:** `{ company, role, salary_range, location, skills, employment_type }`

### Resume gap analyser
On any **application detail** page, click **Analyse fit**. The AI compares your saved resume against the job and returns a fit score (1–10), matched strengths, missing skills, and specific resume rewrite suggestions. The score is saved back to the application record.

**Prerequisite:** Save your resume text on the **Profile** page.

**Endpoint:** `POST /api/ai/gap-analysis/:id`  
**Returns:** `{ score, verdict, summary, strengths, gaps, rewrites }`

---

## API reference

### Auth
| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | `{name, email, password}` | Create account |
| POST | `/api/auth/login` | `{email, password}` | Returns access token + sets refresh cookie |
| POST | `/api/auth/refresh` | — | Rotates tokens using httpOnly cookie |
| POST | `/api/auth/logout` | — | Clears refresh token |

### Applications
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/applications` | List (supports `?status=&sort=&order=`) |
| GET | `/api/applications/:id` | Single app with status history |
| POST | `/api/applications` | Create |
| PUT | `/api/applications/:id` | Update |
| DELETE | `/api/applications/:id` | Delete |

### User
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/user/me` | Get profile |
| PUT | `/api/user/profile` | Update name |
| PUT | `/api/user/resume` | Save resume text |

### Stats
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stats` | Status breakdown, weekly timeline, top companies |

### AI
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai/parse-jd` | JD auto-fill |
| POST | `/api/ai/gap-analysis/:id` | Resume gap analysis + score |

---

## Security notes

- Passwords hashed with bcrypt (12 rounds)
- Access tokens expire in 15 minutes
- Refresh tokens rotate on every use and are stored in DB — logout invalidates immediately
- All `/api/*` routes rate-limited; AI routes have a tighter limit (10 req/min) for cost control
- `user_id` enforced on every DB query — users can never access each other's data
- Helmet sets security headers on every response
