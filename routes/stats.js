import { Router } from 'express';
import { authGuard } from '../middleware/auth.js';
import { getStats } from '../services/statsService.js';

const router = Router();
router.use(authGuard);

// GET /api/stats
router.get('/', async (req, res, next) => {
  try {
    const stats = await getStats(req.user.id);
    res.json(stats);
  } catch (err) { next(err); }
});

export default router;
