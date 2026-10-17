
import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    // Ensure the reset token exists.
    if (!token) {
      setError(
        'The password reset token is missing. Please use the link sent to your email.'
      );
      return;
    }

    // Validate password length.
    if (password.length < 8) {
      setError('Your password must contain at least 8 characters.');
      return;
    }

    if (password.length > 128) {
      setError('Your password must not exceed 128 characters.');
      return;
    }

    // Ensure both passwords match.
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_BASE}/auth/reset-password/${encodeURIComponent(token)}`,
        {
          password,
          confirmPassword,
        }
      );

      setSuccess(
        response.data.message ||
          'Your password has been reset successfully.'
      );

      setPassword('');
      setConfirmPassword('');

      // Redirect to login after displaying the success message.
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (requestError) {
      console.error(
        'Password reset error:',
        requestError.response?.data || requestError.message
      );

      if (requestError.response) {
        setError(
          requestError.response.data?.message ||
            'Unable to reset your password. Please try again.'
        );
      } else {
        setError(
          'Unable to connect to the server. Please check your connection and try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Reset Password</h1>

        <p style={styles.description}>
          Enter your new password below to regain access to your account.
        </p>

        {error && (
          <div role="alert" style={styles.error}>
            {error}
          </div>
        )}

        {success && (
          <div role="status" style={styles.success}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label htmlFor="password" style={styles.label}>
              New Password
            </label>

            <input
              id="password"
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder="Enter your new password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              maxLength={128}
              required
              disabled={loading}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="confirmPassword" style={styles.label}>
              Confirm New Password
            </label>

            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              minLength={8}
              maxLength={128}
              required
              disabled={loading}
              style={styles.input}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>

        <p style={styles.footer}>
          Remembered your password?{' '}
          <Link to="/login" style={styles.link}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    boxSizing: 'border-box',
    backgroundColor: '#f3f4f6',
    fontFamily: 'Arial, sans-serif',
  },

  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '32px',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
  },

  heading: {
    margin: '0 0 10px',
    textAlign: 'center',
    fontSize: '26px',
    color: '#111827',
  },

  description: {
    marginBottom: '24px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
    lineHeight: '1.6',
  },

  formGroup: {
    marginBottom: '20px',
  },

  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
  },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '15px',
    outlineOffset: '2px',
  },

  button: {
    width: '100%',
    padding: '13px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
  },

  error: {
    marginBottom: '18px',
    padding: '12px',
    borderRadius: '6px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    fontSize: '14px',
    lineHeight: '1.5',
    overflowWrap: 'anywhere',
  },

  success: {
    marginBottom: '18px',
    padding: '12px',
    borderRadius: '6px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    fontSize: '14px',
    lineHeight: '1.5',
  },

  footer: {
    marginTop: '24px',
    marginBottom: '0',
    textAlign: 'center',
    fontSize: '14px',
    color: '#6b7280',
  },

  link: {
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: '600',
  },
};