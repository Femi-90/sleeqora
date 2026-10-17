import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');

const groupOptions = [
  { value: 'C4 DATA ENGINEERING 003', label: 'C4 DATA ENGINEERING 003' },
  { value: 'C4 DATA ENGINEERING 002', label: 'C4 DATA ENGINEERING 002' },
  { value: 'C4 DATA ENGINEERING 001', label: 'C4 DATA ENGINEERING 001' },
  { value: 'C4 DATA ANALYSIS AND VISUALIZATION 001', label: 'C4 DATA ANALYSIS AND VISUALIZATION 001' },
  { value: 'C4 DATA ANALYSIS AND VISUALIZATION 002', label: 'C4 DATA ANALYSIS AND VISUALIZATION 002' },
  { value: 'C4 DATA ANALYSIS AND VISUALIZATION 003', label: 'C4 DATA ANALYSIS AND VISUALIZATION 003' },
  { value: 'C4 DATA ANALYSIS AND VISUALIZATION 004', label: 'C4 DATA ANALYSIS AND VISUALIZATION 004' },
  { value: 'C4 DATA ANALYSIS AND VISUALIZATION 005', label: 'C4 DATA ANALYSIS AND VISUALIZATION 005' },
  { value: 'C4 DATA ANALYSIS AND VISUALIZATION 006', label: 'C4 DATA ANALYSIS AND VISUALIZATION 006' },
  { value: 'C4 DATA ANALYSIS AND VISUALIZATION 007', label: 'C4 DATA ANALYSIS AND VISUALIZATION 007' },
  { value: 'C4 DATA ANALYSIS AND VISUALIZATION 008', label: 'C4 DATA ANALYSIS AND VISUALIZATION 008' },
  { value: 'C4 DATA ANALYSIS AND VISUALIZATION 009', label: 'C4 DATA ANALYSIS AND VISUALIZATION 009' },
  { value: 'C4 DATA ANALYSIS AND VISUALIZATION 110', label: 'C4 DATA ANALYSIS AND VISUALIZATION 110' },
  { value: 'C4 DATA ANALYSIS AND VISUALIZATION 111', label: 'C4 DATA ANALYSIS AND VISUALIZATION 111' },
  { value: 'C4 DATA ANALYSIS AND VISUALIZATION 112', label: 'C4 DATA ANALYSIS AND VISUALIZATION 112' },
  { value: 'C4 DATA SCIENCE AND AI/ML 001', label: 'C4 DATA SCIENCE AND AI/ML 001' },
  { value: 'C4 DATA SCIENCE AND AI/ML 002', label: 'C4 DATA SCIENCE AND AI/ML 002' },
  { value: 'C4 DATA SCIENCE AND AI/ML 003', label: 'C4 DATA SCIENCE AND AI/ML 003' },
  { value: 'C4 DATA SCIENCE AND AI/ML 004', label: 'C4 DATA SCIENCE AND AI/ML 004' },
  { value: 'C4 DATA SCIENCE AND AI/ML 005', label: 'C4 DATA SCIENCE AND AI/ML 005' },
  { value: 'C4 DATA SCIENCE AND AI/ML 006', label: 'C4 DATA SCIENCE AND AI/ML 006' },
  { value: 'C4 DATA SCIENCE AND AI/ML 007', label: 'C4 DATA SCIENCE AND AI/ML 007' },
  { value: 'C4 DATA SCIENCE AND AI/ML 008', label: 'C4 DATA SCIENCE AND AI/ML 008' },
  { value: 'C4 DATA SCIENCE AND AI/ML 009', label: 'C4 DATA SCIENCE AND AI/ML 009' },
  { value: 'C4 DATA SCIENCE AND AI/ML 110', label: 'C4 DATA SCIENCE AND AI/ML 110' },
  { value: 'C4 GENERATIVE AI 001', label: 'C4 GENERATIVE AI 001' },
  { value: 'C4 GENERATIVE AI 002', label: 'C4 GENERATIVE AI 002' },
  { value: 'C4 GENERATIVE AI 003', label: 'C4 GENERATIVE AI 003' },
  { value: 'C4 GENERATIVE AI 004', label: 'C4 GENERATIVE AI 004' },
  { value: 'C4 GENERATIVE AI 005', label: 'C4 GENERATIVE AI 005' },
  { value: 'C4 GENERATIVE AI 006', label: 'C4 GENERATIVE AI 006' },
  { value: 'C4 GEOSPATIAL DATA SCIENCE 001', label: 'C4 GEOSPATIAL DATA SCIENCE 001' },
  { value: 'C4 NATURAL LANGUAGE PROCESSING 001', label: 'C4 NATURAL LANGUAGE PROCESSING 001' }

];

const inputStyle = {
  width: '100%',
  padding: '13px 14px',
  borderRadius: '7px',
  border: '1px solid #d1d5db',
  marginTop: '6px',
  boxSizing: 'border-box',
  fontSize: '0.95rem',
  outlineColor: '#1b5e20',
  backgroundColor: '#fff',
  transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.9rem',
  fontWeight: '600',
  color: '#374151',
  marginBottom: '4px',
};

const buttonStyle = {
  backgroundColor: '#1b5e20',
  color: '#fff',
  padding: '14px',
  border: 'none',
  borderRadius: '7px',
  fontWeight: 'bold',
  cursor: 'pointer',
  marginTop: '8px',
  width: '100%',
  fontSize: '1rem',
  transition:
    'background-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease',
};

function AuthPage({ setUserRole, setAuthenticatedUser }) {
  const [roleType, setRoleType] = useState('learner');
  const [mode, setMode] = useState('login');

  const [groupId, setGroupId] = useState('C4 DATA SCIENCE AND AI/ML 001');

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const clearMessages = () => {
    setError('');
    setSuccessMessage('');
  };

  const changeRole = (role) => {
    setRoleType(role);
    setMode('login');

    clearMessages();

    setPassword('');
    setConfirmPassword('');
    setVerificationCode('');
    setAdminSecret('');
  };

  const changeMode = (newMode) => {
    setMode(newMode);
    clearMessages();

    setPassword('');
    setConfirmPassword('');
    setVerificationCode('');
  };

  const getErrorMessage = (err) =>
    err.response?.data?.message ||
    err.response?.data?.error ||
    err.message ||
    'An unexpected error occurred. Please try again.';

  const renderField = ({
    label,
    type = 'text',
    value,
    onChange,
    placeholder = '',
    required = true,
    autoComplete,
  }) => (
    <div className="sleeqora-field">
      <label style={labelStyle}>{label}</label>

      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        style={inputStyle}
      />
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    if (loading) return;

    // Registration validation
    if (mode === 'register') {
      if (
        !firstName.trim() ||
        !lastName.trim() ||
        !email.trim()
      ) {
        setError('Please complete all required fields.');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      if (password.length < 8) {
        setError('Password must contain at least 8 characters.');
        return;
      }

      if (roleType === 'admin' && !adminSecret.trim()) {
        setError('Please enter the administrator secret key.');
        return;
      }
    }

    // Email verification validation
    if (mode === 'verify') {
      if (!/^\d{6}$/.test(verificationCode.trim())) {
        setError(
          'Enter the six-digit verification code sent to your email.'
        );
        return;
      }

      if (roleType === 'admin' && !email.trim()) {
        setError('Enter the administrator email address.');
        return;
      }
    }

    // Password recovery validation
    if (mode === 'forgot' && !email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    try {
      setLoading(true);

      // Registration
      if (mode === 'register') {
        const endpoint =
          roleType === 'admin'
            ? `${API_BASE}/admin/register`
            : `${API_BASE}/groups/register`;

        const payload =
          roleType === 'admin'
            ? {
                firstName: firstName.trim(),
                middleName: middleName.trim(),
                lastName: lastName.trim(),
                email: email.trim().toLowerCase(),
                password,
                adminSecret: adminSecret.trim(),
              }
            : {
                groupId: groupId.trim().toUpperCase(),
                leadFirstName: firstName.trim(),
                leadMiddleName: middleName.trim(),
                leadLastName: lastName.trim(),
                leadEmail: email.trim().toLowerCase(),
                password,
              };

        const response = await axios.post(endpoint, payload);

        setMode('verify');
        setPassword('');
        setConfirmPassword('');
        setVerificationCode('');

        setSuccessMessage(
          response.data?.message ||
            'Registration submitted. Enter the verification code sent to your email.'
        );

        return;
      }

      // Email verification
      if (mode === 'verify') {
        const endpoint =
          roleType === 'admin'
            ? `${API_BASE}/admin/verify-email`
            : `${API_BASE}/groups/verify-email`;

        const payload =
          roleType === 'admin'
            ? {
                email: email.trim().toLowerCase(),
                code: verificationCode.trim(),
              }
            : {
                groupId: groupId.trim().toUpperCase(),
                code: verificationCode.trim(),
              };

        const response = await axios.post(endpoint, payload);

        setVerificationCode('');
        setPassword('');
        setMode('login');

        setSuccessMessage(
          response.data?.message ||
            'Email verified successfully. You can now log in.'
        );

        return;
      }

      // Login
      if (mode === 'login') {
        const endpoint =
          roleType === 'admin'
            ? `${API_BASE}/admin/login`
            : `${API_BASE}/groups/login`;

        const payload =
          roleType === 'admin'
            ? {
                email: email.trim().toLowerCase(),
                password,
              }
            : {
                groupId: groupId.trim().toUpperCase(),
                password,
              };

        const response = await axios.post(endpoint, payload);

        const userData =
          response.data?.user ||
          response.data?.admin ||
          response.data?.group;

        if (!userData) {
          throw new Error(
            'Login response did not contain user information. Check the backend login controller.'
          );
        }

        const token = response.data?.token;

        // Administrator login
        if (roleType === 'admin') {
          if (!token) {
            throw new Error(
              'Admin login did not return a token. Check the admin login controller.'
            );
          }

          localStorage.setItem('adminToken', token);

          localStorage.setItem(
            'adminUser',
            JSON.stringify(userData)
          );

          localStorage.removeItem('groupToken');
          localStorage.removeItem('groupId');
          localStorage.removeItem('groupUser');

          setAuthenticatedUser(userData);
        } else {
          // Group lead login
          if (!token) {
            throw new Error(
              'Group login did not return a token. Check the group login controller.'
            );
          }

          const normalizedUser = {
            ...userData,

            groupId:
              userData.groupId ||
              groupId.trim().toUpperCase(),

            firstName:
              userData.firstName ||
              userData.leadFirstName ||
              '',

            middleName:
              userData.middleName ||
              userData.leadMiddleName ||
              '',

            lastName:
              userData.lastName ||
              userData.leadLastName ||
              '',

            email:
              userData.email ||
              userData.leadEmail ||
              '',

            name:
              userData.name ||
              [
                userData.leadFirstName ||
                  userData.firstName,
                userData.leadMiddleName ||
                  userData.middleName,
                userData.leadLastName ||
                  userData.lastName,
              ]
                .filter(Boolean)
                .join(' '),

            role: 'learner',
          };

          localStorage.setItem('groupToken', token);

          localStorage.setItem(
            'groupId',
            normalizedUser.groupId
          );

          localStorage.setItem(
            'groupUser',
            JSON.stringify(normalizedUser)
          );

          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');

          setAuthenticatedUser(normalizedUser);
        }

        setUserRole(roleType);
        setSuccessMessage('Login successful.');

        return;
      }

      // Password recovery
      if (mode === 'forgot') {
        const response = await axios.post(
          `${API_BASE}/auth/forgot-password`,
          {
            email: email.trim().toLowerCase(),

            ...(roleType === 'learner'
              ? {
                  groupId: groupId.trim().toUpperCase(),
                }
              : {}),
          }
        );

        setSuccessMessage(
          response.data?.message ||
            'Password recovery instructions have been sent to your email.'
        );
      }
    } catch (err) {
      console.error(
        'Authentication error:',
        err.response?.data || err
      );

      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const tabStyle = (active) => ({
    flex: 1,
    padding: '13px 10px',
    background: active ? '#1b5e20' : '#fff',
    color: active ? '#fff' : '#1b5e20',
    border: 'none',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition:
      'background-color 0.25s ease, color 0.25s ease',
  });

  const navStyle = (active) => ({
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: active ? '#1b5e20' : '#6b7280',
    fontWeight: active ? '700' : '500',
    textDecoration: active ? 'underline' : 'none',
    textUnderlineOffset: '5px',
    padding: '7px 3px',
    fontSize: '0.9rem',
    transition: 'color 0.25s ease, transform 0.25s ease',
  });

  const pageTitle = {
    login: 'Login',
    register: 'Registration',
    verify: 'Email Verification',
    forgot: 'Password Recovery',
  }[mode];

  return (
    <div className="sleeqora-page">
      <style>
        {`
          html,
          body,
          #root {
            min-height: 100%;
            margin: 0;
            padding: 0;
          }

          html {
            scroll-behavior: smooth;
          }

          body {
            min-height: 100vh;
            background-image:
              linear-gradient(
                rgba(0, 0, 0, 0.22),
                rgba(0, 0, 0, 0.22)
              ),
              url('/static02.jpeg');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            background-attachment: fixed;
            font-family:
              Inter,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
          }

          * {
            box-sizing: border-box;
          }

          .sleeqora-page {
            width: 100%;
            min-height: 100vh;
            padding: 35px 24px 65px;
            overflow: hidden;
          }

          /* Keyframes */

          @keyframes sqFadeUp {
            from {
              opacity: 0;
              transform: translateY(35px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes sqFadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes sqSlideInLeft {
            from {
              opacity: 0;
              transform: translateX(-40px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes sqSlideInRight {
            from {
              opacity: 0;
              transform: translateX(40px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes sqFloat {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-7px);
            }
          }

          @keyframes sqGlow {
            0%, 100% {
              box-shadow: 0 0 0 rgba(165, 214, 167, 0);
            }
            50% {
              box-shadow: 0 0 24px rgba(165, 214, 167, 0.25);
            }
          }

          @keyframes sqLineGrow {
            from {
              transform: scaleY(0);
              transform-origin: top;
            }
            to {
              transform: scaleY(1);
              transform-origin: top;
            }
          }

          .sleeqora-auth-layout {
            display: flex;
            flex-direction: column;
            width: 100%;
            max-width: 1250px;
            margin: 0 auto;
            gap: 32px;
          }

          /* Hero */

          .sleeqora-welcome {
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-height: 600px;
            padding: 75px 85px;
            border-radius: 22px;
            overflow: hidden;
            isolation: isolate;
            color: #fff;

            background-image:
              linear-gradient(
                110deg,
                rgba(7, 32, 13, 0.84),
                rgba(10, 45, 18, 0.60),
                rgba(0, 0, 0, 0.24)
              ),
              url('/static05.jpeg');

            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            box-shadow: 0 20px 55px rgba(0, 0, 0, 0.22);

            animation: sqFadeIn 0.9s ease both;
          }

          .sleeqora-brand {
            display: inline-flex;
            align-items: center;
            gap: 13px;
            margin-bottom: 45px;
            animation: sqSlideInLeft 0.8s ease both;
          }

          .sleeqora-brand-mark {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 52px;
            height: 52px;
            border: 1px solid rgba(255, 255, 255, 0.65);
            border-radius: 14px;
            font-size: 1.6rem;
            font-weight: 900;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(5px);
            animation: sqFloat 4s ease-in-out infinite;
          }

          .sleeqora-brand-name {
            font-size: 1.7rem;
            font-weight: 900;
            letter-spacing: 4px;
          }

          .sleeqora-eyebrow {
            display: inline-block;
            align-self: flex-start;
            padding: 11px 17px;
            margin-bottom: 24px;
            border: 1px solid rgba(255, 255, 255, 0.38);
            border-radius: 50px;
            background: rgba(255, 255, 255, 0.12);
            backdrop-filter: blur(5px);
            font-size: 0.82rem;
            font-weight: 700;
            letter-spacing: 1.4px;
            text-transform: uppercase;
            animation: sqFadeUp 0.8s 0.15s ease both;
          }

          .sleeqora-welcome h1 {
            margin: 0 0 25px;
            font-size: clamp(3rem, 5.5vw, 5rem);
            line-height: 1.08;
            font-weight: 900;
            letter-spacing: -2px;
            animation: sqFadeUp 0.9s 0.25s ease both;
          }

          .sleeqora-welcome h1 span {
            color: #c8e6c9;
          }

          .sleeqora-welcome-description {
            margin: 0;
            max-width: 850px;
            color: rgba(255, 255, 255, 0.94);
            font-size: 1.12rem;
            line-height: 1.95;
            animation: sqFadeUp 0.9s 0.4s ease both;
          }

          .sleeqora-divider {
            width: 85px;
            height: 5px;
            margin: 34px 0;
            border-radius: 10px;
            background: #a5d6a7;
            animation: sqFadeIn 1s 0.55s ease both;
          }

          .sleeqora-feature-list {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
            margin-top: 4px;
          }

          .sleeqora-feature {
            display: flex;
            align-items: center;
            gap: 11px;
            min-height: 68px;
            padding: 15px;
            border: 1px solid rgba(255, 255, 255, 0.23);
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.11);
            backdrop-filter: blur(5px);
            color: #fff;
            font-size: 0.9rem;
            font-weight: 600;
            transition:
              transform 0.3s ease,
              background-color 0.3s ease,
              box-shadow 0.3s ease;
            animation: sqFadeUp 0.7s ease both;
          }

          .sleeqora-feature:nth-child(1) {
            animation-delay: 0.45s;
          }

          .sleeqora-feature:nth-child(2) {
            animation-delay: 0.58s;
          }

          .sleeqora-feature:nth-child(3) {
            animation-delay: 0.71s;
          }

          .sleeqora-feature:nth-child(4) {
            animation-delay: 0.84s;
          }

          .sleeqora-feature:hover {
            transform: translateY(-7px);
            background: rgba(255, 255, 255, 0.2);
            box-shadow: 0 12px 25px rgba(0, 0, 0, 0.15);
          }

          .sleeqora-feature-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            width: 34px;
            height: 34px;
            border-radius: 9px;
            background: rgba(255, 255, 255, 0.17);
            font-size: 1.05rem;
          }

          .sleeqora-welcome-footer {
            margin-top: 38px;
            color: rgba(255, 255, 255, 0.84);
            font-size: 0.95rem;
            line-height: 1.8;
            animation: sqFadeUp 0.8s 0.75s ease both;
          }

          /* Form panel */

          .sleeqora-form-panel {
            width: 100%;
            max-width: 850px;
            margin: 0 auto;
            padding: 50px 55px;
            border: 1px solid rgba(255, 255, 255, 0.65);
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.97);
            box-shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
            animation: sqFadeUp 0.9s 0.2s ease both;
            transition: box-shadow 0.3s ease;
          }

          .sleeqora-form-panel:hover {
            box-shadow: 0 22px 55px rgba(0, 0, 0, 0.21);
          }

          .sleeqora-form-heading {
            margin: 0 0 12px;
            color: #1b5e20;
            font-size: 2rem;
            font-weight: 850;
            line-height: 1.3;
          }

          .sleeqora-form-subheading {
            margin: 0 0 30px;
            color: #6b7280;
            font-size: 1rem;
            line-height: 1.8;
          }

          .sleeqora-field {
            animation: sqFadeUp 0.35s ease both;
          }

          .sleeqora-field input,
          .sleeqora-field select {
            transition:
              border-color 0.25s ease,
              box-shadow 0.25s ease,
              transform 0.25s ease;
          }

          .sleeqora-field input:focus,
          .sleeqora-field select:focus {
            border-color: #1b5e20 !important;
            box-shadow: 0 0 0 3px rgba(27, 94, 32, 0.12);
            outline: none;
          }

          .sleeqora-status {
            padding: 14px 16px;
            border-radius: 8px;
            margin-bottom: 18px;
            font-size: 0.9rem;
            line-height: 1.6;
            overflow-wrap: anywhere;
            animation: sqFadeUp 0.35s ease both;
          }

          .sleeqora-submit:hover:not(:disabled) {
            background-color: #144a19 !important;
            transform: translateY(-2px);
            box-shadow: 0 8px 18px rgba(27, 94, 32, 0.2);
          }

          .sleeqora-submit:active:not(:disabled) {
            transform: translateY(0);
          }

          .sleeqora-form-footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 0.85rem;
            line-height: 1.8;
          }

          /* Learning section */

          .sleeqora-learning {
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: center;
            width: 100%;
            max-width: 1250px;
            min-height: 460px;
            margin: 55px auto 0;
            padding: 80px 85px;
            border-radius: 20px;
            overflow: hidden;
            isolation: isolate;
            color: #fff;
            background-image:
              linear-gradient(
                100deg,
                rgba(7, 37, 15, 0.86),
                rgba(11, 52, 20, 0.68),
                rgba(0, 0, 0, 0.32)
              ),
              url('/static1.jpeg');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            box-shadow: 0 18px 45px rgba(0, 0, 0, 0.20);
            animation: sqFadeUp 1s ease both;
          }

          .sleeqora-learning h2 {
            max-width: 850px;
            margin: 0 0 24px;
            color: #fff;
            font-size: clamp(2.5rem, 4.5vw, 4rem);
            font-weight: 900;
            line-height: 1.15;
            letter-spacing: -1.3px;
            animation: sqSlideInLeft 0.9s 0.2s ease both;
          }

          .sleeqora-learning h2 span {
            color: #c8e6c9;
          }

          .sleeqora-learning p {
            max-width: 850px;
            margin: 0;
            color: rgba(255, 255, 255, 0.94);
            font-size: 1.12rem;
            line-height: 1.95;
            animation: sqFadeUp 0.9s 0.35s ease both;
          }

          .sleeqora-learning-points {
            display: flex;
            flex-wrap: wrap;
            gap: 13px;
            margin-top: 30px;
          }

          .sleeqora-learning-point {
            padding: 12px 17px;
            border: 1px solid rgba(255, 255, 255, 0.35);
            border-radius: 50px;
            background: rgba(255, 255, 255, 0.12);
            font-size: 0.9rem;
            font-weight: 650;
            transition:
              transform 0.25s ease,
              background-color 0.25s ease,
              box-shadow 0.25s ease;
            animation: sqFadeUp 0.7s ease both;
          }

          .sleeqora-learning-point:nth-child(1) {
            animation-delay: 0.4s;
          }

          .sleeqora-learning-point:nth-child(2) {
            animation-delay: 0.52s;
          }

          .sleeqora-learning-point:nth-child(3) {
            animation-delay: 0.64s;
          }

          .sleeqora-learning-point:nth-child(4) {
            animation-delay: 0.76s;
          }

          .sleeqora-learning-point:hover {
            transform: translateY(-5px);
            background: rgba(255, 255, 255, 0.23);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
          }

          /* About section */

          .sleeqora-about {
            width: 100%;
            max-width: 1250px;
            margin: 40px auto 0;
            padding: 70px 75px;
            border-radius: 18px;
            background: #eef0f0;
            color: #1b5e20;
            box-shadow: 0 14px 38px rgba(0, 0, 0, 0.12);
            animation: sqFadeUp 1s ease both;
          }

          .sleeqora-about h2 {
            margin: 0 0 38px;
            color: #1b5e20;
            text-align: center;
            font-size: clamp(2.2rem, 4vw, 3.2rem);
            font-weight: 900;
            line-height: 1.2;
            animation: sqFadeUp 0.8s 0.15s ease both;
          }

          .sleeqora-about-content {
            display: grid;
            grid-template-columns:
              minmax(0, 1fr)
              4px
              minmax(0, 1fr);
            align-items: stretch;
            gap: 35px;
          }

          .sleeqora-about-content p {
            margin: 0;
            color: #1b5e20;
            font-size: 1.05rem;
            line-height: 2;
            text-align: left;
          }

          .sleeqora-about-content p:first-child {
            animation: sqSlideInLeft 0.9s 0.25s ease both;
          }

          .sleeqora-about-content p:last-child {
            animation: sqSlideInRight 0.9s 0.35s ease both;
          }

          .sleeqora-about-divider {
            width: 4px;
            min-height: 100%;
            border-radius: 10px;
            background: #1b5e20;
            animation: sqLineGrow 0.9s 0.25s ease both;
          }

          .sleeqora-about-bottom {
            margin-top: 38px;
            padding-top: 24px;
            border-top: 1px solid rgba(27, 94, 32, 0.20);
            color: #1b5e20;
            text-align: center;
            font-size: 0.95rem;
            font-weight: 700;
            line-height: 1.8;
            animation: sqFadeIn 1s 0.5s ease both;
          }

          /* Tablet */

          @media (max-width: 1000px) {
            .sleeqora-page {
              padding: 25px 18px 45px;
            }

            .sleeqora-welcome {
              min-height: 550px;
              padding: 55px 45px;
            }

            .sleeqora-feature-list {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .sleeqora-learning {
              min-height: 400px;
              padding: 60px 45px;
            }

            .sleeqora-about {
              padding: 55px 40px;
            }

            .sleeqora-about-content {
              gap: 25px;
            }
          }

          /* Mobile */

          @media (max-width: 600px) {
            .sleeqora-page {
              padding: 12px 10px 30px;
            }

            .sleeqora-auth-layout {
              gap: 18px;
            }

            .sleeqora-welcome {
              min-height: auto;
              padding: 32px 23px;
              border-radius: 14px;
              background-position: center;
            }

            .sleeqora-brand {
              gap: 10px;
              margin-bottom: 28px;
            }

            .sleeqora-brand-mark {
              width: 43px;
              height: 43px;
              border-radius: 11px;
              font-size: 1.3rem;
            }

            .sleeqora-brand-name {
              font-size: 1.3rem;
              letter-spacing: 3px;
            }

            .sleeqora-eyebrow {
              padding: 8px 12px;
              margin-bottom: 18px;
              font-size: 0.67rem;
              letter-spacing: 0.8px;
            }

            .sleeqora-welcome h1 {
              margin-bottom: 19px;
              font-size: 2.55rem;
              letter-spacing: -1px;
            }

            .sleeqora-welcome-description {
              font-size: 0.96rem;
              line-height: 1.85;
            }

            .sleeqora-divider {
              margin: 25px 0;
            }

            .sleeqora-feature-list {
              grid-template-columns: minmax(0, 1fr);
              gap: 10px;
            }

            .sleeqora-feature {
              min-height: 58px;
              padding: 12px;
              font-size: 0.87rem;
            }

            .sleeqora-welcome-footer {
              margin-top: 25px;
              font-size: 0.85rem;
            }

            .sleeqora-form-panel {
              padding: 30px 21px;
              border-radius: 14px;
            }

            .sleeqora-form-heading {
              font-size: 1.65rem;
            }

            .sleeqora-form-subheading {
              margin-bottom: 24px;
              font-size: 0.92rem;
            }

            .sleeqora-learning {
              min-height: auto;
              margin-top: 25px;
              padding: 45px 24px;
              border-radius: 14px;
              background-position: center;
            }

            .sleeqora-learning h2 {
              font-size: 2.35rem;
            }

            .sleeqora-learning p {
              font-size: 0.96rem;
              line-height: 1.85;
            }

            .sleeqora-learning-points {
              gap: 9px;
              margin-top: 22px;
            }

            .sleeqora-learning-point {
              padding: 10px 13px;
              font-size: 0.82rem;
            }

            .sleeqora-about {
              margin-top: 22px;
              padding: 38px 23px;
              border-radius: 14px;
            }

            .sleeqora-about h2 {
              margin-bottom: 25px;
              font-size: 2.15rem;
            }

            .sleeqora-about-content {
              grid-template-columns: minmax(0, 1fr);
              gap: 22px;
            }

            .sleeqora-about-content p {
              font-size: 0.96rem;
              line-height: 1.9;
            }

            .sleeqora-about-divider {
              width: 100%;
              height: 4px;
              min-height: 4px;
            }

            .sleeqora-about-bottom {
              margin-top: 25px;
              padding-top: 20px;
              font-size: 0.88rem;
            }
          }

          /* Accessibility: respect reduced motion */

          @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
              scroll-behavior: auto !important;
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
        `}
      </style>

      {/* HERO AND AUTHENTICATION */}

      <main className="sleeqora-auth-layout">
        {/* WELCOME HERO */}

        <section className="sleeqora-welcome">
          <div className="sleeqora-brand">
            <div className="sleeqora-brand-mark">S</div>

            <div className="sleeqora-brand-name">
              SLEEQORA
            </div>
          </div>

          <div className="sleeqora-eyebrow">
            WesOnline 3MTT  Mentorship
          </div>

          <h1>
            Welcome to
            <br />
            <span>SLEEQORA.</span>
          </h1>

          <p className="sleeqora-welcome-description">
            Welcome to SLEEQORA! Your official interaction
            channel for WesOnline 3MTT and mentorship learners.
            Connect with fellow learners, share experiences,
            exchange ideas, collaborate on projects, and learn
            from one another. Together, we are building a vibrant
            community driven by innovation, knowledge, teamwork,
            and growth. Your journey towards greater possibilities
            starts here!
          </p>

          <div className="sleeqora-divider" />

          <div className="sleeqora-feature-list">
            <div className="sleeqora-feature">
              <span className="sleeqora-feature-icon">↗</span>
              <span>Connect and interact</span>
            </div>

            <div className="sleeqora-feature">
              <span className="sleeqora-feature-icon">✦</span>
              <span>Share knowledge</span>
            </div>

            <div className="sleeqora-feature">
              <span className="sleeqora-feature-icon">◎</span>
              <span>Collaborate on projects</span>
            </div>

            <div className="sleeqora-feature">
              <span className="sleeqora-feature-icon">↗</span>
              <span>Grow together</span>
            </div>
          </div>

          <div className="sleeqora-welcome-footer">
            A community built on connection, learning, and
            shared progress.
          </div>
        </section>

        {/* LOGIN / REGISTRATION PANEL */}

        <section className="sleeqora-form-panel">
          <h2 className="sleeqora-form-heading">
            Your community awaits.
          </h2>

          <p className="sleeqora-form-subheading">
            Sign in to continue your learning journey, or create
            an account to join the community.
          </p>

          {/* ROLE SELECTION */}

          <div
            style={{
              display: 'flex',
              marginBottom: '25px',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid #1b5e20',
            }}
          >
            <button
              type="button"
              onClick={() => changeRole('learner')}
              style={tabStyle(roleType === 'learner')}
            >
              Group Lead
            </button>

            <button
              type="button"
              onClick={() => changeRole('admin')}
              style={tabStyle(roleType === 'admin')}
            >
              Administrator
            </button>
          </div>

          {/* MODE SELECTION */}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '25px',
              fontSize: '0.9rem',
            }}
          >
            <button
              type="button"
              onClick={() => changeMode('login')}
              style={navStyle(mode === 'login')}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => changeMode('register')}
              style={navStyle(mode === 'register')}
            >
              Register
            </button>

            <button
              type="button"
              onClick={() => changeMode('forgot')}
              style={navStyle(mode === 'forgot')}
            >
              Retrieve Password
            </button>
          </div>

          <h3
            style={{
              marginBottom: '22px',
              color: '#1b5e20',
              fontSize: '1.25rem',
              fontWeight: '750',
            }}
          >
            {roleType === 'admin'
              ? 'Administrator'
              : 'Group Lead'}{' '}
            {pageTitle}
          </h3>

          {/* ERROR */}

          {error && (
            <div
              className="sleeqora-status"
              role="alert"
              style={{
                background: '#ffebee',
                color: '#c62828',
                border: '1px solid #ffcdd2',
              }}
            >
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {successMessage && (
            <div
              className="sleeqora-status"
              role="status"
              style={{
                background: '#e8f5e9',
                color: '#2e7d32',
                border: '1px solid #c8e6c9',
              }}
            >
              {successMessage}
            </div>
          )}

          {/* FORM */}

          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '17px',
            }}
          >
            {/* GROUP ID */}

            {roleType === 'learner' && (
              <div className="sleeqora-field">
                <label style={labelStyle}>Group ID</label>

                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  required
                  style={{
                    ...inputStyle,
                    backgroundColor: '#fff',
                  }}
                >
                  {groupOptions.map((group) => (
                    <option
                      key={group.value}
                      value={group.value}
                    >
                      {group.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* REGISTRATION NAME FIELDS */}

            {mode === 'register' && (
              <>
                {renderField({
                  label: 'First Name',
                  value: firstName,
                  onChange: (e) => setFirstName(e.target.value),
                  placeholder: 'Enter first name',
                  autoComplete: 'given-name',
                })}

                {renderField({
                  label: 'Middle Name ',
                  value: middleName,
                  onChange: (e) => setMiddleName(e.target.value),
                  placeholder: 'Enter middle name',
                  required: false,
                  autoComplete: 'additional-name',
                })}

                {renderField({
                  label: 'Last Name',
                  value: lastName,
                  onChange: (e) => setLastName(e.target.value),
                  placeholder: 'Enter last name',
                  autoComplete: 'family-name',
                })}
              </>
            )}

            {/* EMAIL */}

            {(roleType === 'admin' ||
              mode === 'register' ||
              mode === 'forgot') &&
              renderField({
                label: 'Email Address',
                type: 'email',
                value: email,
                onChange: (e) => setEmail(e.target.value),
                placeholder: 'name@example.com',
                autoComplete: 'email',
              })}

            {/* LOGIN PASSWORD */}

            {mode === 'login' &&
              renderField({
                label: 'Password',
                type: 'password',
                value: password,
                onChange: (e) => setPassword(e.target.value),
                placeholder: 'Enter your password',
                autoComplete: 'current-password',
              })}

            {/* REGISTRATION PASSWORDS */}

            {mode === 'register' && (
              <>
                {renderField({
                  label: 'Password',
                  type: 'password',
                  value: password,
                  onChange: (e) => setPassword(e.target.value),
                  placeholder: 'At least 8 characters',
                  autoComplete: 'new-password',
                })}

                {renderField({
                  label: 'Confirm Password',
                  type: 'password',
                  value: confirmPassword,
                  onChange: (e) =>
                    setConfirmPassword(e.target.value),
                  placeholder: 'Confirm your password',
                  autoComplete: 'new-password',
                })}
              </>
            )}

            {/* ADMIN SECRET */}

            {roleType === 'admin' &&
              mode === 'register' &&
              renderField({
                label: 'Administrator Secret Key',
                type: 'password',
                value: adminSecret,
                onChange: (e) => setAdminSecret(e.target.value),
                placeholder: 'Enter administrator secret',
                autoComplete: 'off',
              })}

            {/* VERIFICATION CODE */}

            {mode === 'verify' && (
              <>
                {roleType === 'admin' &&
                  renderField({
                    label: 'Administrator Email Address',
                    type: 'email',
                    value: email,
                    onChange: (e) => setEmail(e.target.value),
                    placeholder: 'name@example.com',
                    autoComplete: 'email',
                  })}

                {renderField({
                  label: 'Six-Digit Verification Code',
                  value: verificationCode,
                  onChange: (e) =>
                    setVerificationCode(
                      e.target.value.replace(/\D/g, '').slice(0, 6)
                    ),
                  placeholder: 'Enter verification code',
                  autoComplete: 'one-time-code',
                })}
              </>
            )}

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={loading}
              className="sleeqora-submit"
              style={{
                ...buttonStyle,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading
                ? 'Processing...'
                : mode === 'forgot'
                  ? 'Send Recovery Email'
                  : mode === 'register'
                    ? 'Create Account'
                    : mode === 'verify'
                      ? 'Verify Email'
                      : 'Sign In'}
            </button>

            {mode === 'verify' && (
              <button
                type="button"
                onClick={() => changeMode('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1b5e20',
                  cursor: 'pointer',
                  padding: '10px',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                }}
              >
                Back to Login
              </button>
            )}
          </form>

          <div className="sleeqora-form-footer">
            <strong>SLEEQORA</strong>
            <br />
            Connecting learners. Inspiring growth.
          </div>
        </section>
      </main>

      {/* LEARN, COLLABORATE, AND GROW */}

      <section className="sleeqora-learning">
        <h2>
          Learn, Collaborate,
          <br />
          and <span>Grow.</span>
        </h2>

        <p>
          Learning becomes more meaningful when we share
          knowledge, exchange ideas, and work together.
          SLEEQORA provides a community where WesOnline 3MTT
          and mentorship learners can connect, support one
          another, explore new opportunities, and develop the
          skills needed to succeed.
        </p>

        <div className="sleeqora-learning-points">
          <span className="sleeqora-learning-point">
            Learn together
          </span>

          <span className="sleeqora-learning-point">
            Share ideas
          </span>

          <span className="sleeqora-learning-point">
            Build projects
          </span>

          <span className="sleeqora-learning-point">
            Grow together
          </span>
        </div>
      </section>

      {/* ABOUT SLEEQORA */}

      <section className="sleeqora-about">
        <h2>About SLEEQORA</h2>

        <div className="sleeqora-about-content">
          <p>
            SLEEQORA is a collaborative platform designed
            to support interaction, communication, and
            knowledge sharing among WesOnline 3MTT and
            mentorship learners. It provides a central
            community where group leads and administrators
            can connect, exchange experiences, share
            information, and support learning activities.
          </p>

          <div
            className="sleeqora-about-divider"
            aria-hidden="true"
          />

          <p>
            Our goal is to encourage teamwork, innovation,
            continuous learning, and meaningful collaboration.
            By bringing learners together in one interactive
            space, SLEEQORA helps create opportunities to
            discuss ideas, work on projects, learn from
            different perspectives, and grow together as
            a community.
          </p>
        </div>

        <div className="sleeqora-about-bottom">
          SLEEQORA — Connecting learners. Inspiring growth.
        </div>
      </section>
    </div>
  );
}

export default AuthPage;