import { UserModel } from '../models/User';
import { hashPassword } from '../utils/password';

/** The fictitious account reviewers use. The login page has a one-click button for it. */
export const DEMO_ACCOUNT = {
  name: 'Demo Student',
  email: 'demo@example.com',
  password: 'DemoPass123',
};

/**
 * Called on every server start. Creates the demo login if it is missing,
 * so "Explore with the demo account" works even if nobody ran the seed.
 * An existing demo account is left alone, progress included.
 */
export async function ensureDemoAccount(): Promise<void> {
  const exists = await UserModel.exists({ email: DEMO_ACCOUNT.email });
  if (exists) return;

  try {
    await UserModel.create({
      name: DEMO_ACCOUNT.name,
      email: DEMO_ACCOUNT.email,
      passwordHash: await hashPassword(DEMO_ACCOUNT.password),
    });
    console.log(`Demo login created: ${DEMO_ACCOUNT.email}`);
  } catch (err) {
    // Another instance created it at the same moment; the unique email index stopped a duplicate.
    if ((err as { code?: number }).code !== 11000) throw err;
  }
}
