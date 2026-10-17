import jwt from 'jsonwebtoken';
import Admin from '../models/admin.js';
import ChatMessage from '../models/chatMessage.js';

/**
 * Authenticate an administrator using a JWT token.
 *
 * Regular participants can connect without an admin token.
 * If a token is supplied, it must be valid.
 */
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    // Allow regular participants to connect without an admin token.
    if (!token) {
      socket.data.admin = null;
      return next();
    }

    if (typeof token !== 'string' || !token.trim()) {
      return next(new Error('Invalid authentication token.'));
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured.');

      return next(
        new Error('Server authentication is not configured.')
      );
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return next(
        new Error(
          error.name === 'TokenExpiredError'
            ? 'Your admin session has expired. Please log in again.'
            : 'Invalid authentication token.'
        )
      );
    }

    if (decoded.role !== 'admin' || !decoded.id) {
      return next(new Error('Invalid administrator credentials.'));
    }

    const admin = await Admin.findById(decoded.id);

    if (!admin || !admin.isAdmin || !admin.isEmailVerified) {
      return next(
        new Error(
          'Administrator account is invalid or not verified.'
        )
      );
    }

    // Store the verified administrator on this socket connection.
    socket.data.admin = {
      id: admin._id.toString(),
      firstName: admin.firstName || '',
      lastName: admin.lastName || '',
      email: admin.email,
    };

    return next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);

    return next(new Error('Unable to authenticate connection.'));
  }
};

/**
 * Return the sender's display name.
 */
const getDisplayName = (socket, firstName, lastName) => {
  const admin = socket.data.admin;

  if (admin) {
    const name = `${admin.firstName} ${admin.lastName}`.trim();

    return `${name || admin.email} (Admin)`;
  }

  return `${firstName.trim()} ${lastName.trim()}`;
};

/**
 * Validate a message payload.
 */
const validateMessage = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return 'A valid message payload is required.';
  }

  const { firstName, lastName, message } = payload;

  if (
    typeof firstName !== 'string' ||
    typeof lastName !== 'string' ||
    !firstName.trim() ||
    !lastName.trim()
  ) {
    return 'Please provide valid firstName and lastName values.';
  }

  if (firstName.trim().length > 50) {
    return 'First name cannot exceed 50 characters.';
  }

  if (lastName.trim().length > 50) {
    return 'Last name cannot exceed 50 characters.';
  }

  if (typeof message !== 'string' || !message.trim()) {
    return 'Please enter a message before sending.';
  }

  if (message.trim().length > 2000) {
    return 'Message cannot exceed 2000 characters.';
  }

  return null;
};

/**
 * Check the three most recent messages to enforce
 * the consecutive-message restriction.
 */
const checkConsecutiveMessages = async (displayName) => {
  const recentMessages = await ChatMessage.find({})
    .sort({ createdAt: -1, _id: -1 })
    .limit(3)
    .select('displayName')
    .lean();

  let consecutiveCount = 0;

  for (const recentMessage of recentMessages) {
    if (recentMessage.displayName === displayName) {
      consecutiveCount++;
    } else {
      break;
    }
  }

  return consecutiveCount >= 3;
};

/**
 * Send an error to a client.
 *
 * If the client supplied an acknowledgement callback,
 * return the error through that callback as well.
 */
const sendSocketError = (socket, message, acknowledge) => {
  const response = {
    success: false,
    message,
  };

  if (typeof acknowledge === 'function') {
    acknowledge(response);
  }

  socket.emit('chat:error', response);
};

/**
 * Configure Socket.IO chat events.
 *
 * Supported client events:
 *
 *   chat:send
 *
 * Server events:
 *
 *   chat:history
 *   chat:new-message
 *   chat:error
 */
export const setupChatSocket = (io) => {
  // Authenticate connections that supply an admin token.
  io.use(authenticateSocket);

  io.on('connection', async (socket) => {
    console.log(`Chat client connected: ${socket.id}`);

    /**
     * Load existing messages for this client.
     */
    try {
      const messages = await ChatMessage.find({})
        .sort({ createdAt: 1, _id: 1 })
        .lean();

      socket.emit('chat:history', {
        success: true,
        count: messages.length,
        data: messages,
      });
    } catch (error) {
      console.error('Unable to load chat history:', error);

      socket.emit('chat:error', {
        success: false,
        message: 'Unable to load chat history.',
      });
    }

    /**
     * Receive and save a new message.
     *
     * Client example:
     *
     * socket.emit(
     *   'chat:send',
     *   { firstName, lastName, message },
     *   (response) => console.log(response)
     * );
     */
    socket.on('chat:send', async (payload, acknowledge) => {
      try {
        // Validate the incoming message.
        const validationError = validateMessage(payload);

        if (validationError) {
          return sendSocketError(
            socket,
            validationError,
            acknowledge
          );
        }

        const {
          firstName,
          lastName,
          message,
        } = payload;

        const displayName = getDisplayName(
          socket,
          firstName,
          lastName
        );

        // Enforce the three-consecutive-message restriction.
        const limitReached = await checkConsecutiveMessages(
          displayName
        );

        if (limitReached) {
          return sendSocketError(
            socket,
            'You cannot send more than 3 consecutive messages. Please wait for another participant to reply.',
            acknowledge
          );
        }

        // Save the message in MongoDB.
        const chatMessage = await ChatMessage.create({
          displayName,
          message: message.trim(),
        });

        const savedMessage = chatMessage.toObject();

        // Acknowledge the sender.
        if (typeof acknowledge === 'function') {
          acknowledge({
            success: true,
            message: 'Message sent successfully.',
            data: savedMessage,
          });
        }

        // Broadcast the saved message to all connected clients.
        io.emit('chat:new-message', savedMessage);

        console.log(
          `Chat message saved from ${displayName}`
        );
      } catch (error) {
        console.error('Error sending socket message:', error);

        sendSocketError(
          socket,
          'Failed to send your message. Please try again.',
          acknowledge
        );
      }
    });

    /**
     * Handle client disconnection.
     */
    socket.on('disconnect', (reason) => {
      console.log(
        `Chat client disconnected: ${socket.id}. Reason: ${reason}`
      );
    });
  });

  console.log('Chat Socket.IO handlers initialized.');
};