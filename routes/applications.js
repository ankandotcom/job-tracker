import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authGuard } from '../middleware/auth.js';
import * as appService from '../services/applicationService.js';

const router = Router();
router.use(authGuard);

const APP_STATUSES = ['applied','screening','interview','offer','rejected','withdrawn'];

const createSchema = z.object({
  company:      z.string().min(1).max(255),
  role:         z.string().min(1).max(255),
  status:       z.enum(APP_STATUSES).optional(),
  applied_at:   z.string().datetime().optional(),
  notes:        z.string().max(5000).optional(),
  salary_range: z.string().max(100).optional(),
  url:          z.string().url().optional().or(z.literal('')),
});

const updateSchema = createSchema.partial();

// GET /api/applications
router.get('/', async (req, res, next) => {
  try {
    const { status, sort, order } = req.query;
    const apps = await appService.getAll(req.user.id, { status, sort, order });
    res.json(apps);
  } catch (err) { next(err); }
});

// GET /api/applications/:id
router.get('/:id', async (req, res, next) => {
  try {
    const app = await appService.getOne(req.params.id, req.user.id);
    res.json(app);
  } catch (err) { next(err); }
});

// POST /api/applications
router.post('/', validate(createSchema), async (req, res, next) => {
  try {
    const app = await appService.create(req.user.id, req.body);
    res.status(201).json(app);
  } catch (err) { next(err); }
});

// PUT /api/applications/:id
router.put('/:id', validate(updateSchema), async (req, res, next) => {
  try {
    const app = await appService.update(req.params.id, req.user.id, req.body);
    res.json(app);
  } catch (err) { next(err); }
});

// DELETE /api/applications/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await appService.remove(req.params.id, req.user.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
