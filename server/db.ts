import mongoose from 'mongoose';
import { log } from './vite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB connection URI
const DATABASE_URI = process.env.DATABASE_URI || 'mongodb://localhost:27017/chat-app';

// Connect to MongoDB
export const connectDB = async () => {
  try {
    await mongoose.connect(DATABASE_URI);
    log('MongoDB connected successfully', 'mongodb');
    return mongoose.connection;
  } catch (error) {
    log(`MongoDB connection error: ${error}`, 'mongodb');
    process.exit(1);
  }
};

// Export the mongoose instance
export const db = mongoose;

// Exports for reference by storage.ts and other modules
export const mongoClient = mongoose.connection.getClient();