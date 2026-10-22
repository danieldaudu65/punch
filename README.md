# PUNCH NextGen Quiz & Rewards

A mini quiz and rewards platform for young people: students register, take timed multiple-choice quizzes, earn XP and badges, and climb a leaderboard. Every score and reward is decided by the server, and a submission can only ever pay out once.

Built by **Daniel Success** for the PUNCH NextGen Full-Stack Web Developer pre-interview assessment.

- **Live demo:** `https://YOUR-APP.netlify.app` *(replace after deploying)*
- **Demo login:** `demo@example.com` / `DemoPass123`, or use the "Explore with the demo account" button on the login page. All accounts and data are fictitious.

---

## Contents

1. [Features by task](#features-by-task)
2. [Tech stack](#tech-stack)
3. [How scoring and rewards stay trustworthy](#how-scoring-and-rewards-stay-trustworthy)
4. [Project structure](#project-structure)
5. [API](#api)
6. [Running it locally](#running-it-locally)
7. [Tests](#tests)
8. [Deployment](#deployment)
9. [Design notes](#design-notes)
10. [Limitations and what I would do next](#limitations-and-what-i-would-do-next)
11. [Use of AI assistance](#use-of-ai-assistance)

---

## Features by task

| Task | What is implemented |
| --- | --- |
| **1. Registration and dashboard** | Register, log in, log out, session that survives a refresh. Dashboard shows the student's name, total XP, level and progress to the next level, quizzes completed, average score, leaderboard rank, all badges (earned and locked) and recent attempts. |
| **2. Quiz system** | 3 quizzes of 10 multiple-choice questions (Nigeria general knowledge, digital skills, financial literacy). One question at a time, 5-minute timer, keyboard shortcuts, review step that highlights blank questions, automatic submit when time runs out. Scored on the server; results show every question with the student's answer, the correct answer and an explanation. Every attempt and its answers are saved. Repeat submissions never earn duplicate rewards. |
| **3. Gamification** | 10 XP per correct answer plus a 25 XP perfect-score bonus. 5 levels (Rookie to Legend). 5 badges: First Steps, Perfect Score, Speed Run, Sharp Shooter, All-Rounder. Leaderboard with a top-3 podium, shared ranks for ties, and the student's own position always shown. XP, badges, level and rank update automatically, in the same database transaction as the submit. |
| **4. Back end, database, security** | Express + MongoDB. bcrypt passwords, JWT in an httpOnly cookie, rate-limited login, validation on every request, ownership checks on every attempt, server-side scoring and rewards, four layers of duplicate protection, specific error codes for each failure, layered project structure. 85 automated tests. |
| **5. UX and documentation** | Responsive layouts for phones and desktop, with a bottom tab bar on phones. Clear feedback throughout the quiz, accessible forms and quiz controls, visible keyboard focus, "reduce motion" respected. This README. |

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Server | Node.js 22, Express 5, TypeScript | Express 5 catches errors from async handlers, so there is no try/catch in controllers. TypeScript catches mistakes before runtime. |
| Database | MongoDB Atlas + Mongoose | Unique indexes and multi-document transactions give database-level guarantees against duplicate rewards. |
| Validation | Zod | One schema validates and types each request body and the environment variables. |
| Auth | bcrypt + JWT in an httpOnly, SameSite cookie | JavaScript cannot read the token, so an XSS bug cannot steal sessions. |
| Client | React 18, Vite, TypeScript, React Router | Fast dev server and build; typed end to end. |
| Data fetching | TanStack React Query | Caching, loading and error states in one place; never auto-retries a write. |
| Motion | Framer Motion | Springs and sequenced animation for the 3D coin, quiz transitions and results celebration. |
| Styling | Hand-written CSS with design tokens | A small token file where every colour has one job; no framework to configure. |
| Tests | Vitest, Supertest, mongodb-memory-server | Real HTTP requests against a real, in-memory MongoDB replica set. |
| Hosting | Render (API), Netlify (client), MongoDB Atlas | Free tiers; Netlify proxies `/api` to Render so cookies stay same-origin. |

---

## How scoring and rewards stay trustworthy

This is the core of the assessment, so it is worth spelling out.

**The browser never sees the answers.** Starting a quiz returns questions without `correctIndex` or explanations. The client only ever sends which option was picked for each question. It never sends a score, a time or an XP amount, and any extra fields are stripped by validation.

**The server grades and pays.** On submit, the server:

1. checks the attempt exists (404), belongs to the student (403) and is still open (409);
2. rejects answers to questions outside the quiz, the same question answered twice, or options that do not exist (400);
3. checks the time limit plus 60 seconds of grace for slow networks, timed from when the server started the attempt;
4. grades against the answers stored in the database;
5. inside **one transaction**: marks the attempt submitted, decides whether this is the first completion, adds XP, and awards any new badges. If any step fails, none of it is saved.

**Duplicate rewards are blocked in four layers:**

| Layer | Stops |
| --- | --- |
| Status check before grading | Re-submitting a finished attempt (`409 ATTEMPT_ALREADY_SUBMITTED`) |
| Update only where `status: "in_progress"` | Two submits of the same attempt at the same instant: only one can switch it |
| Unique index `one_reward_per_quiz` | Two different attempts of the same quiz both being rewarded |
| Unique index `one_open_attempt_per_quiz` | Spamming "start" to open many attempts |

**Retakes are practice.** Students can retake any quiz to learn; it is scored and reviewed but pays 0 XP, so the leaderboard cannot be farmed.

Each of these rules has an automated test, including one that fires two submits simultaneously and checks XP is paid exactly once.

---

## Project structure

```
punch-nextgen-quiz/
├── server/                     Express API
│   ├── src/
│   │   ├── config/             env validation (fails fast), database connection
│   │   ├── models/             User, Quiz, Attempt (+ unique indexes)
│   │   ├── validators/         Zod schemas for request bodies
│   │   ├── middleware/         requireAuth, validateBody, central error handler
│   │   ├── routes/             URL → controller wiring
│   │   ├── controllers/        read the request, call a service, send the response
│   │   ├── services/           business logic
│   │   │   ├── scoring.ts      pure: grade answers, calculate XP
│   │   │   ├── badges.ts       pure: badge rules
│   │   │   ├── levels.ts       pure: level thresholds
│   │   │   └── *.service.ts    database work: attempts, gamification, leaderboard, dashboard
│   │   ├── seed/               3 quizzes, demo login, 8 fictitious demo students
│   │   ├── app.ts              builds the Express app (imported by tests)
│   │   └── server.ts           connects the database and listens
│   ├── tests/                  unit + API tests
│   └── requests.http           manual requests for the VS Code REST Client
├── client/                     React app
│   └── src/
│       ├── lib/                API client, types, React Query setup
│       ├── features/           auth, quiz, dashboard, results, leaderboard
│       ├── components/         shared building blocks (3D coin, buttons, fields)
│       ├── layouts/            auth layout, app shell with navigation
│       ├── pages/              one file per route
│       └── styles/             tokens.css plus one stylesheet per area
├── render.yaml                 Render Blueprint for the API
└── .github/workflows/          CI: type check and tests on every push
```

Business rules that do not need the database (`scoring.ts`, `badges.ts`, `levels.ts`) are pure functions, so they are easy to read, unit-test, and reuse in the seed script.

---

## API

All responses are JSON. Success is `{ "data": … }`; failure is `{ "error": { "code", "message", "details?" } }`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Create an account and start a session |
| POST | `/api/auth/login` | No | Log in |
| POST | `/api/auth/logout` | No | End the session |
| GET | `/api/auth/me` | Yes | Current student |
| GET | `/api/quizzes` | Yes | Published quizzes with the student's progress (no answers) |
| POST | `/api/quizzes/:quizId/attempts` | Yes | Start a quiz, or resume the open attempt |
| POST | `/api/attempts/:attemptId/submit` | Yes | Submit answers; server grades and rewards |
| GET | `/api/attempts/:attemptId` | Yes (owner) | A past result with the full review |
| GET | `/api/attempts` | Yes | The student's recent attempts |
| GET | `/api/dashboard` | Yes | Everything the dashboard shows, in one call |
| GET | `/api/leaderboard?limit=10` | Yes | Top students plus the caller's own rank (no emails) |
| GET | `/api/badges` | Yes | All badges and how to earn them |

| Status | Code | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR`, `BAD_REQUEST` | Invalid body, malformed id, bad answers, invalid JSON |
| 401 | `UNAUTHORIZED` | No session, expired or forged token, wrong login |
| 403 | `FORBIDDEN` | Someone else's attempt |
| 404 | `NOT_FOUND` | Unknown route, quiz or attempt |
| 409 | `CONFLICT` | Email already registered |
| 409 | `ATTEMPT_ALREADY_SUBMITTED`, `ATTEMPT_EXPIRED`, `ATTEMPT_NOT_SUBMITTED`, `REWARD_ALREADY_CLAIMED` | Quiz flow conflicts, each with its own code so the client can react correctly |
| 413 | `PAYLOAD_TOO_LARGE` | Body over 10 KB |
| 429 | `TOO_MANY_REQUESTS` | More than 20 login/register attempts in 15 minutes from one IP |
| 500 | `INTERNAL_ERROR` | Unexpected error (details logged on the server only) |

---

## Running it locally

**You need:** Node.js 20 or newer, and a MongoDB Atlas cluster (the free tier works). Atlas is needed because submitting uses a transaction, which requires a replica set.

**1. Server**

```bash
cd server
npm install
cp .env.example .env        # then fill in MONGODB_URI and JWT_SECRET
npm run seed                # 3 quizzes, demo login, 8 demo students (safe to re-run)
npm run dev                 # http://localhost:4000
```

Generate a `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**2. Client** (in a second terminal)

```bash
cd client
npm install
npm run dev                 # http://localhost:5173
```

The client needs no `.env`: Vite forwards `/api` to `localhost:4000`.

| Variable | Required | Meaning |
| --- | --- | --- |
| `MONGODB_URI` | Yes | Atlas connection string |
| `JWT_SECRET` | Yes | At least 32 characters; signs session tokens |
| `CLIENT_ORIGIN` | No | Client URL for CORS. Default `http://localhost:5173` |
| `PORT` | No | Default 4000 |
| `NODE_ENV` | No | `development`, `test` or `production` |
| `TRUST_PROXY_HOPS` | No | Proxies in front of the API. Default 1; 2 on Render behind Netlify |

---

## Tests

```bash
cd server
npm test
```

85 tests. The first run downloads a MongoDB binary (about 100 MB).

| Suite | Tests | Covers |
| --- | --- | --- |
| `unit/scoring` | 14 | Grading, percentages, XP, rejecting invalid answers |
| `unit/gamification-rules` | 15 | Level thresholds, every badge rule |
| `api/auth` | 15 | Register, login, httpOnly cookie, bcrypt hash, tampered and forged tokens, logout |
| `api/quiz-flow` | 26 | Hidden answers, server scoring, double and simultaneous submits, retakes, ownership, time limit, history |
| `api/gamification` | 15 | Badges on submit, no duplicate badges, level up, dashboard, leaderboard ties and privacy |

API tests use an in-memory MongoDB replica set, so they run real transactions and never touch real data. GitHub Actions runs the type check and all tests on every push.

---

## Deployment

1. **MongoDB Atlas:** under Network Access, allow `0.0.0.0/0` (Render's IPs change). Run `npm run seed` locally against the Atlas database once.
2. **Render (API):** New → Blueprint → this repository. `render.yaml` sets the build, start command, health check and a generated `JWT_SECRET`. Enter `MONGODB_URI`, and set `CLIENT_ORIGIN` to the Netlify URL.
3. **Netlify (client):** in `client/netlify.toml`, replace `REPLACE-WITH-YOUR-RENDER-NAME` with the Render service name and push. Then in Netlify: Add new site → Import an existing project → this repository, with **Base directory** `client`. The build command and publish folder come from `netlify.toml`.

Netlify proxies `/api/*` to Render, so the browser only ever talks to the Netlify domain. The session cookie is therefore first-party, which Safari and mobile browsers require.

---

## Design notes

- **Visual identity:** deep night-indigo instead of flat black, PUNCH red for anything pressable, gold only for rewards, mint and coral for right and wrong. Bricolage Grotesque for headings and Figtree for text.
- **Signature element:** a gold XP coin built with CSS 3D transforms (14 stacked discs form its rim). It tilts toward the pointer, and returns on the dashboard and results screen. No WebGL, so it stays smooth on low-end phones.
- **Tactile controls:** buttons and answer cards have a thick bottom edge and press down, like game buttons.
- **Motion with purpose:** one entrance on the login page; a single sequenced celebration after a quiz (coin, count-up, level-up, badges) that plays only once; everything else responds to the student's actions. All motion stops when "reduce motion" is on.
- **Focus mode:** no navigation while a quiz runs.
- **Accessibility:** labelled fields with linked errors, focus moves to the first error, answers are a radio group, the timer announces only in the last 30 seconds, visible keyboard focus everywhere.

---

## Limitations and what I would do next

- **No admin screen.** Quizzes are loaded by the seed script. Next: an admin role with quiz CRUD.
- **No email verification or password reset.**
- **Answers in progress are saved per browser tab** (`sessionStorage`), not across devices. The attempt itself resumes on any device, but the picks would need saving on the server.
- **The timer keeps running if the student leaves**, by design, since the server owns the clock.
- **Badges can be earned on practice retakes** (for example Speed Run on a quiz the student has seen). XP cannot.
- **New badge rules apply at the next submit**, not retroactively.
- **The leaderboard is all-time only**, capped at the top 50. Next: weekly boards and pagination.
- **Rate limiting is per IP and in memory.** Several app instances would need a shared store such as Redis.
- **No automated front-end tests.** The server has 85; next would be React Testing Library for the quiz flow and Playwright end to end.
- **Render's free tier sleeps** after inactivity, so the first request can take up to a minute.

---

## Use of AI assistance

As the assessment allows, I used Claude (Anthropic) as an AI pair-programmer throughout this project, for planning, writing and reviewing code, writing tests and drafting this README. I set the direction, made the product and design decisions, and reviewed the work stage by stage.

My contributions:

- Broke the brief into a staged plan (server first, then client) and reviewed each stage before moving on.
- Chose the stack and the product decisions: three Nigerian-themed quizzes, XP only on a first completion, five badges, a leaderboard with shared ranks.
- Directed the visual identity and took it past the brief: the 3D coin, tilt cards, motion and sound effects.
- Ran and tested the app locally, found bugs and got them fixed. For example, the demo login failed because the account only existed after seeding; it is now created automatically on startup.
- Deployed the API to Render and the client to Netlify.
- Can explain any part of the code, including the server-side scoring and the four layers of duplicate-reward protection.
