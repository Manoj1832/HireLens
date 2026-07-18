import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { ResumeController } from './resume.controller.js';
import { authGuard } from '../../middleware/auth.guard.js';

const router = Router();
const controller = new ResumeController();

// Multer config — PDF/DOCX only, 10MB cap
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/resumes');
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are accepted'));
    }
  },
});

// All resume routes require authentication
router.use(authGuard);

router.post(
  '/upload/:candidateId',
  upload.single('resume'),
  (req, res, next) => controller.upload(req, res, next)
);

router.get(
  '/status/:resumeId',
  (req, res, next) => controller.getStatus(req, res, next)
);

router.get(
  '/candidate/:candidateId',
  (req, res, next) => controller.listByCandidate(req, res, next)
);

export { router as resumeRoutes };
