import { describe, it, expect } from 'vitest';
import { StorageService } from '../../src/lib/storage';
import { createSessionToken, verifySessionToken } from '../../src/lib/auth';

describe('Google OAuth 2.0 Integration & Identity Lifecycle', () => {
  it('creates a new user and provisions initial bank accounts on first Google sign-in', async () => {
    const googleId = `g_sub_${Date.now()}`;
    const email = `google.user.${Date.now()}@gmail.com`;

    const user = await StorageService.findOrCreateGoogleUser({
      email,
      name: 'Priya Sharma (Google)',
      googleId,
      avatarUrl: 'https://lh3.googleusercontent.com/sample-avatar',
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe(email);
    expect(user.name).toBe('Priya Sharma (Google)');
    expect(user.googleId).toBe(googleId);
    expect(user.avatarUrl).toBe('https://lh3.googleusercontent.com/sample-avatar');

    // Verify accounts were automatically provisioned for the new Google user
    const accounts = await StorageService.getAccounts(user.id);
    expect(accounts.length).toBeGreaterThanOrEqual(2);

    // Verify session token can be issued and verified
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      currency: user.currency,
    });

    const verified = await verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(user.id);
    expect(verified?.email).toBe(email);
  });

  it('links and reuses existing user on subsequent Google sign-ins without duplicates', async () => {
    const googleId = `g_sub_repeat_${Date.now()}`;
    const email = `repeat.google.${Date.now()}@gmail.com`;

    const firstLogin = await StorageService.findOrCreateGoogleUser({
      email,
      name: 'Rahul V',
      googleId,
    });

    const secondLogin = await StorageService.findOrCreateGoogleUser({
      email,
      name: 'Rahul V',
      googleId,
    });

    expect(firstLogin.id).toBe(secondLogin.id);
  });
});
