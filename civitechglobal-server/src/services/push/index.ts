import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

/**
 * Push delivery, behind one interface.
 *
 * Every in-app notification the server writes can also reach the member's
 * phone. The provider is a choice made per deployment, not per feature:
 * Pushe first, because Google's services refuse many Iranian addresses and
 * some phones sold here have none at all; FCM can join later for members
 * abroad without any feature knowing.
 *
 * Push is a convenience on top of the notification row, which is the record.
 * The app polls while it is open and catches up on launch, so a push that
 * never arrives only means a later notice, never lost information.
 */
export interface PushMessage {
  title: string;
  body: string;
  /** A route inside the app (the notification's link), opened on tap. */
  link?: string;
}

export interface PushProvider {
  /** The provider a device token belongs to, as the app registers it. */
  readonly name: string;
  /** Sends [message] to each device token. Throws on delivery failure. */
  send(tokens: string[], message: PushMessage): Promise<void>;
}

/**
 * No push at all: the honest setting until an account exists. Devices are
 * still registered, so turning a provider on later reaches every phone that
 * signed in meanwhile, and nothing is sent or pretended to be.
 */
class NoPushProvider implements PushProvider {
  readonly name = 'none';

  async send(): Promise<void> {}
}

/** Development: what would have been sent, in the log. Refused in production. */
class ConsolePushProvider implements PushProvider {
  readonly name = 'console';

  async send(tokens: string[], message: PushMessage): Promise<void> {
    logger.info({ devices: tokens.length, message }, '[console push] notification');
  }
}

/**
 * Pushe (pushe.co) through its REST API, addressed to the devices' Pushe ids.
 *
 * PLACEHOLDER until the account exists: the endpoint, the body's field names
 * and the app id must be checked against Pushe's console and API reference
 * when the credentials arrive. They are kept to this one class for that
 * reason, and the deployment's default is `none`, so nothing here runs in
 * production before then.
 */
class PushePushProvider implements PushProvider {
  readonly name = 'pushe';

  constructor(
    private readonly apiToken: string,
    private readonly appId: string,
    private readonly endpoint: string,
  ) {}

  async send(tokens: string[], message: PushMessage): Promise<void> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Token ${this.apiToken}`,
      },
      body: JSON.stringify({
        app_ids: [this.appId],
        data: { title: message.title, content: message.body },
        // Read by the app on tap: the route the notification points at.
        custom_content: message.link ? { link: message.link } : undefined,
        filters: { device_id: tokens },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Pushe responded ${response.status}`);
    }
  }
}

function build(): PushProvider {
  const name = env.PUSH_PROVIDER.toLowerCase();

  if (name === 'none') return new NoPushProvider();

  if (name === 'console') {
    if (env.isProduction) {
      // Logging every member's notifications instead of sending them would
      // look like a working system, and put their contents in the logs.
      throw new Error('FATAL: PUSH_PROVIDER=console is not permitted in production. Use none or pushe.');
    }
    return new ConsolePushProvider();
  }

  if (name === 'pushe') {
    if (!env.PUSHE_API_TOKEN) throw new Error('PUSHE_API_TOKEN is required when PUSH_PROVIDER=pushe');
    if (!env.PUSHE_APP_ID) throw new Error('PUSHE_APP_ID is required when PUSH_PROVIDER=pushe');
    return new PushePushProvider(env.PUSHE_API_TOKEN, env.PUSHE_APP_ID, env.PUSHE_API_URL);
  }

  throw new Error(`Unknown PUSH_PROVIDER "${env.PUSH_PROVIDER}" (expected: none, console, pushe)`);
}

let provider: PushProvider | undefined;

/** Lazily built so importing this module never throws at load time. */
export function pushProvider(): PushProvider {
  provider ??= build();
  return provider;
}

/**
 * Whether a registered phone can actually be reached. The console provider
 * writes to a log nobody holding the phone reads, so it counts as no, as
 * canSendSms does; the app registers either way.
 */
export function canSendPush(): boolean {
  const { name } = pushProvider();
  return name !== 'console' && name !== 'none';
}

/** For tests: forget the built provider so the next call reads env again. */
export function resetPushProviderForTests(): void {
  provider = undefined;
}
