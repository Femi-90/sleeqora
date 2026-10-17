import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');

const GROUP_API = `${API_BASE}/groups`;

const EMPTY_ATTENDEES = ['', '', '', '', '', '', ''];

const SOFT_WHITE = 'rgba(255,255,255,0.85)';

/*
 * Get the JWT for the currently logged-in group.
 * The backend middleware expects:
 * Authorization: Bearer <token>
 */
const getGroupAuthHeaders = () => {
  const token = localStorage.getItem('groupToken');

  if (!token) {
    throw new Error(
      'Your group login session has expired or is missing. Please log in again.'
    );
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

function PostReport({ user }) {
  const loggedInGroupId =
    user?.groupId || localStorage.getItem('groupId') || '';

  // Group leader details
  const [groupId, setGroupId] = useState(loggedInGroupId);
  const [firstName, setFirstName] = useState('');
  const [secondName, setSecondName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  // Report fields
  const [week, setWeek] = useState(user?.week || 'WEEK-1');
  const [numberOfSessions, setNumberOfSessions] = useState('');
  const [date, setDate] = useState('');
  const [duration, setDuration] = useState('15 minutes');
  const [platform, setPlatform] = useState('');
  const [summary, setSummary] = useState('');
  const [attendees, setAttendees] = useState(EMPTY_ATTENDEES);

  // Form status
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingUser, setFetchingUser] = useState(true);
  const [checkingSubmission, setCheckingSubmission] = useState(true);

  const [alreadySubmittedToday, setAlreadySubmittedToday] =
    useState(false);

  const [submittedDay, setSubmittedDay] = useState('');

  /*
   * Load the group account and today's submission status.
   */
  useEffect(() => {
    let cancelled = false;

    const loadPageData = async () => {
      if (!loggedInGroupId) {
        setError(
          'Your Group ID is missing. Please log in again before submitting a report.'
        );

        setFetchingUser(false);
        setCheckingSubmission(false);
        return;
      }

      setFetchingUser(true);
      setCheckingSubmission(true);
      setError('');
      setSuccess('');

      try {
        /*
         * IMPORTANT:
         * Use the JWT instead of the old x-group-id header.
         */
        const authHeaders = getGroupAuthHeaders();

        // Fetch authenticated group account details.
        const response = await axios.get(
          `${GROUP_API}/me`,
          {
            headers: authHeaders,
          }
        );

        if (cancelled) return;

        const account = response.data?.user;

        if (!account) {
          throw new Error(
            'The server did not return your group leader details.'
          );
        }

        const currentGroupId =
          account.groupId || loggedInGroupId;

        setGroupId(currentGroupId);

        setFirstName(
          account.firstName ||
            account.leadFirstName ||
            ''
        );

        setSecondName(
          account.middleName ||
            account.secondName ||
            account.leadMiddleName ||
            ''
        );

        setLastName(
          account.lastName ||
            account.leadLastName ||
            ''
        );

        setEmail(
          account.email ||
            account.leadEmail ||
            ''
        );

        if (account.week) {
          setWeek(account.week);
        }

        /*
         * Check whether the group has already submitted today.
         * The same JWT is sent to this protected route.
         */
        const statusResponse = await axios.get(
          `${GROUP_API}/reports/today`,
          {
            headers: getGroupAuthHeaders(),
          }
        );

        if (cancelled) return;

        const status = statusResponse.data;

        setAlreadySubmittedToday(
          Boolean(status?.alreadySubmitted)
        );

        setSubmittedDay(status?.submittedDay || '');

        if (status?.alreadySubmitted) {
          setSuccess(
            'Your group has already submitted its report today. You can submit another report tomorrow.'
          );
        }
      } catch (err) {
        if (cancelled) return;

        console.error(
          'Error loading report page:',
          err.response?.data || err.message
        );

        if (
          err.message?.includes('group login session')
        ) {
          setError(
            'Your group login session is missing. Please log out, log in again, and retry.'
          );
        } else if (err.response?.status === 401) {
          setError(
            'Your group session could not be authenticated. Please log out and log in again. If the problem continues, check the JWT configuration in your backend.'
          );
        } else if (err.response?.status === 403) {
          setError(
            err.response?.data?.message ||
              'Access denied. Please verify that your group account is authorized.'
          );
        } else {
          setError(
            err.response?.data?.message ||
              err.message ||
              'Unable to load your account or daily submission status. Please refresh the page or log in again.'
          );
        }
      } finally {
        if (!cancelled) {
          setFetchingUser(false);
          setCheckingSubmission(false);
        }
      }
    };

    loadPageData();

    return () => {
      cancelled = true;
    };
  }, [loggedInGroupId]);

  /*
   * Update attendee names.
   */
  const handleAttendeeChange = (index, value) => {
    setAttendees((previous) =>
      previous.map((name, i) =>
        i === index ? value : name
      )
    );
  };

  /*
   * Submit the report.
   */
  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (fetchingUser || checkingSubmission) {
      setError(
        'Please wait while your account is being checked.'
      );
      return;
    }

    if (!groupId) {
      setError(
        'Group ID is missing. Please log in again.'
      );
      return;
    }

    if (alreadySubmittedToday) {
      setError(
        'Your group has already submitted a report today. Please try again tomorrow.'
      );
      return;
    }

    if (!week.trim()) {
      setError(
        'Please select the reporting week.'
      );
      return;
    }

    const sessions = Number(numberOfSessions);

    if (
      numberOfSessions === '' ||
      !Number.isInteger(sessions) ||
      sessions < 1
    ) {
      setError(
        'Please enter a valid number of sessions.'
      );
      return;
    }

    if (!date) {
      setError(
        'Please select the session date.'
      );
      return;
    }

    if (!duration.trim()) {
      setError(
        'Please select the session duration.'
      );
      return;
    }

    if (!platform.trim()) {
      setError(
        'Please select the meeting platform.'
      );
      return;
    }

    if (!summary.trim()) {
      setError(
        'Please provide a summary of the session.'
      );
      return;
    }

    const cleanedAttendees = attendees
      .map((name) => name.trim())
      .filter(Boolean);

    if (cleanedAttendees.length === 0) {
      setError(
        'Please enter at least one attendee name.'
      );
      return;
    }

    if (cleanedAttendees.length > 7) {
      setError(
        'A maximum of seven attendees is allowed.'
      );
      return;
    }

    const payload = {
      week: week.trim().toUpperCase(),

      reportDetails: {
        sessionsHeld: sessions,
        sessionDate: date,
        sessionTime: '',
        sessionDuration: duration,
        platform: platform.trim(),
        attendees: cleanedAttendees,
        summary: summary.trim(),
      },
    };

    try {
      setLoading(true);

      /*
       * Submit the report with the group JWT.
       * Do not use the old x-group-id header.
       */
      const response = await axios.post(
        `${GROUP_API}/reports`,
        payload,
        {
          headers: {
            ...getGroupAuthHeaders(),
            'Content-Type': 'application/json',
          },
        }
      );

      setAlreadySubmittedToday(true);

      setSubmittedDay(
        response.data?.report?.submittedDay || ''
      );

      setSuccess(
        response.data?.message ||
          'Report submitted successfully. You cannot submit another report today.'
      );

      // Clear report fields after successful submission.
      setNumberOfSessions('');
      setDate('');
      setDuration('15 minutes');
      setPlatform('');
      setSummary('');
      setAttendees([...EMPTY_ATTENDEES]);
    } catch (err) {
      console.error(
        'Error submitting report:',
        err.response?.data || err.message
      );

      if (
        err.response?.status === 409 &&
        err.response?.data?.alreadySubmitted
      ) {
        setAlreadySubmittedToday(true);

        setSuccess(
          err.response.data.message ||
            'Your group has already submitted a report today.'
        );

        setError('');
      } else if (err.response?.status === 401) {
        setError(
          'Your group login session is invalid or has expired. Please log out and log in again before submitting your report.'
        );
      } else if (err.response?.status === 403) {
        setError(
          err.response?.data?.message ||
            'You are not authorized to submit this report.'
        );
      } else {
        setError(
          err.response?.data?.message ||
            err.message ||
            'Failed to submit the report. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    page: {
      minHeight: '100vh',
      width: '100%',
      padding: '30px 25px',
      boxSizing: 'border-box',
      backgroundImage: "url('/static03.jpeg')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
    },

    container: {
      maxWidth: '1100px',
      margin: '20px auto',
      backgroundColor: 'rgba(23, 77, 42, 0.92)',
      border: '1px solid rgba(222, 255, 225, 0.27)',
      color: '#ffffff',
      fontSize: '18px',
      padding: '40px',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      boxSizing: 'border-box',
    },

    heading: {
      marginTop: 0,
      marginBottom: '10px',
      color: '#ffffff',
      fontSize: '36px',
      textAlign: 'center',
    },

    subtitle: {
      textAlign: 'center',
      color: SOFT_WHITE,
      fontSize: '18px',
      marginTop: 0,
      marginBottom: '32px',
      lineHeight: 1.5,
    },

    sectionHeading: {
      fontSize: '24px',
      color: '#ffffff',
      borderBottom: '1px solid rgba(255, 255, 255, 0.25)',
      paddingBottom: '12px',
      marginTop: '34px',
      marginBottom: '22px',
    },

    grid: {
      display: 'grid',
      gridTemplateColumns:
        'repeat(auto-fit, minmax(260px, 1fr))',
      gap: '22px',
    },

    field: {
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
    },

    label: {
      fontWeight: 600,
      marginBottom: '9px',
      color: '#ffffff',
      fontSize: '17px',
    },

    input: {
      width: '100%',
      boxSizing: 'border-box',
      padding: '14px',
      border: '1px solid rgba(210, 255, 216, 0.35)',
      borderRadius: '8px',
      fontSize: '17px',
      backgroundColor: 'rgba(255, 255, 255, 0.09)',
      color: '#ffffff',
      fontFamily: 'inherit',
    },

    readOnlyInput: {
      width: '100%',
      boxSizing: 'border-box',
      padding: '14px',
      border: '1px solid rgba(210, 255, 216, 0.2)',
      borderRadius: '8px',
      fontSize: '17px',
      backgroundColor: 'rgba(0, 0, 0, 0.25)',
      color: SOFT_WHITE,
      fontFamily: 'inherit',
    },

    textarea: {
      width: '100%',
      boxSizing: 'border-box',
      padding: '14px',
      border: '1px solid rgba(210, 255, 216, 0.35)',
      borderRadius: '8px',
      fontSize: '17px',
      minHeight: '170px',
      resize: 'vertical',
      fontFamily: 'inherit',
      backgroundColor: 'rgba(255, 255, 255, 0.09)',
      color: '#ffffff',
    },

    message: {
      padding: '14px 16px',
      borderRadius: '8px',
      marginBottom: '22px',
      fontSize: '16px',
      lineHeight: 1.5,
      color: '#ffffff',
      overflowWrap: 'anywhere',
    },

    error: {
      backgroundColor: 'rgba(153, 27, 27, 0.45)',
      border: '1px solid rgba(252, 165, 165, 0.35)',
    },

    success: {
      backgroundColor: 'rgba(22, 101, 52, 0.5)',
      border: '1px solid rgba(134, 239, 172, 0.4)',
    },

    note: {
      color: SOFT_WHITE,
      fontSize: '15px',
      lineHeight: 1.5,
      marginBottom: '20px',
    },

    button: {
      width: '100%',
      padding: '17px',
      marginTop: '32px',
      backgroundColor: 'rgba(46, 125, 50, 0.9)',
      color: '#ffffff',
      border: '1px solid rgba(165, 214, 167, 0.5)',
      borderRadius: '8px',
      fontSize: '19px',
      fontWeight: 600,
      fontFamily: 'inherit',
      cursor: 'pointer',
    },

    disabledButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
      color: 'rgba(255, 255, 255, 0.75)',
      cursor: 'not-allowed',
    },
  };

  const submissionBlocked =
    loading ||
    fetchingUser ||
    checkingSubmission ||
    !groupId ||
    alreadySubmittedToday;

  return (
    <div className="post-report-page" style={styles.page}>
      <style>
        {`
          .post-report-page ::placeholder {
            color: rgba(255, 255, 255, 0.65);
            opacity: 1;
          }

          .post-report-page input[type="date"] {
            color-scheme: dark;
          }

          .post-report-page option {
            background-color: #174d2a;
            color: #ffffff;
          }

          .post-report-page input:disabled,
          .post-report-page select:disabled,
          .post-report-page textarea:disabled {
            opacity: 0.65;
            color: #ffffff;
            -webkit-text-fill-color: #ffffff;
            cursor: not-allowed;
          }

          .post-report-page input:focus,
          .post-report-page select:focus,
          .post-report-page textarea:focus {
            outline: none;
            border-color: #a5d6a7 !important;
            box-shadow: 0 0 0 3px rgba(165, 214, 167, 0.2);
          }
        `}
      </style>

      <div style={styles.container}>
        <h1 style={styles.heading}>
          Group Session Report
        </h1>

        <p style={styles.subtitle}>
          Complete this form to submit your group's mentoring
          session report.
        </p>

        {error && (
          <div
            role="alert"
            style={{
              ...styles.message,
              ...styles.error,
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            style={{
              ...styles.message,
              ...styles.success,
            }}
          >
            {success}
          </div>
        )}

        {submittedDay && (
          <p style={styles.note}>
            Submission date checked using Nigeria time:{' '}
            <strong>{submittedDay}</strong>
          </p>
        )}

        {(fetchingUser || checkingSubmission) && (
          <p
            style={{
              textAlign: 'center',
              color: SOFT_WHITE,
            }}
          >
            Checking your account and today's submission
            status...
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <h2 style={styles.sectionHeading}>
            Group Leader Information
          </h2>

          <div style={styles.grid}>
            <div style={styles.field}>
              <label
                style={styles.label}
                htmlFor="groupId"
              >
                Group ID
              </label>

              <input
                id="groupId"
                value={groupId}
                readOnly
                style={styles.readOnlyInput}
              />
            </div>

            <div style={styles.field}>
              <label
                style={styles.label}
                htmlFor="week"
              >
                Reporting Week
              </label>

              <select
                id="week"
                value={week}
                onChange={(e) =>
                  setWeek(e.target.value)
                }
                required
                style={styles.input}
                disabled={submissionBlocked}
              >
                {Array.from(
                  { length: 52 },
                  (_, index) => `WEEK-${index + 1}`
                ).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label
                style={styles.label}
                htmlFor="firstName"
              >
                First Name
              </label>

              <input
                id="firstName"
                value={firstName}
                readOnly
                style={styles.readOnlyInput}
              />
            </div>

            <div style={styles.field}>
              <label
                style={styles.label}
                htmlFor="secondName"
              >
                Middle Name
              </label>

              <input
                id="secondName"
                value={secondName}
                readOnly
                style={styles.readOnlyInput}
              />
            </div>

            <div style={styles.field}>
              <label
                style={styles.label}
                htmlFor="lastName"
              >
                Last Name
              </label>

              <input
                id="lastName"
                value={lastName}
                readOnly
                style={styles.readOnlyInput}
              />
            </div>

            <div style={styles.field}>
              <label
                style={styles.label}
                htmlFor="email"
              >
                Email Address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                readOnly
                style={styles.readOnlyInput}
              />
            </div>
          </div>

          <h2 style={styles.sectionHeading}>
            Session Information
          </h2>

          <div style={styles.grid}>
            <div style={styles.field}>
              <label
                style={styles.label}
                htmlFor="numberOfSessions"
              >
                Number of Sessions Held
              </label>

              <input
                id="numberOfSessions"
                type="number"
                min="1"
                step="1"
                value={numberOfSessions}
                onChange={(e) =>
                  setNumberOfSessions(e.target.value)
                }
                placeholder="Enter number of sessions"
                required
                style={styles.input}
                disabled={submissionBlocked}
              />
            </div>

            <div style={styles.field}>
              <label
                style={styles.label}
                htmlFor="date"
              >
                Session Date
              </label>

              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) =>
                  setDate(e.target.value)
                }
                required
                style={styles.input}
                disabled={submissionBlocked}
              />
            </div>

            <div style={styles.field}>
              <label
                style={styles.label}
                htmlFor="duration"
              >
                Session Duration
              </label>

              <select
                id="duration"
                value={duration}
                onChange={(e) =>
                  setDuration(e.target.value)
                }
                required
                style={styles.input}
                disabled={submissionBlocked}
              >
                <option value="15 minutes">
                  15 minutes
                </option>

                <option value="30 minutes">
                  30 minutes
                </option>

                <option value="45 minutes">
                  45 minutes
                </option>

                <option value="1 hour">
                  1 hour
                </option>

                <option value="1 hour 30 minutes">
                  1 hour 30 minutes
                </option>

                <option value="2 hours">
                  2 hours
                </option>

                <option value="Other">
                  Other
                </option>
              </select>
            </div>

            <div style={styles.field}>
              <label
                style={styles.label}
                htmlFor="platform"
              >
                Meeting Platform
              </label>

              <select
                id="platform"
                value={platform}
                onChange={(e) =>
                  setPlatform(e.target.value)
                }
                required
                style={styles.input}
                disabled={submissionBlocked}
              >
                <option value="">
                  Select platform
                </option>

                <option value="WhatsApp">
                  WhatsApp
                </option>

                <option value="Google Meet">
                  Google Meet
                </option>

                <option value="Zoom">
                  Zoom
                </option>

                <option value="Telegram">
                  Telegram
                </option>

                <option value="Microsoft Teams">
                  Microsoft Teams
                </option>

                <option value="Physical Meeting">
                  Physical Meeting
                </option>

                <option value="Other">
                  Other
                </option>
              </select>
            </div>
          </div>

          <h2 style={styles.sectionHeading}>
            Attendees
          </h2>

          <p style={styles.note}>
            Enter the names of up to seven attendees.
            Empty fields will not be submitted.
          </p>

          <div style={styles.grid}>
            {attendees.map((attendee, index) => (
              <div
                style={styles.field}
                key={index}
              >
                <label
                  style={styles.label}
                  htmlFor={`attendee-${index + 1}`}
                >
                  Attendee {index + 1}
                </label>

                <input
                  id={`attendee-${index + 1}`}
                  value={attendee}
                  onChange={(e) =>
                    handleAttendeeChange(
                      index,
                      e.target.value
                    )
                  }
                  placeholder={`Enter attendee ${index + 1} name`}
                  style={styles.input}
                  disabled={submissionBlocked}
                />
              </div>
            ))}
          </div>

          <h2 style={styles.sectionHeading}>
            Session Summary
          </h2>

          <div style={styles.field}>
            <label
              style={styles.label}
              htmlFor="summary"
            >
              Summary of Activities
            </label>

            <textarea
              id="summary"
              value={summary}
              onChange={(e) =>
                setSummary(e.target.value)
              }
              placeholder="Describe the topics discussed, activities carried out, challenges encountered, and outcomes of the session..."
              required
              style={styles.textarea}
              disabled={submissionBlocked}
            />
          </div>

          <button
            type="submit"
            disabled={submissionBlocked}
            style={{
              ...styles.button,
              ...(submissionBlocked
                ? styles.disabledButton
                : {}),
            }}
          >
            {fetchingUser || checkingSubmission
              ? 'Checking Submission Status...'
              : loading
              ? 'Submitting Report...'
              : alreadySubmittedToday
              ? 'Report Already Submitted Today'
              : 'Submit Report'}
          </button>

          {alreadySubmittedToday && (
            <p style={styles.note}>
              Your group can submit another report when
              the Nigerian calendar day changes.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default PostReport;