import { ROLES } from '../../src/config/constants.js';
import { Goal } from '../../src/models/goal.model.js';
import { JournalEntry } from '../../src/models/journalEntry.model.js';
import { Resource } from '../../src/models/resource.model.js';
import { User } from '../../src/models/user.model.js';
import { WellnessLog } from '../../src/models/wellnessLog.model.js';
import { dateKeyToUtcDate } from '../../src/utils/date.js';
import { hashPassword } from '../../src/utils/password.js';

export const TEST_PASSWORD = 'Passw0rd-test';

let counter = 0;
const next = () => (counter += 1);

/** Create a user directly in the database (bypassing the API). */
export async function createUser(overrides = {}) {
  const { createdAt, ...fields } = overrides;
  const n = next();
  const doc = await User.create({
    name: `Test User ${n}`,
    email: `user${n}@example.com`,
    passwordHash: await hashPassword(TEST_PASSWORD),
    timezone: 'UTC',
    ...fields,
  });
  if (createdAt) {
    // Mongoose manages createdAt; write it directly to simulate an older account.
    await User.collection.updateOne({ _id: doc._id }, { $set: { createdAt } });
    doc.createdAt = createdAt;
  }
  return doc.toObject();
}

export const createAdmin = (overrides = {}) => createUser({ role: ROLES.ADMIN, ...overrides });

export function createWellnessLog(userId, dateKey, metrics = {}) {
  return WellnessLog.create({
    userId,
    date: dateKeyToUtcDate(dateKey),
    mood: 4,
    stressLevel: 5,
    sleepHours: 7,
    waterIntakeMl: 1800,
    activityMinutes: 30,
    energyLevel: 3,
    ...metrics,
  });
}

export const createJournalEntry = (userId, overrides = {}) =>
  JournalEntry.create({ userId, title: 'Note', content: 'private thoughts', ...overrides });

export const createGoal = (userId, overrides = {}) =>
  Goal.create({
    userId,
    title: 'Drink water',
    type: 'daily',
    targetValue: 2000,
    unit: 'ml',
    ...overrides,
  });

export const createResource = (createdBy, overrides = {}) =>
  Resource.create({
    createdBy,
    title: `Resource ${next()}`,
    type: 'article',
    category: 'sleep',
    content: 'Some helpful general content.',
    isPublished: true,
    ...overrides,
  });
