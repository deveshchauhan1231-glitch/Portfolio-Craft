import { Router } from 'express';
import multer from 'multer';
import { parseResumeBuffer } from '../services/resumeParser.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF uploads are supported'));
      return;
    }
    cb(null, true);
  }
});

router.post('/upload', upload.single('resume'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Upload a PDF file using the resume field' });
      return;
    }

    const parsed = await parseResumeBuffer(req.file.buffer);
    res.json(parsed);
  } catch (error) {
    next(error);
  }
});

export default router;
