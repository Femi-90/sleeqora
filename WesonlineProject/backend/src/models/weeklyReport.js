import mongoose from 'mongoose';

const reportDetailsSchema = new mongoose.Schema(
  {
    sessionsHeld: {
      type: Number,
      required: true,
      min: 1,
    },
    sessionDate: {
      type: String,
      required: true,
      trim: true,
    },
    sessionTime: {
      type: String,
      default: '',
      trim: true,
    },
    sessionDuration: {
      type: String,
      required: true,
      trim: true,
    },
    platform: {
      type: String,
      required: true,
      trim: true,
    },
    attendees: {
      type: [String],
      required: true,
      validate: {
        validator: (names) =>
          Array.isArray(names) &&
          names.length >= 1 &&
          names.length <= 7 &&
          names.every(
            (name) =>
              typeof name === 'string' &&
              name.trim().length > 0
          ),
        message:
          'A report must contain between 1 and 7 valid participant names.',
      },
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const weeklyReportSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GroupReport',
      required: true,
      index: true,
    },

    groupId: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    week: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    // Nigerian calendar day on which the server received the report.
    // Format: YYYY-MM-DD. Set by the backend, never by the frontend.
    submittedDay: {
      type: String,
      required: true,
      trim: true,
    },

    leadFirstName: {
      type: String,
      required: true,
      trim: true,
    },
    leadMiddleName: {
      type: String,
      default: '',
      trim: true,
    },
    leadLastName: {
      type: String,
      required: true,
      trim: true,
    },
    leadEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    reportDetails: {
      type: reportDetailsSchema,
      required: true,
    },
  },
  { timestamps: true }
);

// Enforce one report per group per Nigerian calendar day.
// The partial filter allows older documents without submittedDay
// to remain in the collection while the new rule is introduced.
weeklyReportSchema.index(
  { groupId: 1, submittedDay: 1 },
  {
    unique: true,
    partialFilterExpression: {
      submittedDay: { $type: 'string' },
    },
    name: 'one_report_per_group_per_day',
  }
);

// Allows efficient filtering of reports by group and week.
weeklyReportSchema.index({
  groupId: 1,
  week: 1,
  createdAt: -1,
});

const WeeklyReport = mongoose.model(
  'WeeklyReport',
  weeklyReportSchema
);

export default WeeklyReport;