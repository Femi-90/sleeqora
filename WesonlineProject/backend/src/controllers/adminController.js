import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import Admin from '../models/admin.js';
import WeeklyReport from '../models/weeklyReport.js';
import { sendEmail } from '../utils/sendEmail.js';

/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;



/*
|--------------------------------------------------------------------------
| HELPER FUNCTIONS
|--------------------------------------------------------------------------
*/

const normalizeEmail = (email = '') =>
  String(email).trim().toLowerCase();

const normalizeGroupId = (groupId = '') =>
  String(groupId).trim().toUpperCase().replace(/\s+/g, '');

const generateVerificationCode = () =>
  crypto.randomInt(100000, 1000000).toString();

const getAdminDisplayName = (admin) =>
  [
    admin.firstName,
    admin.middleName,
    admin.lastName,
  ]
    .filter(Boolean)
    .join(' ');

const generateAdminToken = (admin) => {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      'JWT_SECRET is not configured in the environment.'
    );
  }

  return jwt.sign(
    {
      id: admin._id.toString(),
      role: 'admin',
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '1d',
    }
  );
};

const sendAdminVerificationEmail = async (
  email,
  firstName,
  verificationCode
) => {
  await sendEmail({
    email,
    subject: 'Verify Your Admin Account',
    message: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Admin Account Verification</h2>
        <p>Hello ${firstName || 'Admin'},</p>
        <p>Use this code to verify your admin email address:</p>
        <h2 style="letter-spacing: 5px;">${verificationCode}</h2>
        <p>This code expires in 15 minutes.</p>
        <p>If you did not request this code, you can ignore this email.</p>
      </div>
    `,
  });
};

/*
|--------------------------------------------------------------------------
| 1. REGISTER ADMIN
|--------------------------------------------------------------------------
| POST /api/admin/register
*/

export const registerAdmin = async (req, res, next) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      email,
      password,
    } = req.body;

    if (
      !firstName ||
      !String(firstName).trim() ||
      !lastName ||
      !String(lastName).trim() ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          'First name, last name, email, and password are required.',
      });
    }

    const cleanEmail = normalizeEmail(email);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least 8 characters.',
      });
    }

    const existingAdmin = await Admin.findOne({
      email: cleanEmail,
    });

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message:
          existingAdmin.isEmailVerified
            ? 'An admin account with this email already exists.'
            : 'An unverified admin account already exists for this email. Request a new verification code or contact support.',
      });
    }

    const verificationCode = generateVerificationCode();
    const now = new Date();
    const codeExpiresAt = new Date(
      now.getTime() + CODE_TTL_MS
    );

    const admin = await Admin.create({
      firstName: String(firstName).trim(),
      middleName: String(middleName || '').trim(),
      lastName: String(lastName).trim(),
      email: cleanEmail,
      password: String(password),
      isAdmin: true,
      isEmailVerified: false,
      verificationCode,
      codeExpiresAt,
      verificationCodeLastSentAt: now,
    });

    try {
      await sendAdminVerificationEmail(
        cleanEmail,
        String(firstName).trim(),
        verificationCode
      );
    } catch (emailError) {
      // Do not leave an account behind when its initial email
      // could not be sent.
      await Admin.deleteOne({
        _id: admin._id,
      });

      console.error(
        'Admin verification email error:',
        emailError.message
      );

      return res.status(500).json({
        success: false,
        message:
          'The verification email could not be sent. Please try registering again.',
      });
    }

    return res.status(201).json({
      success: true,
      message:
        'Registration successful. Check your email for the verification code.',
      admin: {
        id: admin._id,
        firstName: admin.firstName,
        middleName: admin.middleName || '',
        lastName: admin.lastName,
        displayName: getAdminDisplayName(admin),
        email: admin.email,
        isEmailVerified: admin.isEmailVerified,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An admin account with this email already exists.',
      });
    }

    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| 2. VERIFY ADMIN EMAIL
|--------------------------------------------------------------------------
| POST /api/admin/verify-email
|
| Request body:
| {
|   "email": "admin@example.com",
|   "code": "123456"
| }
*/

export const verifyRegistrationCode = async (
  req,
  res,
  next
) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required.',
      });
    }

    const cleanEmail = normalizeEmail(email);
    const cleanCode = String(code).trim();

    if (!/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({
        success: false,
        message: 'Enter the six-digit verification code.',
      });
    }

    const admin = await Admin.findOne({
      email: cleanEmail,
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin account not found.',
      });
    }

    if (admin.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message: 'This admin email has already been verified.',
      });
    }

    const expiryTime = admin.codeExpiresAt
      ? new Date(admin.codeExpiresAt).getTime()
      : NaN;

    if (
      !Number.isFinite(expiryTime) ||
      Date.now() >= expiryTime
    ) {
      return res.status(400).json({
        success: false,
        expired: true,
        message:
          'The verification code has expired. Please request a new code.',
      });
    }

    if (
      !admin.verificationCode ||
      String(admin.verificationCode) !== cleanCode
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code.',
      });
    }

    admin.isEmailVerified = true;
    admin.verificationCode = null;
    admin.codeExpiresAt = null;
    admin.verificationCodeLastSentAt = null;

    await admin.save();

    return res.status(200).json({
      success: true,
      message:
        'Admin email verified successfully. You can now log in.',
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| 3. RESEND ADMIN VERIFICATION CODE
|--------------------------------------------------------------------------
| POST /api/admin/resend-code
|
| Request body:
| {
|   "email": "admin@example.com"
| }
*/

export const resendAdminVerificationCode = async (
  req,
  res,
  next
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.',
      });
    }

    const cleanEmail = normalizeEmail(email);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const admin = await Admin.findOne({
      email: cleanEmail,
    });

    // Use the same general response for unknown or already
    // verified accounts to reduce account enumeration.
    if (!admin || admin.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message:
          'If an unverified admin account exists for this email, a verification code will be sent.',
      });
    }

    const now = Date.now();

    if (admin.verificationCodeLastSentAt) {
      const lastSentTime = new Date(
        admin.verificationCodeLastSentAt
      ).getTime();

      if (Number.isFinite(lastSentTime)) {
        const elapsed = now - lastSentTime;

        if (elapsed < RESEND_COOLDOWN_MS) {
          const retryAfterSeconds = Math.ceil(
            (RESEND_COOLDOWN_MS - elapsed) / 1000
          );

          return res.status(429).json({
            success: false,
            retryAfterSeconds,
            message:
              `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
          });
        }
      }
    }

    // Keep the previous code valid if sending the replacement fails.
    const previousState = {
      verificationCode: admin.verificationCode,
      codeExpiresAt: admin.codeExpiresAt,
      verificationCodeLastSentAt:
        admin.verificationCodeLastSentAt,
    };

    const verificationCode = generateVerificationCode();
    const sentAt = new Date();
    const codeExpiresAt = new Date(
      sentAt.getTime() + CODE_TTL_MS
    );

    admin.verificationCode = verificationCode;
    admin.codeExpiresAt = codeExpiresAt;
    admin.verificationCodeLastSentAt = sentAt;

    await admin.save();

    try {
      await sendAdminVerificationEmail(
        admin.email,
        admin.firstName,
        verificationCode
      );
    } catch (emailError) {
      admin.verificationCode = previousState.verificationCode;
      admin.codeExpiresAt = previousState.codeExpiresAt;
      admin.verificationCodeLastSentAt =
        previousState.verificationCodeLastSentAt;

      await admin.save();

      console.error(
        'Admin resend verification email error:',
        emailError.message
      );

      return res.status(500).json({
        success: false,
        message:
          'The verification email could not be sent. Please try again later.',
      });
    }

    return res.status(200).json({
      success: true,
      message:
        'A new verification code has been sent. It expires in 15 minutes.',
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| 4. ADMIN LOGIN
|--------------------------------------------------------------------------
| POST /api/admin/login
*/

export const loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const admin = await Admin.findOne({
      email: normalizeEmail(email),
    });

    if (!admin || !(await admin.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (!admin.isAdmin) {
      return res.status(403).json({
        success: false,
        message:
          'This account does not have administrator privileges.',
      });
    }

    if (!admin.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message:
          'Please verify your email before logging in.',
      });
    }

    const token = generateAdminToken(admin);

    return res.status(200).json({
      success: true,
      message: 'Admin login successful.',
      token,
      admin: {
        id: admin._id,
        firstName: admin.firstName,
        middleName: admin.middleName || '',
        lastName: admin.lastName,
        displayName: getAdminDisplayName(admin),
        email: admin.email,
        role: 'admin',
        isAdmin: admin.isAdmin,
        isEmailVerified: admin.isEmailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| 5. GET FILTERED REPORTS
|--------------------------------------------------------------------------
| GET /api/admin/reports
|
| Optional filters:
| groupId, week, startDate, endDate
|
| Requires protectAdmin middleware.
*/

export const getFilteredReports = async (
  req,
  res,
  next
) => {
  try {
    const {
      groupId,
      week,
      startDate,
      endDate,
    } = req.query;

    const filter = {};

    if (groupId && String(groupId).trim()) {
      filter.groupId = normalizeGroupId(groupId);
    }

    if (week && String(week).trim()) {
      const cleanWeek = String(week).trim().toUpperCase();

      if (!/^WEEK-(?:[1-9]|[1-4]\d|5[0-2])$/.test(cleanWeek)) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid week. Use WEEK-1 through WEEK-52.',
        });
      }

      filter.week = cleanWeek;
    }

    // Interpret date filters as Nigerian calendar dates.
    if (startDate || endDate) {
      filter.createdAt = {};

      const parseDate = (value) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return null;
        }

        const date = new Date(`${value}T00:00:00.000Z`);

        if (
          Number.isNaN(date.getTime()) ||
          date.toISOString().slice(0, 10) !== value
        ) {
          return null;
        }

        return date;
      };

      if (startDate) {
        const start = parseDate(startDate);

        if (!start) {
          return res.status(400).json({
            success: false,
            message: 'Invalid start date. Use YYYY-MM-DD.',
          });
        }

        // Nigerian midnight is 23:00 UTC on the previous day.
        filter.createdAt.$gte = new Date(
          start.getTime() - 60 * 60 * 1000
        );
      }

      if (endDate) {
        const end = parseDate(endDate);

        if (!end) {
          return res.status(400).json({
            success: false,
            message: 'Invalid end date. Use YYYY-MM-DD.',
          });
        }

        // Exclusive upper bound: midnight after the Nigerian day.
        filter.createdAt.$lt = new Date(
          end.getTime() + 23 * 60 * 60 * 1000
        );
      }

      if (
        filter.createdAt.$gte &&
        filter.createdAt.$lt &&
        filter.createdAt.$gte >= filter.createdAt.$lt
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Start date cannot be later than end date.',
        });
      }
    }

    const reports = await WeeklyReport.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    console.error(
      'Error fetching admin reports:',
      error
    );

    next(error);
  }
};