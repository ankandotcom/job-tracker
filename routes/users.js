import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authGuard } from '../middleware/auth.js';
import * as userService from '../services/userService.js';

const router = Router();
router.use(authGuard);

// GET /api/user/me
router.get('/me', async (req, res, next) => {
  try {
    const profile = await userService.getProfile(req.user.id);
    res.json(profile);
  } catch (err) { next(err); }
});

// PUT /api/user/profile
router.put('/profile', validate(z.object({ name: z.string().min(1).max(100) })), async (req, res, next) => {
  try {
    const profile = await userService.updateProfile(req.user.id, req.body);
    res.json(profile);
  } catch (err) { next(err); }
});

// PUT /api/user/resume
router.put('/resume', validate(z.object({ resume_text: z.string().min(1).max(20000) })), async (req, res, next) => {
  try {
    await userService.updateResume(req.user.id, req.body.resume_text);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
