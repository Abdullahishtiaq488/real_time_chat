import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { User } from "./models"; 
import { log } from "./vite";
import MongoStore from "connect-mongo";
import { mongoClient } from "./db";
import dotenv from 'dotenv';
import { Socket } from "socket.io";
import { userLoginSchema } from "@shared/schema";

// Load environment variables
dotenv.config();

const scryptAsync = promisify(scrypt);

// Declare global User type for passport
declare global {
  namespace Express {
    interface User {
      _id: string;
      username: string;
      displayName: string;
      avatarUrl?: string;
      status?: string;
      bio?: string;
    }
  }
}

// Helper function to hash passwords
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Helper function to compare password with stored hash
async function comparePasswords(password: string, stored: string) {
  try {
    // Check if the stored password has the correct format (hash.salt)
    if (!stored.includes('.')) {
      log(`Invalid password format: ${stored.substring(0, 5)}...`, 'auth');
      return false;
    }
    
    const [hashValue, salt] = stored.split(".");
    
    if (!hashValue || !salt) {
      log(`Hash or salt is missing from stored password`, 'auth');
      return false;
    }
    
    // Generate hash from provided password and salt
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    const keyBuffer = Buffer.from(hashValue, "hex");
    
    // Compare buffers safely
    return timingSafeEqual(buf, keyBuffer);
  } catch (error) {
    log(`Error comparing passwords: ${error}`, 'auth');
    return false;
  }
}

export function setupAuth(app: Express) {
  // Use MongoDB for session storage
  const sessionStore = MongoStore.create({
    mongoUrl: process.env.DATABASE_URI,
    collectionName: 'sessions'
  });

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'chat-app-secret-key',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport with LocalStrategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        log(`Attempting to find user: ${username}`, 'auth');
        const user = await User.findOne({ username });
        
        if (!user) {
          log(`User not found: ${username}`, 'auth');
          return done(null, false, { message: 'Invalid username or password' });
        }
        
        const isPasswordValid = await comparePasswords(password, user.password);
        if (!isPasswordValid) {
          log(`Invalid password for user: ${username}`, 'auth');
          return done(null, false, { message: 'Invalid username or password' });
        }
        
        // Convert mongoose document to plain object
        const userObj = user.toObject();
        log(`User authenticated successfully: ${username}`, 'auth');
        return done(null, userObj);
      } catch (err) {
        log(`Authentication error: ${err}`, 'auth');
        return done(err);
      }
    }),
  );

  // Serialize user to session
  passport.serializeUser((user, done) => {
    log(`Serializing user: ${user._id}`, 'auth');
    done(null, user._id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      log(`Deserializing user ID: ${id}`, 'auth');
      const user = await User.findById(id).select('-password');
      
      if (!user) {
        log(`User not found during deserialization: ${id}`, 'auth');
        return done(null, null);
      }
      
      // Convert mongoose document to plain object
      const userObj = user.toObject();
      log(`User deserialized successfully: ${userObj.username}`, 'auth');
      done(null, userObj);
    } catch (err) {
      log(`Deserialization error: ${err}`, 'auth');
      done(err);
    }
  });

  // Login route
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = userLoginSchema.parse(req.body);
      log("Login attempt for user:", username);

      const user = await User.findOne({ username });
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await comparePasswords(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Regenerate session to prevent session fixation
      req.session.regenerate((err) => {
        if (err) {
          log("Session regeneration error:", err);
          return res.status(500).json({ message: "Internal server error" });
        }

        // Set user in session
        req.session.userId = user._id;
        req.session.save((err) => {
          if (err) {
            log("Session save error:", err);
            return res.status(500).json({ message: "Internal server error" });
          }

          // Update user status
          user.status = "online";
          await user.save();

          // Return user data (excluding password)
          const { password: _, ...userData } = user.toObject();
          res.json({ user: userData });
        });
      });
    } catch (error) {
      log("Login error:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Register route
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, password, displayName } = req.body;
      log("Register attempt for user:", username);

      // Check if username exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const user = new User({
        username,
        password: hashedPassword,
        displayName,
        status: "offline",
      });

      await user.save();

      // Set user in session
      req.session.userId = user._id;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Return user data (excluding password)
      const { password: _, ...userData } = user.toObject();
      res.status(201).json({ user: userData });
    } catch (error) {
      log("Register error:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Logout route
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      if (req.session.userId) {
        // Update user status
        await User.findByIdAndUpdate(req.session.userId, { status: "offline" });
      }

      req.session.destroy((err) => {
        if (err) {
          log("Logout error:", err);
          return res.status(500).json({ message: "Internal server error" });
        }
        res.json({ message: "Logged out successfully" });
      });
    } catch (error) {
      log("Logout error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Validate token route
  app.get("/api/auth/validate", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await User.findById(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const { password: _, ...userData } = user.toObject();
      res.json({ user: userData });
    } catch (error) {
      log("Validate error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Authentication middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    next();
  });
}

export async function authenticateSocket(socket: Socket) {
  const sessionId = socket.handshake.auth.sessionId;
  if (!sessionId) {
    throw new Error("No session ID provided");
  }

  const session = await new Promise<any>((resolve, reject) => {
    socket.request.sessionStore.get(sessionId, (err, session) => {
      if (err) reject(err);
      else resolve(session);
    });
  });

  if (!session || !session.userId) {
    throw new Error("Invalid session");
  }

  const user = await User.findById(session.userId);
  if (!user) {
    throw new Error("User not found");
  }

  return user;
}