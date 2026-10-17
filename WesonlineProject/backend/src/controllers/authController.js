import crypto from 'crypto';
import Admin from '../models/admin.js';
import GroupReport from '../models/groupReport.js';
import { sendEmail } from '../utils/sendEmail.js';

/**
 * Request a password reset.
 * Supports administrators and group leads.
 *
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res, next) => {
  let user = null;

  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find an administrator first.
    user = await Admin.findOne({ email: cleanEmail });

    // If not an administrator, look for a group lead.
    if (!user) {
      user = await GroupReport.findOne({
        leadEmail: cleanEmail,
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with that email address.',
      });
    }

    // Generate a cryptographically secure reset token.
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Store only the SHA-256 hash of the token.
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Token expires after 10 minutes.
    user.resetPasswordExpire = new Date(
      Date.now() + 10 * 60 * 1000
    );

    await user.save({ validateBeforeSave: false });

    // Construct the FRONTEND reset URL.
    const frontendUrl = (
      process.env.FRONTEND_URL || 'http://localhost:5173'
    ).replace(/\/+$/, '');

    const resetUrl =
      `${frontendUrl}/reset-password/${resetToken}`;

    const message = [
      'You requested a password reset for your Group Portal account.',
      '',
      'Open the link below to reset your password:',
      '',
      resetUrl,
      '',
      'This link expires in 10 minutes.',
      'If you did not request this reset, you can ignore this email.',
    ].join('\n');

    // Send the reset email.
    await sendEmail({
      email: user.email || user.leadEmail,
      subject: 'Group Portal Password Reset',
      message,
    });

    return res.status(200).json({
      success: true,
      message: 'Password reset instructions have been sent to your email.',
    });
  } catch (error) {
    // Clear the token if the email or another step fails.
    if (user) {
      try {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save({ validateBeforeSave: false });
      } catch (cleanupError) {
        console.error(
          'Failed to clear password reset token:',
          cleanupError.message
        );
      }
    }

    next(error);
  }
};

/**
 * Reset a password using a valid reset token.
 * Supports administrators and group leads.
 *
 * POST /api/auth/reset-password/:token
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    // Validate the reset token.
    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'A valid password reset token is required.',
      });
    }

    // Validate the new password.
    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please enter a new password.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Your password must contain at least 8 characters.',
      });
    }

    if (password.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'Your password must not exceed 128 characters.',
      });
    }

    // Confirm that both passwords match.
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'The passwords do not match.',
      });
    }

    // Hash the token to compare it with the database value.
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Only accept tokens that have not expired.
    const tokenQuery = {
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: new Date() },
    };

    // Search for the administrator first.
    let user = await Admin.findOne(tokenQuery);

    // If not found, search for a group lead.
    if (!user) {
      user = await GroupReport.findOne(tokenQuery);
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          'The reset link is invalid or has expired. Please request a new one.',
      });
    }

    /*
     * Update the password.
     *
     * Both models have a pre-save hook that hashes the password
     * with bcryptjs when the password field changes.
     */
    user.password = password;

    // Invalidate the reset token to prevent reuse.
    user.set({
      resetPasswordToken: undefined,
      resetPasswordExpire: undefined,
    });

    // Save the new password and clear the token.
    await user.save();

    return res.status(200).json({
      success: true,
      message:
        'Your password has been reset successfully. You can now log in.',
    });
  } catch (error) {
    next(error);
  }
};