import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    displayName: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    // References the message being replied to.
    // This can reference either a normal message or another reply.
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatMessage',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const ChatMessage =
  mongoose.models.ChatMessage ||
  mongoose.model('ChatMessage', chatMessageSchema);

export default ChatMessage;