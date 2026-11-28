/**
 * Seed the wellness library with starter breathing exercises and articles (published).
 *   npm run seed:resources
 * Needs an administrator (run seed:admin first); content is attributed to ADMIN_EMAIL if set,
 * otherwise to the oldest admin. Insert-only: existing resources (matched by type + title) are
 * left untouched, so edits made later in the admin panel are never overwritten.
 */
import '../src/config/index.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { ROLES } from '../src/config/constants.js';
import { Resource } from '../src/models/resource.model.js';
import { User } from '../src/models/user.model.js';

const NOTE = '\n\nThis is general wellness information, not medical advice.';

const BREATHING = [
  {
    title: 'Box breathing',
    category: 'stress relief',
    breathingPattern: { inhale: 4, hold: 4, exhale: 4, holdAfter: 4, cycles: 5 },
    content:
      'Sit comfortably and relax your shoulders. Breathe in through your nose for 4 seconds, hold for 4, breathe out slowly for 4, then pause for 4 before the next breath. Repeat for about five rounds. If counting to four feels strained, shorten each phase to three seconds.' +
      NOTE,
  },
  {
    title: '4-7-8 relaxing breath',
    category: 'sleep',
    breathingPattern: { inhale: 4, hold: 7, exhale: 8, holdAfter: 0, cycles: 4 },
    content:
      'Rest your tongue gently behind your upper front teeth. Breathe in quietly through your nose for 4 seconds, hold for 7, then breathe out through your mouth for 8. Try four rounds before bed or during a break. Stop and breathe normally if you feel light-headed.' +
      NOTE,
  },
  {
    title: 'Even breathing (5-5)',
    category: 'focus',
    breathingPattern: { inhale: 5, hold: 0, exhale: 5, holdAfter: 0, cycles: 10 },
    content:
      'Breathe in through your nose for 5 seconds and out for 5 seconds, keeping the breath smooth and unforced. Ten rounds takes about two minutes and works well before studying or a meeting.' +
      NOTE,
  },
];

const ARTICLES = [
  {
    title: 'Build a steady sleep routine',
    category: 'sleep',
    content:
      'A regular rhythm often matters more than a perfect night. Try getting up at about the same time every day, including weekends, and let your bedtime follow from that.\n\nSome simple habits many people find helpful: dim the lights and put screens away 30 minutes before bed, keep your room cool and dark, and avoid caffeine late in the day. If you cannot sleep, get up and do something quiet until you feel sleepy instead of watching the clock.\n\nUse the tracker to notice how your sleep hours and energy move together over a few weeks. Patterns in your own data are clues, not proof of cause.' +
      NOTE,
  },
  {
    title: 'Hydration habits that stick',
    category: 'hydration',
    content:
      'Attach drinking water to things you already do: a glass after waking up, one with each meal, and a refill whenever you stand up for a break. Keeping a bottle on your desk makes the habit visible.\n\nNeeds vary with weather, activity and body size, so treat any daily target as a starting point and adjust to what feels right for you. Plain water, tea and water-rich foods all count.\n\nLog your intake for a week to see which parts of the day you tend to forget.' +
      NOTE,
  },
  {
    title: 'Short movement breaks for study days',
    category: 'activity',
    content:
      'Long stretches of sitting are easier to break up than to avoid. Set a timer for every 45 to 60 minutes and take two to five minutes to stand, stretch your neck and shoulders, walk to a window or climb a flight of stairs.\n\nA ten-minute walk after a meal or between classes is a realistic goal on busy days. Small, repeatable movement usually beats rare, intense effort for building a habit.\n\nTrack your active minutes and notice how you feel on days with more movement.' +
      NOTE,
  },
  {
    title: 'A five-minute reset for stressful moments',
    category: 'stress relief',
    content:
      'When things feel overwhelming, pause for five minutes. First, slow your breathing for one minute (try the box breathing exercise). Second, name three things you can see, two you can hear and one you can feel, to bring your attention back to the present. Third, write down the one next step that would help most, however small.\n\nThen do just that step. If stress feels constant or too heavy to manage, talking to a friend, a counsellor or your university student support service can help.' +
      NOTE,
  },
  {
    title: 'Using your tracker without judging yourself',
    category: 'habits',
    content:
      'Tracking works best as curiosity, not grading. A low-mood day or a missed log is information, not failure. Missing days are shown as gaps, never as zeros, so one lapse does not erase your progress.\n\nLook for gentle patterns over weeks, such as how sleep, activity and stress move together. Remember that two things changing at the same time does not mean one causes the other.\n\nPick one small habit to focus on each week and review it when your weekly report arrives.' +
      NOTE,
  },
];

async function findAuthor() {
  if (process.env.ADMIN_EMAIL) {
    const byEmail = await User.findOne({
      email: process.env.ADMIN_EMAIL.trim().toLowerCase(),
      role: ROLES.ADMIN,
    });
    if (byEmail) return byEmail;
  }
  return User.findOne({ role: ROLES.ADMIN }).sort({ createdAt: 1 });
}

async function main() {
  await connectDatabase();
  const author = await findAuthor();
  if (!author) {
    console.error('No administrator found. Run "npm run seed:admin" first.');
    process.exitCode = 1;
    return;
  }

  let created = 0;
  const items = [
    ...BREATHING.map((r) => ({ ...r, type: 'breathing' })),
    ...ARTICLES.map((r) => ({ ...r, type: 'article' })),
  ];
  for (const item of items) {
    const result = await Resource.updateOne(
      { type: item.type, title: item.title },
      { $setOnInsert: { ...item, createdBy: author._id, isPublished: true } },
      { upsert: true },
    );
    if (result.upsertedCount === 1) created += 1;
  }
  console.log(`Resources: ${created} created, ${items.length - created} already present.`);
}

main()
  .catch((err) => {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
