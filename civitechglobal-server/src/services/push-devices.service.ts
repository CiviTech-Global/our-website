import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { pushProvider, type PushMessage } from './push/index.js';

/**
 * The phones an account's notifications are pushed to.
 *
 * A device is registered by the app after sign-in and on every launch (which
 * also keeps lastSeenAt honest), and removed when that phone signs out or
 * when every session of the account ends. The token is the provider's
 * address for one app install, so registering it again under another account
 * moves it: one phone, one member at a time.
 */

/** More than anybody signs in on, few enough that a leak cannot fan out. */
const MAX_DEVICES_PER_USER = 10;

export interface DeviceInput {
  provider: string;
  token: string;
  platform: string;
  appVersion?: string;
  language?: string;
}

export async function registerDevice(userId: string, input: DeviceInput): Promise<void> {
  const fields = {
    userId,
    platform: input.platform,
    appVersion: input.appVersion ?? null,
    language: input.language ?? null,
    lastSeenAt: new Date(),
  };
  await prisma.pushDevice.upsert({
    where: { provider_token: { provider: input.provider, token: input.token } },
    create: { provider: input.provider, token: input.token, ...fields },
    update: fields,
  });

  // The oldest beyond the cap go: phones replaced or reinstalled long ago.
  const stale = await prisma.pushDevice.findMany({
    where: { userId },
    orderBy: { lastSeenAt: 'desc' },
    skip: MAX_DEVICES_PER_USER,
    select: { id: true },
  });
  if (stale.length > 0) {
    await prisma.pushDevice.deleteMany({ where: { id: { in: stale.map((device) => device.id) } } });
  }
}

/** This phone signs out. Scoped to the owner: a token is not proof of ownership. */
export async function unregisterDevice(userId: string, token: string): Promise<void> {
  await prisma.pushDevice.deleteMany({ where: { userId, token } });
}

/** Every session of the account ended: no phone should keep receiving its notices. */
export async function forgetDevices(userId: string): Promise<void> {
  await prisma.pushDevice.deleteMany({ where: { userId } });
}

/** Sends [message] to the account's phones on the configured provider. */
export async function pushToUser(userId: string, message: PushMessage): Promise<void> {
  const provider = pushProvider();
  // Nothing to send through, so not even the lookup.
  if (provider.name === 'none') return;

  const devices = await prisma.pushDevice.findMany({
    // The console stands in for every provider, so development sees what
    // each registered phone would have been sent.
    where: provider.name === 'console' ? { userId } : { userId, provider: provider.name },
    select: { token: true },
  });
  if (devices.length === 0) return;

  await provider.send(
    devices.map((device) => device.token),
    message,
  );
}

/** Fire-and-forget, as notifySafely: a push never fails what caused it. */
export function pushSafely(userId: string, message: PushMessage): void {
  pushToUser(userId, message).catch((error) => {
    logger.warn({ err: error, userId }, 'Failed to send push notification');
  });
}
