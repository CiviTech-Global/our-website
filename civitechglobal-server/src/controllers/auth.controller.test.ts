import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The refresh token's two transports: a cookie for the browser, the body for
 * the mobile app — and never a mixture of the two.
 *
 * The mixture is the case that matters. If a request carrying the session
 * cookie could also ask for the token in the body, any script injected into
 * the site could lift a long-lived token out of a response, which is the one
 * thing the httpOnly cookie exists to prevent.
 */
const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  refreshTokens: vi.fn(),
  revokeRefreshToken: vi.fn(),
  isEnabled: vi.fn(),
}));

vi.mock('../services/auth.service.js', () => ({
  login: mocks.login,
  refreshTokens: mocks.refreshTokens,
  revokeRefreshToken: mocks.revokeRefreshToken,
}));
vi.mock('../services/mfa.service.js', () => ({ isEnabled: mocks.isEnabled }));
vi.mock('../services/account-recovery.service.js', () => ({}));
vi.mock('../services/email/index.js', () => ({ canSendEmail: () => true }));

const controller = await import('./auth.controller.js');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.post('/login', controller.login);
app.post('/refresh', controller.refresh);
app.post('/logout', controller.logout);

const session = { user: { id: 'u1' }, accessToken: 'access-1', refreshToken: 'refresh-1' };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.login.mockResolvedValue(session);
  mocks.isEnabled.mockResolvedValue(false);
  mocks.refreshTokens.mockResolvedValue({ accessToken: 'access-2', refreshToken: 'refresh-2' });
});

describe('the browser transport', () => {
  it('sets the refresh token as a cookie and keeps it out of the body', async () => {
    const res = await request(app).post('/login').send({ email: 'a@b.c', password: 'x' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ user: session.user, accessToken: 'access-1' });
    expect(res.headers['set-cookie']?.[0]).toMatch(/^refreshToken=refresh-1;.*HttpOnly/);
  });

  it('refreshes from the cookie only', async () => {
    const res = await request(app)
      .post('/refresh')
      .send({ refreshToken: 'from-the-body' });

    expect(res.status).toBe(401);
    expect(mocks.refreshTokens).not.toHaveBeenCalled();
  });
});

describe('the mobile transport', () => {
  it('returns the refresh token in the body and sets no cookie', async () => {
    const res = await request(app)
      .post('/login')
      .set('X-Client', 'mobile')
      .send({ email: 'a@b.c', password: 'x' });

    expect(res.body.data).toEqual({ ...session });
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('refreshes from the body and hands back the rotated token', async () => {
    const res = await request(app)
      .post('/refresh')
      .set('X-Client', 'mobile')
      .send({ refreshToken: 'refresh-1' });

    expect(mocks.refreshTokens).toHaveBeenCalledWith('refresh-1');
    expect(res.body.data).toEqual({ accessToken: 'access-2', refreshToken: 'refresh-2' });
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('ignores the cookie, so the header cannot turn a browser session into a readable token', async () => {
    const res = await request(app)
      .post('/refresh')
      .set('X-Client', 'mobile')
      .set('Cookie', 'refreshToken=browser-session');

    expect(res.status).toBe(401);
    expect(mocks.refreshTokens).not.toHaveBeenCalled();
  });

  it('revokes the token it is given on logout', async () => {
    const res = await request(app)
      .post('/logout')
      .set('X-Client', 'mobile')
      .send({ refreshToken: 'refresh-1' });

    expect(res.status).toBe(200);
    expect(mocks.revokeRefreshToken).toHaveBeenCalledWith('refresh-1');
    expect(res.headers['set-cookie']).toBeUndefined();
  });
});
