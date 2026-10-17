import express from 'express';

import {
  registerAdmin,
  verifyRegistrationCode,
  resendAdminVerificationCode,
  loginAdmin,
  getFilteredReports,
} from '../controllers/adminController.js';

import { protectAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Register an administrator
router.post('/register', registerAdmin);

// Verify administrator email
router.post('/verify-email', verifyRegistrationCode);

// Resend administrator verification code
router.post('/resend-code', resendAdminVerificationCode);

// Log in an administrator
router.post('/login', loginAdmin);

// Fetch group reports with optional filters
router.get('/reports', protectAdmin, getFilteredReports);

export default router;