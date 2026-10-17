import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import axios from 'axios';

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');

const CHAT_URL = `${API_BASE}/chat`;

/* =========================================================
   SESSION MANAGEMENT
========================================================= */

function getStoredSession() {
  const adminToken = localStorage.getItem('adminToken');
  const groupToken = localStorage.getItem('groupToken');

  let adminUser = null;
  let groupUser = null;

  try {
    adminUser = JSON.parse(
      localStorage.getItem('adminUser') || 'null'
    );
  } catch {
    adminUser = null;
  }

  try {
    groupUser = JSON.parse(
      localStorage.getItem('groupUser') || 'null'
    );
  } catch {
    groupUser = null;
  }

  const path = window.location.pathname.toLowerCase();

  if (path.includes('admin') && adminToken) {
    return {
      token: adminToken,
      user: adminUser,
      role: 'admin',
    };
  }

  if (path.includes('chat') && groupToken && !adminToken) {
    return {
      token: groupToken,
      user: groupUser,
      role: 'learner',
    };
  }

  if (adminToken) {
    return {
      token: adminToken,
      user: adminUser,
      role: 'admin',
    };
  }

  if (groupToken) {
    return {
      token: groupToken,
      user: groupUser,
      role: 'learner',
    };
  }

  return {
    token: null,
    user: null,
    role: null,
  };
}

/* =========================================================
   MESSAGE HELPERS
========================================================= */

function getMessageId(message) {
  return message?._id || message?.id || '';
}

function getReplyId(message) {
  if (!message?.replyTo) {
    return null;
  }

  if (typeof message.replyTo === 'string') {
    return message.replyTo;
  }

  return message.replyTo._id || message.replyTo.id || null;
}

function getDisplayName(message) {
  if (message?.displayName) {
    return message.displayName;
  }

  const user = message?.user;

  if (typeof user === 'string') {
    return user;
  }

  if (user?.name) {
    return user.name;
  }

  if (user?.firstName || user?.lastName) {
    return [
      user.firstName,
      user.lastName,
    ]
      .filter(Boolean)
      .join(' ');
  }

  if (message?.leadFirstName || message?.leadLastName) {
    return [
      message.leadFirstName,
      message.leadLastName,
    ]
      .filter(Boolean)
      .join(' ');
  }

  return 'Community member';
}

function getMessageDate(message) {
  if (!message?.createdAt) {
    return '';
  }

  const date = new Date(message.createdAt);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getMessagesFromResponse(responseData) {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData?.messages)) {
    return responseData.messages;
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }

  return [];
}

/* =========================================================
   CHAT COMPONENT
========================================================= */

function Chat() {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Timestamp (ms) of the newest message hidden by the Refresh button.
  // Messages at or before this time are hidden from the chat box only;
  // nothing is deleted from the database.
  const [clearedAt, setClearedAt] = useState(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);

  const session = getStoredSession();

  /* =======================================================
     AUTHORIZATION HEADERS
  ======================================================= */

  const authHeaders = useCallback(() => {
    const currentSession = getStoredSession();

    if (!currentSession.token) {
      return {};
    }

    return {
      Authorization: `Bearer ${currentSession.token}`,
    };
  }, []);

  /* =======================================================
     FETCH CHAT MESSAGES
  ======================================================= */

  const fetchMessages = useCallback(
    async (showLoading = false) => {
      const currentSession = getStoredSession();

      if (!currentSession.token) {
        setError(
          'Please log in to access the community chat.'
        );

        setLoading(false);
        return;
      }

      try {
        if (showLoading) {
          setLoading(true);
        }

        const response = await axios.get(CHAT_URL, {
          headers: authHeaders(),
        });

        const receivedMessages = getMessagesFromResponse(
          response.data
        );

        setMessages(receivedMessages);
        setError('');
      } catch (err) {
        console.error(
          'Unable to fetch chat messages:',
          err
        );

        setError(
          err.response?.data?.message ||
            'Unable to load messages. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    },
    [authHeaders]
  );

  /* =======================================================
     INITIAL LOAD AND AUTOMATIC REFRESH
  ======================================================= */

  useEffect(() => {
    fetchMessages(true);

    const intervalId = window.setInterval(() => {
      fetchMessages(false);
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchMessages]);

  /* =======================================================
     MESSAGES CURRENTLY SHOWN IN THE CHAT BOX
  ======================================================= */

  const visibleMessages = clearedAt
    ? messages.filter((m) => {
        const time = new Date(m?.createdAt).getTime();
        return !Number.isNaN(time) && time > clearedAt;
      })
    : messages;

  /* =======================================================
     SCROLL TO LATEST MESSAGE
  ======================================================= */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [visibleMessages.length]);

  /* =======================================================
     MANUAL REFRESH (CLEARS THE CHAT BOX ONLY)
  ======================================================= */

  const handleRefresh = async () => {
    setError('');
    setSuccess('');

    // Hide everything up to the newest message currently loaded
    const latest = messages.reduce((max, m) => {
      const time = new Date(m?.createdAt).getTime();
      return Number.isNaN(time) ? max : Math.max(max, time);
    }, clearedAt || 0);

    if (latest) {
      setClearedAt(latest);
    }

    // Still fetch, so any brand-new messages show up straight away
    await fetchMessages(false);
  };

  /* =======================================================
     REPLY MANAGEMENT
  ======================================================= */

  const handleReply = (message) => {
    const newMention = `@${getDisplayName(message)} `;

    // Remove the mention of a previously selected reply target, if still there
    let currentText = messageText;
    if (selectedMessage) {
      const oldMention = `@${getDisplayName(selectedMessage)} `;
      if (currentText.startsWith(oldMention)) {
        currentText = currentText.slice(oldMention.length);
      }
    }

    setSelectedMessage(message);
    setMessageText(
      currentText.startsWith(newMention)
        ? currentText
        : newMention + currentText
    );

    window.setTimeout(() => {
      const input = messageInputRef.current;
      if (input) {
        input.focus();
        const end = input.value.length;
        input.setSelectionRange(end, end);
      }
    }, 0);
  };

  const cancelReply = () => {
    if (selectedMessage) {
      const mention = `@${getDisplayName(selectedMessage)} `;
      setMessageText((text) =>
        text.startsWith(mention) ? text.slice(mention.length) : text
      );
    }
    setSelectedMessage(null);
  };

  /* =======================================================
     SEND MESSAGE
  ======================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (sending) {
      return;
    }

    const cleanMessage = messageText.trim();

    if (!cleanMessage) {
      setError('Please enter a message before sending.');
      return;
    }

    const currentSession = getStoredSession();

    if (!currentSession.token) {
      setError(
        'Your session has expired. Please log in again.'
      );

      return;
    }

    setSending(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        message: cleanMessage,
      };

      if (selectedMessage) {
        const replyId = getMessageId(selectedMessage);

        if (replyId) {
          payload.replyTo = replyId;
        }
      }

      const response = await axios.post(
        CHAT_URL,
        payload,
        {
          headers: {
            ...authHeaders(),
            'Content-Type': 'application/json',
          },
        }
      );

      setMessageText('');
      setSelectedMessage(null);

      setSuccess(
        response.data?.message &&
          typeof response.data.message === 'string' &&
          response.data.message.toLowerCase().includes('sent')
          ? response.data.message
          : 'Message sent successfully.'
      );

      await fetchMessages(false);

      window.setTimeout(() => {
        messageInputRef.current?.focus();
      }, 0);
    } catch (err) {
      console.error(
        'Unable to send chat message:',
        err
      );

      setError(
        err.response?.data?.message ||
          'Your message could not be sent. Please try again.'
      );
    } finally {
      setSending(false);
    }
  };

  /* =======================================================
     SCROLL TO REFERENCED MESSAGE
  ======================================================= */

  const scrollToMessage = (messageId) => {
    if (!messageId) {
      return;
    }

    const element = document.getElementById(
      `message-${messageId}`
    );

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });

    element.classList.add('chat-message-highlight');

    window.setTimeout(() => {
      element.classList.remove('chat-message-highlight');
    }, 1500);
  };

  /* =======================================================
     CURRENT USER NAME
  ======================================================= */

  const currentUserName =
    session.user?.name ||
    [
      session.user?.firstName ||
        session.user?.leadFirstName,
      session.user?.lastName ||
        session.user?.leadLastName,
    ]
      .filter(Boolean)
      .join(' ') ||
    session.user?.groupId ||
    (session.role === 'admin'
      ? 'Administrator'
      : 'Community member');

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="community-chat-page">
      <style>
        {`
          html,
          body,
          #root {
            min-height: 100%;
            margin: 0;
          }

          body {
            min-height: 100vh;
          }

          .community-chat-page {
            position: relative;
            isolation: isolate;

            display: flex;
            align-items: center;
            justify-content: center;
            gap: 34px;

            width: 100%;
            min-height: 100vh;
            padding: 35px 5%;

            background-image:
              linear-gradient(
                rgba(9, 35, 17, 0.28),
                rgba(9, 35, 17, 0.38)
              ),
              url('/static05.jpeg');

            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            background-attachment: fixed;

            font-family:
              Inter,
              'Segoe UI',
              Roboto,
              Arial,
              sans-serif;
          }

          .community-chat-page *,
          .community-chat-page *::before,
          .community-chat-page *::after {
            box-sizing: border-box;
          }

          /* LEFT INTRODUCTION */

          .rub-minds-section {
            flex: 0 1 370px;
            max-width: 370px;
            padding: 28px 25px;

            color: #ffffff;
            background: #174d2a;

            border: 1px solid #28663b;
            border-radius: 18px;

            box-shadow:
              0 16px 40px rgba(0, 0, 0, 0.24);

            animation: rubMindsEnter 0.8s ease both;
          }

          .rub-minds-label {
            display: inline-block;
            margin-bottom: 15px;

            color: #b9efbd;
            font-size: 0.76rem;
            font-weight: 800;
            letter-spacing: 2.5px;
            text-transform: uppercase;
          }

          .rub-minds-section h1 {
            margin: 0 0 18px;

            color: #ffffff;
            font-size: clamp(2rem, 3.2vw, 3rem);
            font-weight: 900;
            letter-spacing: -1.3px;
            line-height: 1.1;
          }

          .rub-minds-section h1 span {
            display: block;
            color: #b9efbd;
          }

          .rub-minds-section p {
            margin: 0;

            color: #f0fff1;
            font-size: 0.98rem;
            line-height: 1.85;
          }

          .rub-minds-divider {
            width: 62px;
            height: 4px;
            margin: 22px 0 18px;

            border-radius: 20px;
            background: #a5d6a7;
          }

          .rub-minds-tagline {
            color: #d8f5da;
            font-size: 0.82rem;
            font-weight: 700;
            letter-spacing: 0.3px;
            line-height: 1.7;
          }

          /* CHAT PANEL */

          .community-chat-panel {
            position: relative;

            flex: 1 1 700px;
            width: 100%;
            max-width: 800px;
            min-width: 0;

            background: rgba(14, 37, 22, 0.60);

            border: 1px solid rgba(222, 255, 225, 0.27);
            border-radius: 20px;
            padding: 25px;

            box-shadow:
              0 22px 65px rgba(0, 0, 0, 0.23),
              inset 0 1px 0 rgba(255, 255, 255, 0.08);

            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);

            color: #ffffff;
            overflow: hidden;

            animation: chatPanelEnter 0.7s ease both;
          }

          /* GREEN HEADER */

          .community-chat-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;

            background: #24733b;

            padding: 19px 18px;
            margin: -25px -25px 20px;

            border-bottom: 2px solid #70b77d;
            border-radius: 19px 19px 0 0;
          }

          .community-chat-heading {
            min-width: 0;
          }

          .community-chat-heading h2 {
            margin: 0;

            color: #ffffff;
            font-size: 1.55rem;
            font-weight: 850;
            letter-spacing: -0.5px;
          }

          .community-chat-heading p {
            margin: 7px 0 0;

            color: #e0f4e3;
            font-size: 0.85rem;
            line-height: 1.5;
          }

          .community-chat-user {
            margin-top: 10px;

            color: #e0f4e3;
            font-size: 0.8rem;
            overflow-wrap: anywhere;
          }

          .community-chat-user strong {
            color: #77c8ff;
            font-weight: 800;
          }

          /* TRANSPARENT GREEN BUTTONS */

          .chat-action-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;

            padding: 9px 13px;

            color: #e2f8e5;
            background: rgba(155, 220, 162, 0.13);

            border: 1px solid rgba(180, 239, 187, 0.35);
            border-radius: 9px;

            font-size: 0.82rem;
            font-weight: 750;

            cursor: pointer;
            white-space: nowrap;

            transition:
              background 0.2s ease,
              border-color 0.2s ease,
              transform 0.2s ease;
          }

          .chat-action-button:hover:not(:disabled) {
            background: rgba(155, 220, 162, 0.28);
            border-color: #c8ffcf;
            transform: translateY(-1px);
          }

          .chat-action-button:disabled {
            cursor: not-allowed;
            opacity: 0.55;
          }

          .chat-refresh-button {
            flex-shrink: 0;
          }

          /* STATUS MESSAGES */

          .chat-status {
            padding: 10px 12px;
            margin-bottom: 12px;

            border-radius: 9px;
            font-size: 0.84rem;
            line-height: 1.55;
            overflow-wrap: anywhere;
          }

          .chat-error {
            color: #ffe4e4;
            background: rgba(153, 27, 27, 0.38);
            border: 1px solid rgba(252, 165, 165, 0.32);
          }

          .chat-success {
            color: #e4ffe7;
            background: rgba(22, 101, 52, 0.38);
            border: 1px solid rgba(134, 239, 172, 0.28);
          }

          /* MESSAGE AREA */

          .chat-messages {
            display: flex;
            flex-direction: column;
            gap: 11px;

            height: 430px;
            padding: 15px 12px;

            overflow-y: auto;
            overflow-x: hidden;

            background: rgba(35, 116, 57, 0.40);

            border: 1px solid rgba(180, 239, 187, 0.25);
            border-radius: 12px;

            scrollbar-width: thin;
            scrollbar-color:
              rgba(183, 239, 190, 0.65)
              rgba(255, 255, 255, 0.07);

            overscroll-behavior: contain;
          }

          .chat-messages::-webkit-scrollbar {
            width: 7px;
          }

          .chat-messages::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.06);
            border-radius: 20px;
          }

          .chat-messages::-webkit-scrollbar-thumb {
            background: rgba(183, 239, 190, 0.65);
            border-radius: 20px;
          }

          .chat-empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex: 1;

            min-height: 170px;
            padding: 25px;

            text-align: center;
            color: #f1fff2;
          }

          .chat-empty-icon {
            display: flex;
            align-items: center;
            justify-content: center;

            width: 48px;
            height: 48px;
            margin-bottom: 12px;

            border-radius: 50%;
            background: rgba(155, 220, 162, 0.18);
            border: 1px solid rgba(180, 239, 187, 0.32);

            color: #d4f7d8;
            font-size: 1.4rem;
          }

          .chat-empty-state strong {
            margin-bottom: 6px;
            color: #ffffff;
            font-size: 0.95rem;
          }

          .chat-empty-state span {
            font-size: 0.82rem;
            line-height: 1.6;
          }

          /* MESSAGE CARDS */

          .chat-message-card {
            align-self: flex-start;
            width: fit-content;
            max-width: 92%;
            min-width: 170px;

            padding: 12px 14px 10px;

            background: rgba(13, 57, 28, 0.72);
            border: 1px solid rgba(204, 255, 210, 0.24);
            border-radius: 13px 13px 13px 4px;

            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);

            animation: messageEnter 0.25s ease both;

            overflow-wrap: anywhere;

            transition:
              background 0.2s ease,
              border-color 0.2s ease;
          }

          .chat-message-card:hover {
            background: rgba(20, 77, 37, 0.88);
            border-color: rgba(204, 255, 210, 0.4);
          }

          .chat-message-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 5px 12px;
            margin-bottom: 7px;
          }

          .chat-sender-name {
            color: #77c8ff;
            font-size: 0.83rem;
            font-weight: 850;
            line-height: 1.4;
          }

          .chat-message-time {
            color: rgba(255, 255, 255, 0.72);
            font-size: 0.69rem;
            white-space: nowrap;
          }

          .chat-message-text {
            margin: 0;

            color: #ffffff;
            font-size: 0.89rem;
            line-height: 1.65;

            white-space: pre-wrap;
            overflow-wrap: anywhere;
          }

          /* REPLY REFERENCES */

          .chat-reply-reference {
            width: 100%;
            margin: 0 0 9px;
            padding: 8px 10px;

            text-align: left;

            color: rgba(255, 255, 255, 0.9);
            background: rgba(0, 0, 0, 0.18);

            border: none;
            border-left: 3px solid #a5d6a7;
            border-radius: 4px 8px 8px 4px;

            cursor: pointer;
            transition: background 0.2s ease;
          }

          .chat-reply-reference:hover {
            background: rgba(0, 0, 0, 0.30);
          }

          .chat-reply-label {
            display: block;
            margin-bottom: 3px;

            color: #b9efbd;
            font-size: 0.7rem;
            font-weight: 800;
          }

          .chat-reply-author {
            display: block;
            margin-bottom: 3px;

            color: #77c8ff;
            font-size: 0.76rem;
            font-weight: 800;
          }

          .chat-reply-text {
            display: -webkit-box;
            overflow: hidden;

            color: rgba(255, 255, 255, 0.85);
            font-size: 0.76rem;
            line-height: 1.45;
            overflow-wrap: anywhere;

            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }

          .chat-reply-button {
            display: inline-flex;
            margin-top: 8px;
            padding: 5px 9px;

            color: #d9fadd;
            background: rgba(155, 220, 162, 0.13);

            border: 1px solid rgba(180, 239, 187, 0.25);
            border-radius: 6px;

            font-size: 0.72rem;
            font-weight: 750;

            cursor: pointer;
            transition: background 0.2s ease;
          }

          .chat-reply-button:hover {
            background: rgba(155, 220, 162, 0.28);
          }

          .chat-message-highlight {
            outline: 2px solid #a5d6a7;
            background: rgba(165, 214, 167, 0.28) !important;
          }

          /* REPLY COMPOSER */

          .chat-replying-to {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;

            margin-top: 15px;
            padding: 10px 12px;

            background: rgba(35, 116, 57, 0.35);
            border: 1px solid rgba(180, 239, 187, 0.3);
            border-radius: 9px;
          }

          .chat-replying-content {
            min-width: 0;
            overflow-wrap: anywhere;
          }

          .chat-replying-content strong {
            display: block;
            margin-bottom: 4px;

            color: #b9efbd;
            font-size: 0.75rem;
          }

          .chat-replying-content span {
            display: block;

            color: rgba(255, 255, 255, 0.9);
            font-size: 0.8rem;
            line-height: 1.5;
          }

          .chat-cancel-reply {
            flex-shrink: 0;
            padding: 6px 9px;

            color: #f7caca;
            background: rgba(153, 27, 27, 0.18);

            border: 1px solid rgba(252, 165, 165, 0.2);
            border-radius: 7px;

            font-size: 0.75rem;
            cursor: pointer;
          }

          .chat-cancel-reply:hover {
            background: rgba(153, 27, 27, 0.32);
          }

          /* MESSAGE INPUT */

          .chat-composer {
            display: flex;
            align-items: flex-end;
            gap: 10px;
            margin-top: 15px;
          }

          .chat-message-input {
            flex: 1;
            width: 100%;
            min-width: 0;
            min-height: 48px;
            max-height: 130px;
            resize: vertical;

            padding: 13px 14px;

            color: #ffffff;
            background: rgba(255, 255, 255, 0.09);

            border: 1px solid rgba(210, 255, 216, 0.3);
            border-radius: 11px;

            font: inherit;
            font-size: 0.9rem;
            line-height: 1.5;

            outline: none;

            transition:
              border-color 0.2s ease,
              background 0.2s ease,
              box-shadow 0.2s ease;
          }

          .chat-message-input::placeholder {
            color: rgba(255, 255, 255, 0.7);
          }

          .chat-message-input:focus {
            border-color: #a5d6a7;
            background: rgba(255, 255, 255, 0.13);
            box-shadow: 0 0 0 3px rgba(165, 214, 167, 0.12);
          }

          /* SEND BUTTON */

          .chat-send-button {
            min-height: 48px;
            padding: 0 19px;

            color: #f0fff1;
            background: rgba(46, 125, 50, 0.7);

            border: 1px solid rgba(165, 214, 167, 0.5);
            border-radius: 11px;

            font-size: 0.88rem;
            font-weight: 850;

            cursor: pointer;
            white-space: nowrap;

            transition:
              background 0.2s ease,
              transform 0.2s ease;
          }

          .chat-send-button:hover:not(:disabled) {
            background: rgba(56, 142, 60, 0.95);
            transform: translateY(-1px);
          }

          .chat-send-button:disabled {
            opacity: 0.55;
            cursor: not-allowed;
          }

          .chat-panel-footer {
            margin-top: 13px;

            text-align: center;
            color: rgba(255, 255, 255, 0.7);

            font-size: 0.73rem;
            line-height: 1.6;
          }

          /* ANIMATIONS */

          @keyframes chatPanelEnter {
            from {
              opacity: 0;
              transform: translateX(18px);
            }

            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes rubMindsEnter {
            from {
              opacity: 0;
              transform: translateX(-18px);
            }

            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes messageEnter {
            from {
              opacity: 0;
              transform: translateY(5px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          /* TABLET */

          @media (max-width: 1050px) {
            .community-chat-page {
              gap: 20px;
              padding: 28px 3%;
            }

            .rub-minds-section {
              flex-basis: 300px;
              padding: 23px 20px;
            }

            .community-chat-panel {
              flex-basis: 620px;
              padding: 21px;
            }

            .community-chat-header {
              margin: -21px -21px 20px;
              padding: 17px;
            }

            .chat-messages {
              height: 410px;
            }
          }

          /* MOBILE */

          @media (max-width: 760px) {
            .community-chat-page {
              flex-direction: column;
              align-items: stretch;
              justify-content: flex-start;
              gap: 18px;

              padding: 18px 13px 25px;
              background-attachment: scroll;
            }

            .rub-minds-section {
              flex: none;
              width: 100%;
              max-width: none;
              padding: 22px 20px;
              border-radius: 15px;
            }

            .rub-minds-section h1 {
              font-size: 2.1rem;
            }

            .rub-minds-section p {
              font-size: 0.91rem;
              line-height: 1.75;
            }

            .community-chat-panel {
              flex: none;
              width: 100%;
              max-width: none;
              padding: 18px 14px;
              border-radius: 15px;
            }

            .community-chat-header {
              margin: -18px -14px 17px;
              padding: 17px 14px;
              border-radius: 14px 14px 0 0;
            }

            .community-chat-heading h2 {
              font-size: 1.3rem;
            }

            .chat-messages {
              height: 380px;
            }

            .chat-message-card {
              max-width: 96%;
              min-width: 0;
            }
          }

          @media (max-width: 420px) {
            .community-chat-page {
              padding: 12px 9px 20px;
            }

            .rub-minds-section {
              padding: 19px 16px;
            }

            .community-chat-panel {
              padding: 15px 11px;
            }

            .community-chat-header {
              margin: -15px -11px 15px;
              padding: 15px 11px;
            }

            .community-chat-heading h2 {
              font-size: 1.15rem;
            }

            .community-chat-heading p {
              font-size: 0.78rem;
            }

            .chat-refresh-button {
              padding: 8px 9px;
              font-size: 0.74rem;
            }

            .chat-messages {
              height: 350px;
              padding: 10px;
            }

            .chat-composer {
              gap: 7px;
            }

            .chat-message-input {
              padding: 11px;
              font-size: 0.84rem;
            }

            .chat-send-button {
              min-height: 45px;
              padding: 0 12px;
              font-size: 0.8rem;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .community-chat-page *,
            .community-chat-page *::before,
            .community-chat-page *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
              scroll-behavior: auto !important;
            }
          }
        `}
      </style>

      {/* LEFT INTRODUCTION */}

      <aside className="rub-minds-section">
        <span className="rub-minds-label">
          SLEEQORA COMMUNITY
        </span>

        <h1>
          LET US
          <span>RUB MINDS.</span>
        </h1>

        <p>
          Great ideas grow when we share them. Connect with fellow
          learners, exchange knowledge, discuss challenges, and
          collaborate on projects. Ask questions, offer support,
          and learn from different perspectives. Together, let us
          build skills, solve problems, and create meaningful
          opportunities for everyone.
        </p>

        <div className="rub-minds-divider" />

        <div className="rub-minds-tagline">
          Share ideas. Learn together. Grow together.
        </div>
      </aside>

      {/* CHAT PANEL */}

      <main className="community-chat-panel">
        <header className="community-chat-header">
          <div className="community-chat-heading">
            <h2>Community Chat</h2>

            <p>
              Connect, exchange ideas, and learn together.
            </p>

            <div className="community-chat-user">
              Signed in as:{' '}
              <strong>{currentUserName}</strong>
            </div>
          </div>

          <button
            type="button"
            className="chat-action-button chat-refresh-button"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh messages"
          >
            ↻ Refresh
          </button>
        </header>

        {error && (
          <div
            className="chat-status chat-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="chat-status chat-success"
            role="status"
          >
            {success}
          </div>
        )}

        <div className="chat-messages">
          {loading && visibleMessages.length === 0 ? (
            <div className="chat-empty-state">
              <strong>Loading messages...</strong>
            </div>
          ) : visibleMessages.length === 0 ? (
            <div className="chat-empty-state">
              <div className="chat-empty-icon">💬</div>
              <strong>No messages yet</strong>
              <span>Be the first to start the conversation!</span>
            </div>
          ) : (
            visibleMessages.map((msg) => {
              const msgId = getMessageId(msg);
              return (
                <div
                  key={msgId || Math.random()}
                  id={`message-${msgId}`}
                  className="chat-message-card"
                >
                  {msg?.replyTo && (
                    <button
                      type="button"
                      className="chat-reply-reference"
                      onClick={() => scrollToMessage(getReplyId(msg))}
                    >
                      <span className="chat-reply-label">Replying to</span>
                      <span className="chat-reply-author">
                        {getDisplayName(msg.replyTo)}
                      </span>
                      <span className="chat-reply-text">
                        {typeof msg.replyTo === 'object' ? msg.replyTo.message : 'Original message'}
                      </span>
                    </button>
                  )}

                  <div className="chat-message-header">
                    <span className="chat-sender-name">
                      {getDisplayName(msg)}
                    </span>
                    <span className="chat-message-time">
                      {getMessageDate(msg)}
                    </span>
                  </div>

                  <p className="chat-message-text">{msg.message}</p>

                  <button
                    type="button"
                    className="chat-reply-button"
                    onClick={() => handleReply(msg)}
                  >
                    Reply
                  </button>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {selectedMessage && (
          <div className="chat-replying-to">
            <div className="chat-replying-content">
              <strong>Replying to {getDisplayName(selectedMessage)}</strong>
              <span>{selectedMessage.message}</span>
            </div>
            <button
              type="button"
              className="chat-cancel-reply"
              onClick={cancelReply}
            >
              Cancel
            </button>
          </div>
        )}

        <form className="chat-composer" onSubmit={handleSubmit}>
          <textarea
            ref={messageInputRef}
            className="chat-message-input"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type your message here..."
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            className="chat-send-button"
            disabled={sending || !messageText.trim()}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </main>
    </div>
  );
}

export default Chat;