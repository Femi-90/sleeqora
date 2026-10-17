import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const groupReportSchema = new mongoose.Schema(
  {
    // Group identification
    groupId: {
      type: String,
      required: true,
      index: true,
      uppercase: true,
      trim: true,
    },

    // Group lead's personal information
    leadFirstName: {
      type: String,
      required: true,
      trim: true,
    },

    leadMiddleName: {
      type: String,
      trim: true,
      default: '',
    },

    leadLastName: {
      type: String,
      required: true,
      trim: true,
    },

    // Contact information
    leadEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    // Authentication
    password: {
      type: String,
      required: true,
      select: true,
    },

    // Email verification
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    verificationCode: {
      type: String,
      default: null,
    },

    codeExpiresAt: {
      type: Date,
      default: null,
    },

    // Current reporting week
    week: {
      type: String,
      required: true,
      trim: true,
      default: 'WEEK-1',
    },

    // Password reset
    resetPasswordToken: {
      type: String,
      default: undefined,
    },

    resetPasswordExpire: {
      type: Date,
      default: undefined,
    },

    // Weekly group report details
    reportDetails: {
      sessionsHeld: {
        type: Number,
        default: 0,
        min: 0,
      },

      sessionDate: {
        type: String,
        default: '',
        trim: true,
      },

      sessionTime: {
        type: String,
        default: '',
        trim: true,
      },

      sessionDuration: {
        type: String,
        default: '',
        trim: true,
      },

      platform: {
        type: String,
        default: '',
        trim: true,
      },

      attendees: {
        type: [String],
        default: [],
      },

      summary: {
        type: String,
        default: '',
        trim: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Hash the password before saving.
// Only hash it when the password has been modified.
groupReportSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(this.password, salt);
});

// Compare a supplied password with the stored hash.
groupReportSchema.methods.matchPassword = async function (
  enteredPassword
) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Virtual display name for the group lead.
groupReportSchema.virtual('displayName').get(function () {
  return [
    this.leadFirstName,
    this.leadMiddleName,
    this.leadLastName,
  ]
    .filter(Boolean)
    .join(' ');
});

// Export the model.
const GroupReport = mongoose.model(
  'GroupReport',
  groupReportSchema
);

export default GroupReport;