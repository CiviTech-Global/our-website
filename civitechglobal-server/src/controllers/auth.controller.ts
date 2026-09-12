import type { Request, Response, NextFunction } from 'express';
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

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.register(req.body);
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions);
    successResponse(res, { user: result.user, accessToken: result.accessToken }, 'Registration successful', 201);
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.login(req.body);

    // Password accepted. If the account carries a second factor, no session is
    // issued yet — the caller gets a challenge to exchange, and the refresh
    // cookie is deliberately not set, so a half-finished sign-in leaves nothing
    // behind that could be used.
    if (await mfaService.isEnabled(result.user.id)) {
      const challengeToken = await authService.issueMfaChallenge(result.user.id);
      successResponse(res, { mfaRequired: true, challengeToken }, 'Second factor required');
      return;
    }

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions);
    successResponse(res, { user: result.user, accessToken: result.accessToken }, 'Login successful');
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
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions);
    successResponse(res, { user: result.user, accessToken: result.accessToken }, 'Login successful');
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
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) {
      res.status(401).json({ success: false, message: 'Refresh token required' });
      return;
    }
    const result = await authService.refreshTokens(token);
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions);
    successResponse(res, { accessToken: result.accessToken }, 'Token refreshed');
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (token) {
      await authService.revokeRefreshToken(token);
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/', httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'strict' });
    successResponse(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
}

/** Self-service "log out everywhere": invalidates every refresh token and
 * bumps tokenVersion so all previously issued access tokens for this user
 * stop being trusted too, then clears the current cookie. */
export async function logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.revokeAllUserRefreshTokens(req.user!.userId);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/', httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'strict' });
    successResponse(res, null, 'Logged out of all sessions');
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

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
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
