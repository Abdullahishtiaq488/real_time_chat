import mongoose, { Document, Schema } from 'mongoose';
import { Message as MessageType } from '@shared/models';

export interface MessageDocument extends Document, MessageType {
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<MessageDocument>(
  {
    chatId: {
      type: String,
      ref: 'Chat',
      required: true
    },
    senderId: {
      type: String,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readBy: [{
      type: String,
      ref: 'User'
    }],
    attachments: [{
      url: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['image', 'file'],
        required: true
      },
      name: {
        type: String,
        default: ''
      }
    }],
    reactions: [{
      userId: {
        type: String,
        ref: 'User',
        required: true
      },
      emoji: {
        type: String,
        required: true
      }
    }],
    isSystemMessage: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Add index for faster queries
MessageSchema.index({ chatId: 1, createdAt: -1 });

export default mongoose.model<MessageDocument>('Message', MessageSchema);