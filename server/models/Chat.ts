import mongoose, { Document, Schema } from 'mongoose';
import { Chat as ChatType } from '@shared/models';

export interface ChatDocument extends Document, ChatType {
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema = new Schema<ChatDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: '',
    },
    lastMessage: {
      type: String,
      default: '',
    },
    lastMessageTime: {
      type: Date,
      default: null,
    },
    isGroup: {
      type: Boolean,
      default: false,
    },
    creatorId: {
      type: String,
      ref: 'User',
      required: function(this: ChatDocument) {
        return this.isGroup;
      },
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
  },
  { timestamps: true }
);

export default mongoose.model<ChatDocument>('Chat', ChatSchema);