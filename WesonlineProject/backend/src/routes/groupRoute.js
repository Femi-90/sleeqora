import express from 'express';

import {
  registerGroup,
  verifyGroupRegistration,
  loginGroup,
  getMyGroup,
  submitReport,
  resendGroupVerificationCode,
  getTodaySubmissionStatus,
} from '../controllers/groupController.js';

import { protectGroupLead } from '../middleware/authMiddleware.js';

const router = express.Router();

// Registration and authentication
router.post('/register', registerGroup);
router.post('/verify-email', verifyGroupRegistration);
router.post('/login', loginGroup);
router.post('/resend-code', resendGroupVerificationCode);

// Authenticated Group Lead endpoints
router.get('/me', protectGroupLead, getMyGroup);

router.post('/reports', protectGroupLead, submitReport);

router.get(
  '/reports/today',
  protectGroupLead,
  getTodaySubmissionStatus
);

export default router;