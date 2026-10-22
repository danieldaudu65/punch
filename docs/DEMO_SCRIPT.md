# Demo video script (under 5 minutes)

Record the screen with your voice. Speak in your own words; the lines below are a guide, not a script to read.

**Before you press record**

- Open the live site once so Render wakes up (the first load can take up to a minute).
- Run `npm run seed` so the demo account starts at 0 XP and the leaderboard is full.
- Have three tabs ready: the live site, the GitHub repo, and a terminal in `server/`.
- Turn off notifications. Zoom the browser to 110% so text is readable.

| Time | Show | Say |
| --- | --- | --- |
| 0:00–0:20 | Login page, move the mouse so the coin tilts | Who you are, what you built, and that the stack is React, Express and MongoDB. |
| 0:20–0:50 | Click "Create an account", submit it empty, then register a new fictitious student | Validation in the browser and on the server; password hashed with bcrypt; session in an httpOnly cookie. |
| 0:50–1:20 | Dashboard | Name, XP, level bar, quizzes completed, rank, locked badges. One API call builds this screen. |
| 1:20–2:20 | Start Naija Know-It-All. Answer a few with the mouse, a few with keys 1–4, skip one, open the review step, submit | The browser never receives the correct answers. Timer, progress bar, review step showing the blank question. |
| 2:20–2:50 | Results celebration | Server graded it and paid XP; First Steps badge appeared; level-up if it happened. Scroll to the answer review. |
| 2:50–3:10 | Leaderboard | Ranked by XP, shared rank for ties, your row highlighted, no emails exposed. |
| 3:10–3:40 | Retake the same quiz and submit | Practice round: scored, but 0 XP, so the leaderboard cannot be farmed. |
| 3:40–4:30 | Terminal: `npm test`, then open `tests/api/quiz-flow.test.ts` at "pays out only once when two submits arrive at the same moment"; then `services/attempt.service.ts` at the transaction | Duplicate protection: status check, conditional update, unique index, transaction. 85 tests run on every push. |
| 4:30–4:55 | README on GitHub, scroll to Limitations and AI assistance | What you would build next, and how you used AI and checked its work. |

**Your personal contribution (say this honestly in your own words)**

The brief asks you to explain your personal contributions. Be specific about what you decided, reviewed, ran, tested, fixed or changed yourself, and say plainly that you used an AI coding assistant. Reviewers value an honest, confident explanation of the code far more than a claim that you typed every line.

**Before submitting**

- Video under 5 minutes, voice clear, text readable.
- Upload it (YouTube unlisted, Loom or Google Drive) and check the link works in a private window.
