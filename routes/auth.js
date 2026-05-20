import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { authGuard } from '../middleware/auth.js';
import * as authService from '../services/authService.js';

const router = Router();

const registerSchema = z.object({
  name:     z.string().min(1).max(100),
  email:    z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/register
router.post('/register', authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ user });
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { accessToken, refreshToken, user } = await authService.login(req.body);
    res
      .cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      })
      .json({ accessToken, user });
  } catch (err) { next(err); }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ error: 'No refresh token' });
    const { accessToken, refreshToken } = await authService.refresh(token);
    res
      .cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({ accessToken });
  } catch (err) { next(err); }
});

// POST /api/auth/logout
router.post('/logout', authGuard, async (req, res, next) => {
  try {
    await authService.logout(req.user.id);
    res.clearCookie('refresh_token').json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
