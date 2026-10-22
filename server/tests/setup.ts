// Runs before every test file, before the app is imported, so the env
// validation in src/config/env.ts passes without a real .env file.
// dotenv never overrides variables that are already set.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-32-characters';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
// Placeholder: API tests connect to an in-memory database instead (helpers/db.ts).
process.env.MONGODB_URI = 'mongodb://in-memory-test-database';
