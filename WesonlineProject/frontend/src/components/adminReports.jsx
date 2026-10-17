import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');

const REPORTS_URL = `${API_BASE}/admin/reports`;

const GROUP_OPTIONS = [
  { value: 'GRP001', label: 'GRP001' },
  { value: 'GRP002', label: 'GRP002' },
  { value: 'GRP003', label: 'GRP003' },
];

const WEEK_OPTIONS = Array.from(
  { length: 52 },
  (_, index) => `WEEK-${index + 1}`
);

const FILTER_MODES = [
  {
    value: 'group-all-weeks',
    label: 'One Group — All Weeks',
    description: 'Retrieve reports for one group across all weeks.',
  },
  {
    value: 'group-one-week',
    label: 'One Group — One Week',
    description: 'Retrieve reports for one group during a selected week.',
  },
  {
    value: 'week-all-groups',
    label: 'One Week — All Groups',
    description: 'Retrieve reports from every group during one week.',
  },
  {
    value: 'all-groups-all-weeks',
    label: 'All Groups — All Weeks',
    description: 'Retrieve all available group reports.',
  },
];

const SOFT_WHITE = 'rgba(255,255,255,0.85)';

const styles = {
  page: {
    width: '100%',
    minHeight: '100vh',
    padding: '30px 25px',
    boxSizing: 'border-box',
    backgroundImage: "url('/static03.jpeg')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
  },

  container: {
    width: '100%',
    maxWidth: '1300px',
    margin: '20px auto',
    padding: '40px',
    fontSize: '1.1rem',
    backgroundColor: 'rgba(23, 77, 42, 0.92)',
    border: '1px solid rgba(222, 255, 225, 0.27)',
    color: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
    boxSizing: 'border-box',
  },

  heading: {
    textAlign: 'center',
    color: '#ffffff',
    fontSize: '2.2rem',
    marginTop: 0,
    marginBottom: '10px',
  },

  description: {
    textAlign: 'center',
    color: SOFT_WHITE,
    fontSize: '1.08rem',
    marginBottom: '30px',
  },

  modeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '30px',
  },

  card: {
    padding: '20px',
    fontFamily: 'inherit',
    border: '1px solid rgba(180, 239, 187, 0.35)',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: 'rgba(155, 220, 162, 0.13)',
    color: '#ffffff',
  },

  form: {
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    border: '1px solid rgba(180, 239, 187, 0.25)',
    borderRadius: '8px',
    padding: '28px',
    marginBottom: '30px',
  },

  label: {
    display: 'block',
    fontSize: '1.08rem',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '6px',
  },

  input: {
    width: '100%',
    padding: '14px',
    border: '1px solid rgba(210, 255, 216, 0.35)',
    borderRadius: '5px',
    boxSizing: 'border-box',
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    color: '#ffffff',
    fontSize: '1.14rem',
  },

  option: {
    backgroundColor: '#174d2a',
    color: '#ffffff',
  },

  button: {
    backgroundColor: 'rgba(46, 125, 50, 0.9)',
    color: '#ffffff',
    padding: '16px 24px',
    fontSize: '1.15rem',
    fontFamily: 'inherit',
    border: '1px solid rgba(165, 214, 167, 0.5)',
    borderRadius: '5px',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
  },

  report: {
    padding: '26px',
    border: '1px solid rgba(204, 255, 210, 0.24)',
    borderRadius: '10px',
    margin: 0,
    backgroundColor: 'rgba(13, 57, 28, 0.72)',
    color: '#ffffff',
    overflowWrap: 'anywhere',
    boxSizing: 'border-box',
  },

  error: {
    backgroundColor: 'rgba(153, 27, 27, 0.45)',
    border: '1px solid rgba(252, 165, 165, 0.35)',
    color: '#ffffff',
    padding: '12px',
    borderRadius: '5px',
    marginBottom: '20px',
    fontSize: '1.08rem',
    overflowWrap: 'anywhere',
  },

  reportsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))',
    gap: '24px',
    alignItems: 'start',
  },

  section: {
    marginBottom: '18px',
    padding: '16px',
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    border: '1px solid rgba(180, 239, 187, 0.2)',
    borderRadius: '6px',
  },
};

function formatDate(value) {
  if (!value) return 'N/A';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return 'N/A';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString();
}

function getLeadName(report) {
  return [
    report.leadFirstName,
    report.leadMiddleName,
    report.leadLastName,
  ]
    .filter(Boolean)
    .join(' ') || 'N/A';
}

function getAttendees(attendees) {
  if (Array.isArray(attendees)) {
    return attendees;
  }

  if (typeof attendees === 'string' && attendees.trim()) {
    return [attendees];
  }

  return [];
}

function getErrorMessage(err) {
  const status = err.response?.status;
  const serverMessage = err.response?.data?.message;

  if (status === 401) {
    return (
      serverMessage ||
      'Your admin session is invalid or has expired. Please log in again.'
    );
  }

  if (status === 403) {
    return (
      serverMessage ||
      'You do not have permission to access these reports.'
    );
  }

  if (status === 404) {
    return (
      serverMessage ||
      'The reports endpoint was not found. Check your backend routes.'
    );
  }

  if (err.code === 'ERR_NETWORK') {
    return 'Unable to connect to the backend. Confirm that your server is running.';
  }

  return (
    serverMessage ||
    err.message ||
    'Failed to fetch reports from the backend.'
  );
}

function AdminReports() {
  const [filterMode, setFilterMode] = useState('');
  const [groupId, setGroupId] = useState('');
  const [week, setWeek] = useState('');

  const [reports, setReports] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFilterModeChange = (mode) => {
    setFilterMode(mode);
    setGroupId('');
    setWeek('');
    setReports([]);
    setHasSearched(false);
    setError('');
  };

  const handleFetchReports = async (event) => {
    event.preventDefault();

    if (loading) return;

    setError('');
    setReports([]);
    setHasSearched(false);

    if (!filterMode) {
      setError('Please select a report-fetching option.');
      return;
    }

    if (
      ['group-all-weeks', 'group-one-week'].includes(filterMode) &&
      !groupId
    ) {
      setError('Please select a Group ID.');
      return;
    }

    if (
      ['group-one-week', 'week-all-groups'].includes(filterMode) &&
      !week
    ) {
      setError('Please select a reporting week.');
      return;
    }

    // Retrieve the JWT saved during admin login.
    const token = localStorage.getItem('adminToken');

    if (!token) {
      setError(
        'Admin authentication token not found. Please log out and log in again.'
      );
      return;
    }

    const params = {};

    if (
      ['group-all-weeks', 'group-one-week'].includes(filterMode)
    ) {
      params.groupId = groupId;
    }

    if (
      ['group-one-week', 'week-all-groups'].includes(filterMode)
    ) {
      params.week = week;
    }

    try {
      setLoading(true);

      const response = await axios.get(REPORTS_URL, {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      /*
       * Your backend controller returns:
       * {
       *   success: true,
       *   count: reports.length,
       *   reports: [...]
       * }
       *
       * Therefore, read response.data.reports,
       * not response.data.data.
       */
      const fetchedReports = response.data?.reports;

      if (!Array.isArray(fetchedReports)) {
        throw new Error(
          'The server returned an unexpected response. Expected a reports array.'
        );
      }

      setReports(fetchedReports);
      setHasSearched(true);
    } catch (err) {
      console.error('Error fetching admin reports:', {
        url: REPORTS_URL,
        status: err.response?.status,
        response: err.response?.data,
        message: err.message,
      });

      if (err.response?.status === 401) {
        // Remove the invalid token so the user can authenticate again.
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
      }

      setError(getErrorMessage(err));
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const renderReport = (report, index) => {
    const details = report.reportDetails || {};
    const attendees = getAttendees(details.attendees);

    return (
      <article
        key={report._id || `${report.groupId}-${report.week}-${index}`}
        style={styles.report}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '18px',
          }}
        >
          <div>
            <h4 style={{ color: '#ffffff', margin: '0 0 8px', fontSize: '1.5rem' }}>
              Group ID: {report.groupId || 'N/A'}
            </h4>

            <div>
              <strong>Reporting Week:</strong> {report.week || 'N/A'}
            </div>

            <div
              style={{
                fontSize: '1.02rem',
                color: SOFT_WHITE,
                marginTop: '5px',
              }}
            >
              <strong>Report ID:</strong> {report._id || 'N/A'}
            </div>
          </div>

          <span
            style={{
              fontSize: '1.02rem',
              color: '#ffffff',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              padding: '7px 10px',
              borderRadius: '5px',
            }}
          >
            Session Date: {formatDate(details.sessionDate)}
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(165, 214, 167, 0.18)',
            border: '1px solid rgba(165, 214, 167, 0.35)',
            padding: '10px 12px',
            borderRadius: '6px',
            marginBottom: '18px',
            fontSize: '1.06rem',
            color: '#ffffff',
          }}
        >
          <strong>Submitted on:</strong>{' '}
          {formatDateTime(report.createdAt)}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '14px',
            fontSize: '1.08rem',
            marginBottom: '18px',
          }}
        >
          <div>
            <strong>Sessions Held:</strong>
            <div>{details.sessionsHeld ?? 0}</div>
          </div>

          <div>
            <strong>Duration:</strong>
            <div>{details.sessionDuration || 'N/A'}</div>
          </div>

          <div>
            <strong>Platform:</strong>
            <div>{details.platform || 'N/A'}</div>
          </div>

          <div>
            <strong>Session Time:</strong>
            <div>{details.sessionTime || 'N/A'}</div>
          </div>
        </div>

        <div style={styles.section}>
          <strong>Attendees ({attendees.length})</strong>

          {attendees.length > 0 ? (
            <ol style={{ paddingLeft: '22px', color: '#ffffff' }}>
              {attendees.map((attendee, attendeeIndex) => (
                <li key={`${attendee}-${attendeeIndex}`}>
                  {attendee}
                </li>
              ))}
            </ol>
          ) : (
            <p style={{ color: SOFT_WHITE }}>No attendees recorded.</p>
          )}
        </div>

        <div style={styles.section}>
          <strong>Session Summary</strong>

          <p
            style={{
              marginBottom: 0,
              color: '#ffffff',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {details.summary || 'No summary provided.'}
          </p>
        </div>

        <div
          style={{
            fontSize: '1.02rem',
            color: SOFT_WHITE,
            borderTop: '1px solid rgba(255, 255, 255, 0.2)',
            paddingTop: '12px',
          }}
        >
          <div>
            <strong>Posted by:</strong> {getLeadName(report)}
          </div>

          <div style={{ marginTop: '5px' }}>
            <strong>Lead Email:</strong> {report.leadEmail || 'N/A'}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h3 style={styles.heading}>
          Admin Session Reports Dashboard
        </h3>

        <p style={styles.description}>
          Select how you want to retrieve session reports.
        </p>

        <div style={styles.modeGrid}>
          {FILTER_MODES.map((mode) => {
            const selected = filterMode === mode.value;

            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => handleFilterModeChange(mode.value)}
                aria-pressed={selected}
                style={{
                  ...styles.card,
                  border: selected
                    ? '2px solid #a5d6a7'
                    : '1px solid rgba(180, 239, 187, 0.35)',
                  backgroundColor: selected
                    ? 'rgba(155, 220, 162, 0.32)'
                    : 'rgba(155, 220, 162, 0.13)',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontWeight: 'bold',
                    fontSize: '1.15rem',
                    color: '#ffffff',
                    marginBottom: '8px',
                  }}
                >
                  {mode.label}
                </span>

                <span
                  style={{
                    display: 'block',
                    fontSize: '1.05rem',
                    color: SOFT_WHITE,
                    lineHeight: 1.5,
                  }}
                >
                  {mode.description}
                </span>
              </button>
            );
          })}
        </div>

        {filterMode && (
          <form onSubmit={handleFetchReports} style={styles.form}>
            <h4 style={{ color: '#ffffff', marginTop: 0, fontSize: '1.4rem' }}>
              Report Selection
            </h4>

            {['group-all-weeks', 'group-one-week'].includes(filterMode) && (
              <div style={{ marginBottom: '18px' }}>
                <label htmlFor="reportGroupId" style={styles.label}>
                  Select Group ID
                </label>

                <select
                  id="reportGroupId"
                  value={groupId}
                  onChange={(event) => setGroupId(event.target.value)}
                  required
                  style={styles.input}
                >
                  <option value="" style={styles.option}>
                    -- Select a Group --
                  </option>

                  {GROUP_OPTIONS.map((group) => (
                    <option
                      key={group.value}
                      value={group.value}
                      style={styles.option}
                    >
                      {group.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {['group-one-week', 'week-all-groups'].includes(filterMode) && (
              <div style={{ marginBottom: '18px' }}>
                <label htmlFor="reportWeek" style={styles.label}>
                  Select Reporting Week
                </label>

                <select
                  id="reportWeek"
                  value={week}
                  onChange={(event) => setWeek(event.target.value)}
                  required
                  style={styles.input}
                >
                  <option value="" style={styles.option}>
                    -- Select a Week --
                  </option>

                  {WEEK_OPTIONS.map((weekOption) => (
                    <option
                      key={weekOption}
                      value={weekOption}
                      style={styles.option}
                    >
                      {weekOption}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {filterMode === 'all-groups-all-weeks' && (
              <p style={{ color: SOFT_WHITE, fontSize: '1.08rem' }}>
                All available reports from all groups and weeks will be retrieved.
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Fetching Reports...' : 'Fetch Reports'}
            </button>
          </form>
        )}

        {error && (
          <div role="alert" style={styles.error}>
            {error}
          </div>
        )}

        {hasSearched && !error && (
          <section>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                marginBottom: '18px',
              }}
            >
              <h4 style={{ margin: 0, color: '#ffffff', fontSize: '1.6rem' }}>
                Report Results
              </h4>

              <span
                style={{
                  backgroundColor: 'rgba(155, 220, 162, 0.22)',
                  border: '1px solid rgba(180, 239, 187, 0.35)',
                  color: '#ffffff',
                  padding: '6px 10px',
                  borderRadius: '20px',
                  fontSize: '1.02rem',
                  fontWeight: 'bold',
                }}
              >
                {reports.length} report{reports.length === 1 ? '' : 's'}
              </span>
            </div>

            {reports.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  color: '#ffffff',
                  padding: '30px 15px',
                  backgroundColor: 'rgba(0, 0, 0, 0.18)',
                  border: '1px solid rgba(180, 239, 187, 0.2)',
                  borderRadius: '8px',
                }}
              >
                No session reports were found for the selected criteria.
              </div>
            ) : (
              <div style={styles.reportsGrid}>
                {reports.map((report, index) => renderReport(report, index))}
              </div>
            )}
          </section>
        )}

        {!filterMode && !loading && (
          <div
            style={{
              textAlign: 'center',
              color: SOFT_WHITE,
              padding: '25px 10px',
              border: '1px dashed rgba(255, 255, 255, 0.4)',
              borderRadius: '8px',
            }}
          >
            Choose one of the four options above to begin.
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminReports;