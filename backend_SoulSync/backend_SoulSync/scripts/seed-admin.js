/**
 * Create the first administrator (or promote an existing account).
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='Str0ng-pass-1' [ADMIN_NAME='Admin'] npm run seed:admin
 * An existing account keeps its password; it is only switched to the admin role and re-activated.
 * The password is never printed.
 */
import { z } from 'zod';
import '../src/config/index.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { ROLES, USER_STATUS } from '../src/config/constants.js';
import { User } from '../src/models/user.model.js';
import { hashPassword } from '../src/utils/password.js';
import { emailSchema, passwordSchema } from '../src/validators/auth.validator.js';

const input = z.object({
  ADMIN_EMAIL: emailSchema,
  ADMIN_PASSWORD: passwordSchema,
  ADMIN_NAME: z.string().trim().min(2).max(80).default('Administrator'),
});

async function main() {
  const parsed = input.safeParse({
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_NAME: process.env.ADMIN_NAME || undefined,
  });
  if (!parsed.success) {
    console.error('Cannot seed admin. Fix these environment variables:');
    for (const issue of parsed.error.issues)
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    process.exitCode = 1;
    return;
  }
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password, ADMIN_NAME: name } = parsed.data;

  await connectDatabase();
  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = ROLES.ADMIN;
    existing.status = USER_STATUS.ACTIVE;
    await existing.save();
    console.log(`Existing account ${email} is now an active administrator (password unchanged).`);
    return;
  }

  await User.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    role: ROLES.ADMIN,
    onboardingDone: true,
  });
  console.log(`Administrator ${email} created.`);
}

main()
  .catch((err) => {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
