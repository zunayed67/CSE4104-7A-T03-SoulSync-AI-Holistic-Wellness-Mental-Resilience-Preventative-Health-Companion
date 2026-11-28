import request from 'supertest';
import { TEST_PASSWORD, createUser } from './factories.js';

/**
 * A Supertest agent logged in through the real login endpoint, so the HTTP-only cookie is stored
 * and replayed exactly as a browser would.
 * @returns {Promise<{ agent: import('supertest').Agent, user: object }>}
 */
export async function loginAgent(app, user) {
  const agent = request.agent(app);
  const res = await agent
    .post('/api/v1/auth/login')
    .send({ email: user.email, password: TEST_PASSWORD });
  if (res.status !== 200) {
    throw new Error(`Test login failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return { agent, user };
}

/** Create a user in the database and return an agent logged in as them. */
export async function createLoggedInUser(app, overrides = {}) {
  return loginAgent(app, await createUser(overrides));
}
