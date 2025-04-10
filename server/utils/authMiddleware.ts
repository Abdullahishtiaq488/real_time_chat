import { Request, Response, NextFunction } from 'express';
import { User } from '../models';
import { log } from '../vite';

// Extend the Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Check if user is authenticated
export const isAuth = async (req: Request, res: Response, next: NextFunction) => {
  // Use req.isAuthenticated() from Passport.js to check if the user is authenticated
  if (!req.isAuthenticated()) {
    log(`Authentication failed: User not authenticated`, 'auth');
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  log(`User authenticated: ${req.user._id}`, 'auth');
  next();
};

// Check if user is admin (for group chats)
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  // First check if user is authenticated
  await isAuth(req, res, async () => {
    try {
      const chatId = req.params.chatId || req.body.chatId;
      
      if (!chatId) {
        return res.status(400).json({ error: 'Chat ID is required' });
      }
      
      // Check if the user is an admin of the chat
      const chatMember = await User.findOne({
        chatId: chatId,
        userId: req.user._id,
        isAdmin: true
      });
      
      if (!chatMember) {
        return res.status(403).json({ error: 'Not authorized as an admin for this chat' });
      }
      
      next();
    } catch (err) {
      console.error('Admin Middleware Error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  });
};