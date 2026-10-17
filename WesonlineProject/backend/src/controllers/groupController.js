import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import GroupReport from '../models/groupReport.js';
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

const normalizeGroupId = (groupId = '') =>
  String(groupId).trim().toUpperCase().replace(/\s+/g, '');

const normalizeEmail = (email = '') =>
  String(email).trim().toLowerCase();

const generateVerificationCode = () =>
  crypto.randomInt(100000, 1000000).toString();

const getFullName = (group) =>
  [
    group.leadFirstName,
    group.leadMiddleName,
    group.leadLastName,
  ]
    .filter(Boolean)
    .join(' ');

const sendGroupVerificationEmail = async (
  email,
  firstName,
  verificationCode
) => {
  await sendEmail({
    email,
    subject: 'Verify Your Group Mentorship Account',
    message: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Group Mentorship Account Verification</h2>
        <p>Hello ${firstName || 'Group Lead'},</p>
        <p>
          Use the verification code below to verify your email address.
        </p>
        <h2 style="letter-spacing: 5px;">${verificationCode}</h2>
        <p>This code expires in 15 minutes.</p>
        <p>If you did not request this code, you can ignore this email.</p>
      </div>
    `,
  });
};

// Return today's date in Africa/Lagos as YYYY-MM-DD.
const getLagosDay = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return `${values.year}-${values.month}-${values.day}`;
};

/*
|--------------------------------------------------------------------------
| 1. REGISTER GROUP
|--------------------------------------------------------------------------
| POST /api/groups/register
*/

export const registerGroup = async (req, res, next) => {
  try {
    const {
      groupId,
      leadFirstName,
      leadMiddleName,
      leadLastName,
      leadEmail,
      password,
    } = req.body;

    if (
      !groupId ||
      !leadFirstName ||
      !leadLastName ||
      !leadEmail ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please provide Group ID, first name, last name, email, and password.',
      });
    }

    const email = normalizeEmail(leadEmail);
    const cleanGroupId = normalizeGroupId(groupId);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
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

    const existingGroup = await GroupReport.findOne({
      groupId: cleanGroupId,
    });

    if (existingGroup) {
      return res.status(409).json({
        success: false,
        message: existingGroup.isEmailVerified
          ? 'This Group ID is already registered.'
          : 'This Group ID already has an unverified registration. Request a new verification code or contact support.',
      });
    }

    const existingEmail = await GroupReport.findOne({
      leadEmail: email,
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'This email address is already registered.',
      });
    }

    const verificationCode = generateVerificationCode();
    const now = new Date();

    const codeExpiresAt = new Date(
      now.getTime() + CODE_TTL_MS
    );

    // Create the group account, not a weekly report.
    const group = await GroupReport.create({
      groupId: cleanGroupId,
      leadFirstName: String(leadFirstName).trim(),
      leadMiddleName: String(leadMiddleName || '').trim(),
      leadLastName: String(leadLastName).trim(),
      leadEmail: email,
      password: String(password),
      week: 'WEEK-1',
      isEmailVerified: false,
      verificationCode,
      codeExpiresAt,
      verificationCodeLastSentAt: now,
    });

    try {
      await sendGroupVerificationEmail(
        email,
        String(leadFirstName).trim(),
        verificationCode
      );
    } catch (emailError) {
      await GroupReport.deleteOne({
        _id: group._id,
      });

      console.error(
        'Group verification email error:',
        emailError.message
      );

      return res.status(500).json({
        success: false,
        message:
          'Your verification email could not be sent. Please check the email address and try registering again.',
      });
    }

    return res.status(201).json({
      success: true,
      message:
        'Registration successful. A verification code has been sent to your email address.',
      group: {
        groupId: group.groupId,
        leadFirstName: group.leadFirstName,
        leadMiddleName: group.leadMiddleName || '',
        leadLastName: group.leadLastName,
        leadEmail: group.leadEmail,
        isEmailVerified: group.isEmailVerified,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          'This Group ID or email address is already registered.',
      });
    }

    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| 2. VERIFY GROUP EMAIL
|--------------------------------------------------------------------------
| POST /api/groups/verify-email
|
| Request body:
| {
|   "groupId": "GRP001",
|   "code": "123456"
| }
*/

export const verifyGroupRegistration = async (
  req,
  res,
  next
) => {
  try {
    const { groupId, code } = req.body;

    if (!groupId || !code) {
      return res.status(400).json({
        success: false,
        message:
          'Group ID and verification code are required.',
      });
    }

    const cleanGroupId = normalizeGroupId(groupId);
    const cleanCode = String(code).trim();

    if (!/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({
        success: false,
        message: 'Enter the six-digit verification code.',
      });
    }

    const group = await GroupReport.findOne({
      groupId: cleanGroupId,
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group account not found.',
      });
    }

    if (group.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message:
          'This email address has already been verified.',
      });
    }

    const expiryTime = group.codeExpiresAt
      ? new Date(group.codeExpiresAt).getTime()
      : NaN;

    if (
      !Number.isFinite(expiryTime) ||
      Date.now() >= expiryTime
    ) {
      return res.status(400).json({
        success: false,
        expired: true,
        message:
          'Your verification code has expired. Please request a new code.',
      });
    }

    if (
      !group.verificationCode ||
      String(group.verificationCode) !== cleanCode
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code.',
      });
    }

    group.isEmailVerified = true;
    group.verificationCode = null;
    group.codeExpiresAt = null;
    group.verificationCodeLastSentAt = null;

    await group.save();

    return res.status(200).json({
      success: true,
      message:
        'Email verified successfully. You can now log in to your account.',
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| 3. RESEND GROUP VERIFICATION CODE
|--------------------------------------------------------------------------
| POST /api/groups/resend-code
|
| Request body:
| {
|   "groupId": "GRP001"
| }
*/

export const resendGroupVerificationCode = async (
  req,
  res,
  next
) => {
  try {
    const { groupId } = req.body;

    if (!groupId || !String(groupId).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Group ID is required.',
      });
    }

    const cleanGroupId = normalizeGroupId(groupId);

    const group = await GroupReport.findOne({
      groupId: cleanGroupId,
    });

    // Avoid revealing whether an account exists.
    if (!group || group.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message:
          'If an unverified group account exists, a verification code will be sent.',
      });
    }

    const now = Date.now();

    if (group.verificationCodeLastSentAt) {
      const lastSentTime = new Date(
        group.verificationCodeLastSentAt
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

    // Preserve the previous code if sending the replacement fails.
    const previousState = {
      verificationCode: group.verificationCode,
      codeExpiresAt: group.codeExpiresAt,
      verificationCodeLastSentAt:
        group.verificationCodeLastSentAt,
    };

    const verificationCode = generateVerificationCode();
    const sentAt = new Date();

    const codeExpiresAt = new Date(
      sentAt.getTime() + CODE_TTL_MS
    );

    group.verificationCode = verificationCode;
    group.codeExpiresAt = codeExpiresAt;
    group.verificationCodeLastSentAt = sentAt;

    await group.save();

    try {
      await sendGroupVerificationEmail(
        group.leadEmail,
        group.leadFirstName,
        verificationCode
      );
    } catch (emailError) {
      group.verificationCode = previousState.verificationCode;
      group.codeExpiresAt = previousState.codeExpiresAt;

      group.verificationCodeLastSentAt =
        previousState.verificationCodeLastSentAt;

      await group.save();

      console.error(
        'Group resend verification email error:',
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
| 4. GROUP LOGIN
|--------------------------------------------------------------------------
| POST /api/groups/login
|
| Returns:
| {
|   success: true,
|   token: "<JWT>",
|   user: { ... }
| }
*/

export const loginGroup = async (req, res, next) => {
  try {
    const { groupId, password } = req.body;

    if (!groupId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Group ID and password are required.',
      });
    }

    const cleanGroupId = normalizeGroupId(groupId);

    const group = await GroupReport.findOne({
      groupId: cleanGroupId,
    });

    if (!group) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Group ID or password.',
      });
    }

    if (!group.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message:
          'Please verify your email address before logging in.',
      });
    }

    const passwordIsValid = await group.matchPassword(password);

    if (!passwordIsValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Group ID or password.',
      });
    }

    // Ensure the JWT secret is configured.
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error(
        'JWT_SECRET is missing from the backend environment.'
      );

      return res.status(500).json({
        success: false,
        message:
          'Authentication service is not configured correctly.',
      });
    }

    // Generate a JWT compatible with protectGroupLead.
    const token = jwt.sign(
      {
        id: group._id.toString(),
        groupId: group.groupId,
        role: 'learner',
      },
      jwtSecret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: group._id,
        groupId: group.groupId,

        leadFirstName: group.leadFirstName,
        leadMiddleName: group.leadMiddleName || '',
        leadLastName: group.leadLastName,
        leadEmail: group.leadEmail,

        firstName: group.leadFirstName,
        secondName: group.leadMiddleName || '',
        lastName: group.leadLastName,
        email: group.leadEmail,

        name: getFullName(group),
        role: 'learner',
        isEmailVerified: group.isEmailVerified,
        week: group.week || 'WEEK-1',
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| 5. GET LOGGED-IN GROUP DETAILS
|--------------------------------------------------------------------------
| GET /api/groups/me
|
| Requires protectGroupLead middleware.
*/

export const getMyGroup = async (req, res, next) => {
  try {
    const group = req.group;

    if (!group) {
      return res.status(401).json({
        success: false,
        message: 'Group authentication is required.',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: group._id,
        groupId: group.groupId,

        firstName: group.leadFirstName,
        secondName: group.leadMiddleName || '',
        lastName: group.leadLastName,
        email: group.leadEmail,

        leadFirstName: group.leadFirstName,
        leadMiddleName: group.leadMiddleName || '',
        leadLastName: group.leadLastName,
        leadEmail: group.leadEmail,

        name: getFullName(group),
        week: group.week || 'WEEK-1',
        isEmailVerified: group.isEmailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| 6. CHECK TODAY'S SUBMISSION STATUS
|--------------------------------------------------------------------------
| GET /api/groups/reports/today
|
| Requires protectGroupLead middleware.
*/

export const getTodaySubmissionStatus = async (
  req,
  res,
  next
) => {
  try {
    const group = req.group;

    if (!group) {
      return res.status(401).json({
        success: false,
        message: 'Group authentication is required.',
      });
    }

    const submittedDay = getLagosDay();

    const existingReport = await WeeklyReport.findOne({
      groupId: normalizeGroupId(group.groupId),
      submittedDay,
    })
      .select('_id submittedDay createdAt')
      .lean();

    return res.status(200).json({
      success: true,
      submittedDay,
      alreadySubmitted: Boolean(existingReport),
      submittedAt: existingReport?.createdAt || null,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| 7. SUBMIT GROUP REPORT
|--------------------------------------------------------------------------
| POST /api/groups/reports
|
| Requires protectGroupLead middleware.
*/

export const submitReport = async (req, res, next) => {
  try {
    const group = req.group;
    const { week, reportDetails } = req.body;

    if (!group) {
      return res.status(401).json({
        success: false,
        message: 'Group authentication is required.',
      });
    }

    if (!week || !String(week).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reporting week is required.',
      });
    }

    if (
      !reportDetails ||
      typeof reportDetails !== 'object' ||
      Array.isArray(reportDetails)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid report details are required.',
      });
    }

    const {
      sessionsHeld,
      sessionDate,
      sessionTime,
      sessionDuration,
      platform,
      attendees,
      summary,
    } = reportDetails;

    const parsedSessions = Number(sessionsHeld);

    if (
      sessionsHeld === undefined ||
      sessionsHeld === null ||
      sessionsHeld === '' ||
      !Number.isInteger(parsedSessions) ||
      parsedSessions < 1
    ) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid number of sessions held.',
      });
    }

    if (!sessionDate || !String(sessionDate).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Session date is required.',
      });
    }

    if (!sessionDuration || !String(sessionDuration).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Session duration is required.',
      });
    }

    if (!platform || !String(platform).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Meeting platform is required.',
      });
    }

    if (!summary || !String(summary).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Session summary is required.',
      });
    }

    if (!Array.isArray(attendees)) {
      return res.status(400).json({
        success: false,
        message:
          'Attendees must be provided as an array of names.',
      });
    }

    const cleanedAttendees = attendees
      .filter((name) => typeof name === 'string')
      .map((name) => name.trim())
      .filter(Boolean);

    if (cleanedAttendees.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          'Please provide at least one attendee name.',
      });
    }

    if (cleanedAttendees.length > 7) {
      return res.status(400).json({
        success: false,
        message:
          'A maximum of seven attendees is allowed.',
      });
    }

    const cleanWeek = String(week).trim().toUpperCase();

    if (!/^WEEK-(?:[1-9]|[1-4]\d|5[0-2])$/.test(cleanWeek)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid reporting week. Use WEEK-1 through WEEK-52.',
      });
    }

    // Calculate submission date using Lagos time.
    const submittedDay = getLagosDay();
    const cleanGroupId = normalizeGroupId(group.groupId);

    const existingReport = await WeeklyReport.findOne({
      groupId: cleanGroupId,
      submittedDay,
    })
      .select('_id')
      .lean();

    if (existingReport) {
      return res.status(409).json({
        success: false,
        alreadySubmitted: true,
        message:
          'Your group has already submitted a report today. Please submit another report tomorrow.',
      });
    }

    try {
      const report = await WeeklyReport.create({
        group: group._id,
        groupId: cleanGroupId,
        week: cleanWeek,
        submittedDay,

        leadFirstName: group.leadFirstName,
        leadMiddleName: group.leadMiddleName || '',
        leadLastName: group.leadLastName,
        leadEmail: normalizeEmail(group.leadEmail),

        reportDetails: {
          sessionsHeld: parsedSessions,
          sessionDate: String(sessionDate).trim(),
          sessionTime: String(sessionTime || '').trim(),
          sessionDuration: String(sessionDuration).trim(),
          platform: String(platform).trim(),
          attendees: cleanedAttendees,
          summary: String(summary).trim(),
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Group report submitted successfully.',
        report: {
          id: report._id,
          groupId: report.groupId,
          week: report.week,
          submittedDay: report.submittedDay,

          leadFirstName: report.leadFirstName,
          leadMiddleName: report.leadMiddleName,
          leadLastName: report.leadLastName,
          leadEmail: report.leadEmail,

          reportDetails: report.reportDetails,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
        },
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          alreadySubmitted: true,
          message:
            'Your group has already submitted a report today. Please submit another report tomorrow.',
        });
      }

      throw error;
    }
  } catch (error) {
    next(error);
  }
};