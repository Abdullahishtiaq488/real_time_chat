import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import session from "express-session";
import MongoStore from "connect-mongo";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { log } from "./utils/logger";
import { setupAuth } from "./auth";
import { setupSocket } from "./socket";
import { setupRoutes } from "./routes";
import { setupStorage } from "./storage";
import { createTestUserIfNeeded } from "./db";

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Configure CORS
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5000",
  credentials: true,
}));

// Configure session
app.use(session({
  secret: process.env.SESSION_SECRET || "your-secret-key",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60, // 1 day
  }),
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  },
}));

// Parse JSON bodies
app.use(express.json());

// Setup MongoDB connection
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/livechat")
  .then(() => {
    log("Connected to MongoDB");
    return createTestUserIfNeeded();
  })
  .catch((error) => {
    log("MongoDB connection error:", error);
    process.exit(1);
  });

// Setup Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Setup authentication
setupAuth(app);

// Setup storage
setupStorage(app);

// Setup routes
setupRoutes(app);

// Setup socket handlers
setupSocket(io);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  log("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  log(`Server running on port ${PORT}`);
});
