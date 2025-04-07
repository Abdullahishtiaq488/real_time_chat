import mongoose, { Document, Schema } from 'mongoose';
import { ChatMember as ChatMemberType } from '@shared/models';

export interface ChatMemberDocument extends Document, ChatMemberType {
  createdAt: Date;
  updatedAt: Date;
}

const ChatMemberSchema = new Schema<ChatMemberDocument>(
  {
    chatId: {
      type: String,
      ref: 'Chat',
      required: true
    },
    userId: {
      type: String,
      ref: 'User',
      required: true
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastReadAt: {
      type: Date,
      default: null
    },
    nickname: {
      type: String,
      default: ''
    },
    unreadCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Add a compound index to ensure uniqueness
ChatMemberSchema.index({ chatId: 1, userId: 1 }, { unique: true });

export default mongoose.model<ChatMemberDocument>('ChatMember', ChatMemberSchema);