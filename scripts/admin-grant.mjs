#!/usr/bin/env node
/**
 * Explicit admin role CLI: node scripts/admin-grant.mjs user@example.com [grant|revoke]
 */
import { PrismaClient } from '@prisma/client';

const email = (process.argv[2] || '').trim().toLowerCase();
const action = process.argv[3] || 'grant';

if (!email || !['grant', 'revoke'].includes(action)) {
  console.error('Usage: node scripts/admin-grant.mjs <email> [grant|revoke]');
  process.exit(1);
}

const db = new PrismaClient();
try {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }
  const role = action === 'grant' ? 'admin' : 'learner';
  await db.user.update({ where: { id: user.id }, data: { role } });
  console.log(`Updated ${email} -> role=${role}`);
} finally {
  await db.$disconnect();
}
