import mongoose from 'mongoose';
import { log } from './utils/logger';
import dotenv from 'dotenv';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { UserModel } from './models';

// Load environment variables
dotenv.config();

const scryptAsync = promisify(scrypt);

// Get MongoDB URI from environment variables
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/livechat';

// Mask credentials in the URI for logging
const maskUri = (uri: string) => {
  try {
    const url = new URL(uri);
    if (url.username) {
      url.username = '***';
      url.password = '***';
    }
    return url.toString();
  } catch (e) {
    return uri.replace(/\/\/(.+?)@/, '//***:***@');
  }
};

// Log the masked URI
log(`Using database URI: ${maskUri(MONGO_URI)}`, 'mongodb');

// Simple hash function for passwords
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

// Connect to MongoDB with retry logic
export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // Reduced from default 30000ms
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000, 
    });
    
    log(`MongoDB connected successfully to database: ${mongoose.connection.name}`, 'mongodb');

    // Check if collections exist
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    // Check for users collection and create if needed
    if (collections.some(c => c.name === 'users')) {
      log('Found users collection, checking for indexes...', 'mongodb');
      
      // Get indexes on users collection
      const userIndexes = await mongoose.connection.db.collection('users').indexes();
      log(`Found indexes: ${JSON.stringify(Object.keys(userIndexes))}`, 'mongodb');
      
      // Create index on username if it doesn't exist
      if (!userIndexes.some((idx: any) => idx.key && idx.key.username)) {
        await mongoose.connection.db.collection('users').createIndex({ username: 1 }, { unique: true });
        log('Created index on username field', 'mongodb');
      }
    }
    
    // Create test user if needed
    await createTestUserIfNeeded();
    
    return mongoose.connection;
  } catch (error) {
    log(`MongoDB connection error: ${error}`, 'mongodb');
    process.exit(1);
  }
}

// Export mongoose client for session store
export const mongoClient = mongoose.connection.getClient();

// Create a test user if no users exist
export async function createTestUserIfNeeded() {
  try {
    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      log('No users found in database, creating test user...', 'mongodb');
      
      const hashedPassword = await hashPassword('test123');
      
      const testUser = new UserModel({
        username: 'test',
        password: hashedPassword,
        displayName: 'Test User',
        status: 'offline'
      });
      
      await testUser.save();
      
      log('Created test user: test / test123', 'mongodb');
    } else {
      log(`Found ${userCount} existing users in database`, 'mongodb');
    }
  } catch (error) {
    log(`Error checking/creating test user: ${error}`, 'mongodb');
  }
}

// Handle disconnection events
mongoose.connection.on('disconnected', () => {
  log('MongoDB disconnected, attempting to reconnect...', 'mongodb');
});

mongoose.connection.on('error', (err) => {
  log(`MongoDB connection error: ${err}`, 'mongodb');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  log('MongoDB connection closed due to app termination', 'mongodb');
  process.exit(0);
});