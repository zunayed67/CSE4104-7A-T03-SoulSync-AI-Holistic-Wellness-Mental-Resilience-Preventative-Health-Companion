import { describe, expect, it } from 'vitest';
import { comparePassword, hashPassword } from '../../../src/utils/password.js';

describe('password hashing', () => {
  it('hashes with a salt and verifies the right password only', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(hash).not.toContain('correct horse');
    expect(await comparePassword('correct horse battery', hash)).toBe(true);
    expect(await comparePassword('wrong password', hash)).toBe(false);
  });

  it('produces different hashes for the same password', async () => {
    expect(await hashPassword('same-password')).not.toBe(await hashPassword('same-password'));
  });

  it('returns false (after a dummy comparison) when no hash exists', async () => {
    expect(await comparePassword('anything', null)).toBe(false);
    expect(await comparePassword('anything', undefined)).toBe(false);
  });

  it('rejects empty and over-long passwords', async () => {
    await expect(hashPassword('')).rejects.toMatchObject({ code: 'INVALID_PASSWORD' });
    await expect(hashPassword('a'.repeat(73))).rejects.toMatchObject({ code: 'PASSWORD_TOO_LONG' });
    await expect(hashPassword('é'.repeat(40))).rejects.toMatchObject({ code: 'PASSWORD_TOO_LONG' });
  });
});
