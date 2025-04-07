import mongoose, { Document, Schema } from 'mongoose';
import { User as UserType } from '@shared/models';

export interface UserDocument extends Document, Omit<UserType, 'password'> {
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: function(this: UserDocument) {
        // Generate default avatar URL based on display name initials
        const initials = this.displayName
          .split(' ')
          .map(name => name[0])
          .join('')
          .toUpperCase();
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random`;
      }
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'away'],
      default: 'offline'
    },
    bio: {
      type: String,
      default: '',
      maxlength: 200
    }
  },
  { timestamps: true }
);

export default mongoose.model<UserDocument>('User', UserSchema);