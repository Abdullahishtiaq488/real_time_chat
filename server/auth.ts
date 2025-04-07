import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import MongoStore from "connect-mongo";
import { User } from "./models"; 
import { mongoClient } from "./db";
import { log } from "./vite";

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

// Helper function to compare passwords
async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Configure session
  const sessionStore = MongoStore.create({ 
    mongoUrl: process.env.DATABASE_URI || 'mongodb://localhost:27017/chat-app',
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
        const user = await User.findOne({ username });
        
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: 'Invalid username or password' });
        }
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  // Serialize user to session
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await User.findById(id).select('-password');
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Registration route
  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ username: req.body.username });
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Create new user
      const { username, password, displayName } = req.body;
      
      if (!username || !password || !displayName) {
        return res.status(400).json({ 
          message: "Username, password, and display name are required" 
        });
      }
      
      const user = await User.create({
        username,
        password: await hashPassword(password),
        displayName,
        status: 'online'
      });

      // Log in the new user
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Return user without password
        const userResponse = user.toObject();
        delete userResponse.password;
        
        res.status(201).json(userResponse);
      });
    } catch (error) {
      log(`Registration error: ${error}`, 'auth');
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login route
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Login failed" });
      
      req.login(user, async (err) => {
        if (err) return next(err);
        
        // Update user status to online
        await User.findByIdAndUpdate(user._id, { status: 'online' });
        
        // Return user without password
        const userResponse = user.toObject();
        delete userResponse.password;
        
        res.json(userResponse);
      });
    })(req, res, next);
  });

  // Logout route
  app.post("/api/logout", async (req, res, next) => {
    if (req.isAuthenticated()) {
      // Update user status to offline
      await User.findByIdAndUpdate(req.user._id, { status: 'offline' });
    }
    
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user route
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });
}