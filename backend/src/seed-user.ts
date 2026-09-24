import 'reflect-metadata';
import 'dotenv/config';
import mongoose from 'mongoose';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { Branches } from './branches.enum';
import { ProfileSchema } from './profiles/profile.schema';
import { UserSchema } from './users/user.schema';

const scrypt = promisify(scryptCallback);

async function seedUser() {
  const uri = process.env['MONGODB_URI'];
  const email = process.env['SEED_USER_EMAIL']?.trim().toLowerCase();
  const password = process.env['SEED_USER_PASSWORD'];
  const name = process.env['SEED_USER_NAME']?.trim();
  if (!uri || !email || !password || !name) {
    throw new Error(
      'Set MONGODB_URI, SEED_USER_EMAIL, SEED_USER_PASSWORD, and SEED_USER_NAME in backend/.env.',
    );
  }

  await mongoose.connect(uri);
  const UserModel = mongoose.model('User', UserSchema);
  const ProfileModel = mongoose.model('Profile', ProfileSchema);
  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const passwordHash = `scrypt$${salt}$${derived.toString('hex')}`;
  const user = await UserModel.findOneAndUpdate(
    { email },
    { $set: { email, name, passwordHash } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  await ProfileModel.findOneAndUpdate(
    { userId: user._id },
    {
      $setOnInsert: {
        userId: user._id,
        email,
        name,
        branch: Branches.Other,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  await mongoose.disconnect();
  process.stdout.write('Seed user is ready.\n');
}

void seedUser().catch(async (error: unknown) => {
  await mongoose.disconnect();
  process.stderr.write(`${error instanceof Error ? error.message : 'Seed failed.'}\n`);
  process.exitCode = 1;
});
