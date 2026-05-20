import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authGuard } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { parseJobDescription, analyseGap } from '../services/aiService.js';
import * as userService from '../services/userService.js';
import * as appService from '../services/applicationService.js';
import pool from '../db/index.js';

const router = Router();
router.use(authGuard, aiLimiter);

// ── POST /api/ai/parse-jd ─────────────────────────────────────────────────────
router.post(
  '/parse-jd',
  validate(z.object({ jdText: z.string().min(50, 'Job description is too short') })),
  async (req, res, next) => {
    try {
      const fields = await parseJobDescription(req.body.jdText);
      res.json(fields);
    } catch (err) { next(err); }
  }
);

// ── POST /api/ai/gap-analysis/:id ────────────────────────────────────────────
router.post('/gap-analysis/:id', async (req, res, next) => {
  try {
    const appId  = req.params.id;
    const userId = req.user.id;

    // Fetch application
    const app = await appService.getOne(appId, userId);

    // Fetch user's resume
    const profile = await userService.getProfile(userId);
    
    // Fallback variable validation layout to handle column case-folding variants safely
    const activeResumeText = profile.resume_text || profile.resumeText;

    if (!activeResumeText || activeResumeText.trim() === '') {
      return res.status(400).json({
        error: 'No resume on file. Add your resume text on the Profile page first.',
      });
    }

    const analysis = await analyseGap({
      resumeText: activeResumeText,
      company:    app.company,
      role:       app.role,
      notes:      app.notes,
    });

    if (analysis.verdict === "Service Busy" || analysis.score === null) {
      return res.status(429).json({ 
        error: "You have temporarily exhausted your free Gemini API daily quota. Please switch to a Flash-Lite model or generate a fresh API key in AI Studio to continue testing!" 
      });
    }

    // Persist score back to applications table safely
    await pool.query(
      `UPDATE applications
       SET ai_score = $1, ai_score_reason = $2, ai_scored_at = NOW()
       WHERE id = $3`,
      [analysis.score, analysis.summary, appId]
    );

    res.json(analysis);
  } catch (err) {
    // Catch-all safety boundary for middleware constraints
    if (err.status === 429 || err.code === '429') {
      return res.status(429).json({
        error: "You're analyzing roles too quickly! Please wait a minute before trying again."
      });
    }
    next(err);
  }
});

export default router;