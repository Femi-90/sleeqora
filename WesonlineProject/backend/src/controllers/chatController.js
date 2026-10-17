import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Admin from '../models/admin.js';
import GroupReport from '../models/groupReport.js';
import ChatMessage from '../models/chatMessage.js';

const getBearerToken = (req) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
};

const identifySender = async (req) => {
  const token = getBearerToken(req);

  if (!token) {
    const error = new Error(
      'You must log in before sending chat messages.'
    );
    error.statusCode = 401;
    throw error;
  }

  if (!process.env.JWT_SECRET) {
    const error = new Error(
      'Server authentication is not configured.'
    );
    error.statusCode = 500;
    throw error;
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    const error = new Error(
      'Your session is invalid or has expired. Please log in again.'
    );
    error.statusCode = 401;
    throw error;
  }

  // Administrator authentication.
  if (decoded.role === 'admin') {
    if (!decoded.id) {
      const error = new Error('Invalid administrator token.');
      error.statusCode = 401;
      throw error;
    }

    const admin = await Admin.findById(decoded.id);

    if (!admin || !admin.isAdmin || !admin.isEmailVerified) {
      const error = new Error(
        'Administrator account is not authorized to chat.'
      );
      error.statusCode = 403;
      throw error;
    }

    const name = [
      admin.firstName,
      admin.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      id: admin._id.toString(),
      role: 'admin',
      displayName: name || admin.email,
    };
  }

  // Group-lead authentication.
  if (
    decoded.role === 'groupLead' ||
    decoded.role === 'learner'
  ) {
    if (!decoded.id || !decoded.groupId) {
      const error = new Error('Invalid group-lead token.');
      error.statusCode = 401;
      throw error;
    }

    const group = await GroupReport.findById(decoded.id);

    if (
      !group ||
      !group.isEmailVerified ||
      group.groupId !==
        String(decoded.groupId).trim().toUpperCase()
    ) {
      const error = new Error(
        'Group-lead account is not authorized to chat.'
      );
      error.statusCode = 403;
      throw error;
    }

    const name = [
      group.leadFirstName,
      group.leadMiddleName,
      group.leadLastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      id: group._id.toString(),
      role: 'groupLead',
      groupId: group.groupId,
      displayName: name || group.groupId,
    };
  }

  const error = new Error(
    'This account type is not authorized to chat.'
  );
  error.statusCode = 403;
  throw error;
};

// SEND A MESSAGE OR REPLY
export const sendMessage = async (req, res) => {
  try {
    const cleanMessage = String(
      req.body?.message || ''
    ).trim();

    const replyToId = req.body?.replyTo || null;

    if (!cleanMessage) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty.',
      });
    }

    if (cleanMessage.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot exceed 2000 characters.',
      });
    }

    const sender = await identifySender(req);

    // Validate the parent message when replying.
    let parentMessage = null;

    if (replyToId) {
      if (!mongoose.Types.ObjectId.isValid(replyToId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid reply reference.',
        });
      }

      parentMessage = await ChatMessage.findById(replyToId);

      if (!parentMessage) {
        return res.status(404).json({
          success: false,
          message: 'The message you are replying to was not found.',
        });
      }
    }

    const displayName =
      sender.role === 'admin'
        ? `${sender.displayName} (Admin)`
        : sender.displayName;

    // Preserve the existing consecutive-message restriction.
    const recentMessages = await ChatMessage.find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .select('displayName')
      .lean();

    if (
      recentMessages.length === 3 &&
      recentMessages.every(
        (item) => item.displayName === displayName
      )
    ) {
      return res.status(429).json({
        success: false,
        message:
          'Please wait for another participant to send a message before posting again.',
      });
    }

    const chatMessage = await ChatMessage.create({
      displayName,
      message: cleanMessage,
      replyTo: parentMessage ? parentMessage._id : null,
    });

    // Return the new message with its reply reference populated.
    const populatedMessage = await ChatMessage.findById(
      chatMessage._id
    )
      .populate({
        path: 'replyTo',
        select: 'displayName message createdAt',
      })
      .lean();

    return res.status(201).json({
      success: true,
      message: parentMessage
        ? 'Reply sent successfully.'
        : 'Message sent successfully.',
      data: populatedMessage,
    });
  } catch (error) {
    console.error('sendMessage error:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Unable to send message.',
    });
  }
};

// GET ALL MESSAGES AND THEIR REPLY REFERENCES
export const getMessages = async (_req, res) => {
  try {
    const messages = await ChatMessage.find({})
      .populate({
        path: 'replyTo',
        select: 'displayName message createdAt',
      })
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    console.error('getMessages error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load chat messages.',
    });
  }
};