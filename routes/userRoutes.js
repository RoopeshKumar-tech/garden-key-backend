import express from 'express';
import { loginUser, registerUser, getUserProfile, initializeAdmin } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { verifyPhone, resetPassword } from "../controllers/userController.js";

const router = express.Router();

// Public routes
router.post('/login', loginUser);
router.post('/register', registerUser);
router.post('/initialize-admin', initializeAdmin);


// Protected routes
router.get('/profile', authenticateToken, getUserProfile);

export default router;
