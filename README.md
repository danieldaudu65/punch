# PUNCH NextGen Quiz & Rewards

A quiz and rewards app for students. People register, take timed multiple-choice quizzes, earn XP and badges, and compete on a leaderboard. Scores and rewards are always decided by the server, and a submission can only pay out once.

Built by Daniel Success for the PUNCH NextGen Full-Stack Web Developer assessment.

- **Live site:** https://punch-quiz-daniel.netlify.app
- **Demo login:** `demo@example.com` / `DemoPass123` (or the "Explore with the demo account" button). All data is fictitious.
- **API health check:** https://punch-gonf.onrender.com/api/health

The API runs on Render's free plan and sleeps when idle, so the first request after a quiet period can take up to a minute.

## What it does

| Task | Implemented |
| --- | --- |
| Registration and dashboard | Register, log in, log out, session survives a refresh. Dashboard shows name, XP, level and progress, quizzes completed, average score, rank, all badges and recent attempts. |
| Quiz system | 3 quizzes of 10 questions. One question at a time, 5-minute timer, keyboard shortcuts, a review step before submitting, auto-submit at zero. Graded on the server. Results show every answer with an explanation. All attempts are stored. |
| Gamification | 10 XP per correct answer, +25 for a perfect score. 5 levels. 5 badges (First Steps, Perfect Score, Speed Run, Sharp Shooter, All-Rounder). Leaderboard with shared ranks for ties and the student's own row always visible. |
| Back end and security | Express and MongoDB. bcrypt, JWT in an httpOnly cookie, rate-limited login, Zod validation on every request, ownership checks, server-side scoring, duplicate-reward protection, consistent error codes. 85 automated tests. |
| UX and docs | Works on phones and desktop, keyboard and screen-reader friendly, respects "reduce motion", sound effects and background music with a mute button. |

## Stack

| Layer | Choice |
| --- | --- |
| Server | Node 22, Express 5, TypeScript |
| Database | MongoDB Atlas with Mongoose (unique indexes and transactions) |
| Validation | Zod |
| Auth | bcrypt, JWT in an httpOnly cookie |
| Client | React 18, Vite, TypeScript, React Router, TanStack Query, Framer Motion |
| Styling | Plain CSS with design tokens |
| Tests | Vitest, Supertest, mongodb-memory-server |
| Hosting | Render (API), Netlify (client), Atlas (database) |

## How scoring stays trustworthy

- Starting a quiz returns the questions without the correct answers. The client only sends which option was picked for each question. It never sends a score, a time or an XP value, and extra fields are stripped.
- On submit the server checks that the attempt exists, belongs to the student and is still open, validates every answer, checks the time limit (5 minutes plus 60 seconds of grace), grades against the stored answers, then in one transaction marks the attempt submitted, adds XP if this is the first completion of that quiz, and awards new badges.
- Duplicate rewards are blocked in four places: a status check, an update that only matches `status: "in_progress"`, a unique index allowing one rewarded attempt per student per quiz, and a unique index allowing one open attempt per student per quiz.
- Retakes are allowed as practice. They are scored and reviewed but pay no XP.

## Project structure

```
server/
  src/
    config/        env validation, database connection
    models/        User, Quiz, Attempt
    validators/    Zod schemas
    middleware/    requireAuth, validateBody, error handler
    routes/        URL to controller
    controllers/   read the request, call a service, send the response
    services/      business rules (scoring, levels and badges are pure functions)
    seed/          quizzes, demo account, demo students
    app.ts         builds the Express app (used by tests)
    server.ts      connects the database and listens
  tests/           unit and API tests
client/
  src/
    lib/           API client, sound engine, types
    features/      auth, quiz, dashboard, results, leaderboard
    components/    shared UI
    layouts/ pages/ styles/
  public/          icons, link-preview image, _redirects
render.yaml        Render Blueprint
```

## API

Success responses are `{ "data": ... }`. Errors are `{ "error": { "code", "message", "details?" } }`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Create an account |
| POST | `/api/auth/login` | No | Log in |
| POST | `/api/auth/logout` | No | Log out |
| GET | `/api/auth/me` | Yes | Current student |
| GET | `/api/quizzes` | Yes | Quizzes with the student's progress |
| POST | `/api/quizzes/:quizId/attempts` | Yes | Start or resume an attempt |
| POST | `/api/attempts/:attemptId/submit` | Yes | Submit answers |
| GET | `/api/attempts/:attemptId` | Yes (owner) | A past result with review |
| GET | `/api/attempts` | Yes | Recent attempts |
| GET | `/api/dashboard` | Yes | Everything the dashboard needs |
| GET | `/api/leaderboard?limit=10` | Yes | Top students and the caller's rank |
| GET | `/api/badges` | Yes | All badges and how to earn them |

Common errors: 400 `VALIDATION_ERROR`, 401 `UNAUTHORIZED`, 403 `FORBIDDEN`, 404 `NOT_FOUND`, 409 `CONFLICT` / `ATTEMPT_ALREADY_SUBMITTED` / `ATTEMPT_EXPIRED` / `ATTEMPT_NOT_SUBMITTED` / `REWARD_ALREADY_CLAIMED`, 413 `PAYLOAD_TOO_LARGE`, 429 `TOO_MANY_REQUESTS`, 500 `INTERNAL_ERROR`.

## Running locally

Needs Node 20+ and a MongoDB Atlas cluster (transactions need a replica set, which Atlas provides).

```bash
# terminal 1
cd server
npm install
cp .env.example .env     # fill in MONGODB_URI and JWT_SECRET
npm run seed
npm run dev              # http://localhost:4000

# terminal 2
cd client
npm install
npm run dev              # http://localhost:5173
```

Generate a secret with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

| Server variable | Meaning |
| --- | --- |
| `MONGODB_URI` | Atlas connection string |
| `JWT_SECRET` | At least 32 characters |
| `CLIENT_ORIGIN` | Allowed site URL(s) for CORS, comma separated. Default `http://localhost:5173` |
| `PORT` | Default 4000 |
| `NODE_ENV` | `development`, `test` or `production` |
| `TRUST_PROXY_HOPS` | Proxies in front of the API. 1 locally, 2 on Render behind Netlify |

The client needs no `.env` in development. Vite forwards `/api` to port 4000.

## Tests

```bash
cd server
npm test
```

85 tests: scoring, levels and badges, auth, quiz flow, duplicate submits (including two at the same moment), ownership, time limits, leaderboard ties. API tests use an in-memory MongoDB replica set, so they never touch real data. GitHub Actions runs the type check and tests on every push.

## Deployment

1. **Atlas:** allow `0.0.0.0/0` under Network Access, then run `npm run seed` once against the database.
2. **Render:** New, Blueprint, pick the repo. Set `MONGODB_URI` and `CLIENT_ORIGIN` (the Netlify URL). `render.yaml` handles the rest.
3. **Netlify:** import the repo with Base directory `client`. `client/netlify.toml` and `client/public/_redirects` forward `/api/*` to Render, so the browser only talks to one domain and the session cookie is first-party.

To call the API directly without the proxy, set `VITE_API_BASE_URL` on Netlify to the Render URL and make sure `CLIENT_ORIGIN` on Render matches the Netlify URL exactly. In production the cookie is `SameSite=None; Secure` so this works in most browsers, but Safari blocks cross-site cookies, so the proxy is the more reliable option.

## Design notes

- Dark indigo background, red for things you press, gold only for rewards, green and coral for right and wrong.
- The XP coin is built from CSS 3D transforms (stacked discs form the rim), so there is no WebGL or image download.
- All sounds and the background music are synthesised with the Web Audio API. There are no audio files. One button mutes everything, and the choice is remembered.
- Motion is limited to transform and opacity and is switched off when the device asks for reduced motion.

## Limitations and next steps

- No admin screen for quizzes, no password reset or email verification.
- In-progress answers are saved per browser tab, not on the server.
- Rate limiting is in memory, so several server instances would need a shared store.
- The leaderboard is all-time only.
- No front-end tests yet.
- Render's free plan sleeps when idle.

## Use of AI tools

I used Claude (Anthropic) as a coding assistant while building this project, for drafting code, tests and documentation. I chose the stack and features, ran the app and the test suite myself, fixed problems found during testing and deployment, and I can explain how every part works.
