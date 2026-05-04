import { Router } from 'express';
import {
  generateBio,
  improveBullets,
  refineProjectDescription,
  suggestPortfolioChanges,
  suggestDesign
} from '../services/groqService.js';

const router = Router();

router.post('/bio', async (req, res, next) => {
  try {
    res.json({ bio: await generateBio(req.body) });
  } catch (error) {
    next(error);
  }
});

router.post('/enhance-bullets', async (req, res, next) => {
  try {
    res.json({ bullets: await improveBullets(req.body.bullets || []) });
  } catch (error) {
    next(error);
  }
});

router.post('/project-description', async (req, res, next) => {
  try {
    res.json({ description: await refineProjectDescription(req.body.project || {}) });
  } catch (error) {
    next(error);
  }
});

router.post('/design-suggestions', async (req, res, next) => {
  try {
    res.json(await suggestDesign(req.body));
  } catch (error) {
    next(error);
  }
});

router.post('/portfolio-suggestions', async (req, res, next) => {
  try {
    res.json(await suggestPortfolioChanges(req.body));
  } catch (error) {
    next(error);
  }
});

export default router;
