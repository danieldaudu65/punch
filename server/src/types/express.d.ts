declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth once the session cookie has been verified. */
      userId?: string;
    }
  }
}

export {};
