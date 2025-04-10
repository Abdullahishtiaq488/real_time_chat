import mongoose from "mongoose";
import { UserSchema, ChatSchema, MessageSchema } from "@shared/schema";
import User from './User';
import Chat from './Chat';
import Message from './Message';
import ChatMember from './ChatMember';

export const UserModel = mongoose.model("User", UserSchema);
export const ChatModel = mongoose.model("Chat", ChatSchema);
export const MessageModel = mongoose.model("Message", MessageSchema);

export {
  User,
  Chat,
  Message,
  ChatMember
};