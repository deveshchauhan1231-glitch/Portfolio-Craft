import { Router } from 'express';
import { buildSiteArchive } from '../services/siteGenerator.js';

const router = Router();

router.post('/site', async (req, res, next) => {
  try {
    const archive = buildSiteArchive(req.body);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="portfolio-site.zip"');
    res.send(archive);
  } catch (error) {
    next(error);
  }
});

export default router;
