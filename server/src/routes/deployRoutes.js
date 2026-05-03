import { Router } from 'express';
import { deployToNetlify } from '../services/netlifyService.js';
import { buildSiteArchive } from '../services/siteGenerator.js';

const router = Router();

router.post('/netlify', async (req, res, next) => {
  try {
    const zipBuffer = buildSiteArchive(req.body);
    const result = await deployToNetlify(zipBuffer, req.body.data?.name);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
