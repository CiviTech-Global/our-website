import type { Request, Response, NextFunction } from 'express';
import { canSendEmail } from '../services/email/index.js';
import * as authService from '../services/auth.service.js';
import * as recoveryService from '../services/account-recovery.service.js';
import * as mfaService from '../services/mfa.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import { env } from '../config/env.js';

const REFRESH_COOKIE_NAME = 'refreshToken';

const cookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

/*
 * Where the refresh token travels.
 *
 * In a browser it lives only in an httpOnly, SameSite=strict cookie, so no
 * script on the page can read it. A native app has no cookie jar it can rely
 * on; it keeps the token in the platform's secure storage instead (Keychain,
 * Android Keystore) and identifies itself with `X-Client: mobile`.
 *
 * The two transports never mix. A mobile request gets the token in the body
 * and must present it in the body; the cookie is neither set nor read. A
 * browser request never sees the token in a body. Without that split, a
 * script injected into the site could call /auth/refresh with the header, let
 * the cookie authenticate it, and read a fresh long-lived token out of the
 * response — exactly what the cookie exists to prevent.
 */
const MOBILE_CLIENT = 'mobile';

function isMobileClient(req: Request): boolean {
  return req.get('x-client')?.trim().toLowerCase() === MOBILE_CLIENT;
}

function presentedRefreshToken(req: Request): string | undefined {
  const token: unknown = isMobileClient(req) ? req.body?.refreshToken : req.cookies?.[REFRESH_COOKIE_NAME];
  return typeof token === 'string' && token ? token : undefined;
}

/** Hands a new session to the caller over the transport it uses. */
function sendSession(
  req: Request,
  res: Response,
  session: { refreshToken: string },
  data: Record<string, unknown>,
  message: string,
  statusCode = 200,
): void {
  if (isMobileClient(req)) {
    successResponse(res, { ...data, refreshToken: session.refreshToken }, message, statusCode);
    return;
  }
  res.cookie(REFRESH_COOKIE_NAME, session.refreshToken, cookieOptions);
  successResponse(res, data, message, statusCode);
}

function clearSessionCookie(req: Request, res: Response): void {
  if (isMobileClient(req)) return;
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/', httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'strict' });
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.register(req.body);
    sendSession(req, res, result, { user: result.user, accessToken: result.accessToken }, 'Registration successful', 201);
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.login(req.body);

    // Password accepted. If the account carries a second factor, no session is
    // issued yet — the caller gets a challenge to exchange, and the refresh
    // token is deliberately not issued, so a half-finished sign-in leaves nothing
    // behind that could be used.
    if (await mfaService.isEnabled(result.user.id)) {
      const challengeToken = await authService.issueMfaChallenge(result.user.id);
      successResponse(res, { mfaRequired: true, challengeToken }, 'Second factor required');
      return;
    }

    sendSession(req, res, result, { user: result.user, accessToken: result.accessToken }, 'Login successful');
  } catch (error) {
    next(error);
  }
}

/** Second step of sign-in: exchange a challenge plus a code for a session. */
export async function verifyMfa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const challengeToken = req.body.challengeToken as string;
    const userId = await authService.peekMfaChallenge(challengeToken);
    // One message whether the challenge expired, was already spent, or never
    // existed. Telling them apart says which half of the guess was right.
    if (!userId) throw new AppError('این درخواست معتبر نیست. دوباره وارد شوید.', 401);

    try {
      await mfaService.verifyChallenge(userId, req.body.code as string);
    } catch (error) {
      // A wrong code costs an attempt, not the whole sign-in. After five the
      // challenge is destroyed and the password has to be entered again.
      await authService.recordMfaFailure(challengeToken);
      throw error;
    }

    // Spent only now, so it cannot be replayed — and only after success, so a
    // typo does not cost somebody their session.
    await authService.spendMfaChallenge(challengeToken);

    const result = await authService.issueSessionFor(userId);
    sendSession(req, res, result, { user: result.user, accessToken: result.accessToken }, 'Login successful');
  } catch (error) {
    next(error);
  }
}

export async function mfaStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    successResponse(res, await mfaService.status(req.user!.userId));
  } catch (error) {
    next(error);
  }
}

export async function mfaBegin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    successResponse(res, await mfaService.beginEnrolment(req.user!.userId));
  } catch (error) {
    next(error);
  }
}

export async function mfaConfirm(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const recoveryCodes = await mfaService.confirmEnrolment(req.user!.userId, req.body.code as string);
    // Shown once and never again — they are stored hashed. The UI has to make
    // that unmissable.
    successResponse(res, { recoveryCodes }, 'ورود دومرحله‌ای فعال شد.');
  } catch (error) {
    next(error);
  }
}

export async function mfaDisable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await mfaService.disable(req.user!.userId, req.body.code as string);
    successResponse(res, null, 'ورود دومرحله‌ای غیرفعال شد.');
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = presentedRefreshToken(req);
    if (!token) {
      res.status(401).json({ success: false, message: 'Refresh token required' });
      return;
    }
    const result = await authService.refreshTokens(token);
    sendSession(req, res, result, { accessToken: result.accessToken }, 'Token refreshed');
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = presentedRefreshToken(req);
    if (token) {
      await authService.revokeRefreshToken(token);
    }
    clearSessionCookie(req, res);
    successResponse(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
}

/** Self-service "log out everywhere": invalidates every refresh token and
 * bumps tokenVersion so all previously issued access tokens for this user
 * stop being trusted too, then clears the current cookie (a mobile app drops
 * its stored token itself). */
export async function logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.revokeAllUserRefreshTokens(req.user!.userId);
    clearSessionCookie(req, res);
    successResponse(res, null, 'Logged out of all sessions');
  } catch (error) {
    next(error);
  }
}

/** A new password, from inside the account. Other sessions end; this one is renewed. */
export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.changePassword(
      req.user!.userId,
      req.body.currentPassword as string,
      req.body.newPassword as string,
    );
    sendSession(req, res, result, { user: result.user, accessToken: result.accessToken }, 'Password changed');
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getMe(req.user!.userId);
    successResponse(res, { user });
  } catch (error) {
    next(error);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.updateProfile(req.user!.userId, req.body);
    successResponse(res, { user }, 'Profile updated');
  } catch (error) {
    next(error);
  }
}

/**
 * 501, not 503.
 *
 * 503 says "try again shortly", and a client that believes it will retry
 * forever against a deployment that has never had a mail service. 501 says the
 * server does not implement what was asked, which is the accurate statement,
 * and the message names the route that does work: the contact form issues a
 * tracking code and needs no mailbox at either end.
 */
function emailUnavailable(): AppError {
  return new AppError(
    'در حال حاضر امکان ارسال ایمیل وجود ندارد. برای بازیابی حساب، از فرم تماس استفاده کنید؛ ' +
      'کد رهگیری دریافت می‌کنید و پاسخ را در همان صفحه می‌بینید.',
    501,
  );
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  // Checked before the lookup, so this cannot become a way to learn which
  // addresses have accounts: it answers the same way for every input.
  if (!canSendEmail()) return next(emailUnavailable());

  try {
    await recoveryService.requestPasswordReset(req.body.email as string);
  } catch (error) {
    // Only a genuine fault reaches here — an unknown address returns normally.
    return next(error);
  }

  // The same answer whether or not that address has an account. Anything else
  // turns this endpoint into a way to ask us who our users are.
  successResponse(
    res,
    null,
    'اگر حسابی با این نشانی وجود داشته باشد، پیوند بازنشانی رمز عبور برایش ارسال شد.'
  );
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    await recoveryService.resetPassword(req.body.token as string, req.body.password as string);
    successResponse(res, null, 'رمز عبور شما تغییر کرد. اکنون می‌توانید وارد شوید.');
  } catch (error) {
    next(error);
  }
}

export async function sendVerificationEmail(req: Request, res: Response, next: NextFunction) {
  if (!canSendEmail()) return next(emailUnavailable());

  try {
    await recoveryService.sendVerificationEmail(req.user!.userId);
    successResponse(res, null, 'پیوند تأیید برای شما ارسال شد.');
  } catch (error) {
    next(error);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    await recoveryService.verifyEmail(req.body.token as string);
    successResponse(res, null, 'نشانی ایمیل شما تأیید شد.');
  } catch (error) {
    next(error);
  }
}
