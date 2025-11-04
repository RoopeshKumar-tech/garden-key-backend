import userModel from "../models/userModel.js";
import Order from "../models/orderModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import validator from "validator";

// Count total number of users
export const countUsers = async (req, res) => {
    try {
        const userCount = await userModel.countDocuments();
        res.json({ count: userCount });
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching user count',
            error: error.message
        });
    }
};

// login user
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(401).json({ success: false, message: "User doesn't exist" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        // Use different JWT secrets for admin and regular users
        const tokenSecret = user.isAdmin ? process.env.ADMIN_JWT_SECRET : process.env.JWT_SECRET;
        const token = jwt.sign(
            { 
                id: user._id, 
                name: user.name, 
                email: user.email,
                isAdmin: user.isAdmin 
            },
            tokenSecret,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin
            }
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: "Login failed" });
    }
};

// Admin login
export const adminLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: "Please provide email and password" 
            });
        }

        const user = await userModel.findOne({ email })
            .select('+password +isAdmin');

        if (!user || !user.isAdmin) {
            return res.status(403).json({ 
                success: false, 
                message: "Admin access required" 
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                message: "Invalid credentials" 
            });
        }

        const token = jwt.sign(
            { 
                id: user._id, 
                name: user.name, 
                email: user.email,
                isAdmin: true
            },
            process.env.ADMIN_JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: true
            }
        });
    } catch (error) {
        console.error("Admin login error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Admin login failed" 
        });
    }
};

// Create JWT token
const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Register user
const registerUser = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        if (!name || !email || !password) {
            return res.json({
                success: false,
                message: "Please provide all required fields"
            });
        }

        if (!validator.isEmail(email)) {
            return res.json({ 
                success: false, 
                message: "Invalid email format" 
            });
        }

        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.json({ 
                success: false, 
                message: "Email already registered" 
            });
        }

        if (password.length < 8) {
            return res.json({
                success: false,
                message: "Password must be at least 8 characters"
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new userModel({
            name,
            email,
            password: hashedPassword,
            isAdmin: false // Ensure new registrations are not admin by default
        });

        const savedUser = await newUser.save();
        const token = createToken(savedUser._id);

        res.json({
            success: true,
            token,
            user: {
                id: savedUser._id,
                name: savedUser.name,
                email: savedUser.email,
                isAdmin: savedUser.isAdmin
            },
            message: "Registration successful"
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
            success: false,
            message: "Registration failed",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

// Get user profile
const getUserProfile = async (req, res) => {
    try {
        // Get user info directly from the token
        const user = {
            id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            isAdmin: req.user.isAdmin
        };

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error("Profile fetch error:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching user profile"
        });
    }
};

// Admin: Get user orders
export const getUserOrders = async (req, res) => {
    try {
        const { userId } = req.params;

        const orders = await Order.find({ userId })
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            orders: orders.map(order => ({
                ...order.toObject(),
                userName: order.userId?.name || 'Unknown User',
                userEmail: order.userId?.email || 'No Email'
            }))
        });
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user orders',
            error: error.message
        });
    }
};

// Admin: Update user admin status
export const updateUserAdminStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { isAdmin } = req.body;

        if (typeof isAdmin !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'isAdmin must be a boolean value'
            });
        }

        const user = await userModel.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.isAdmin = isAdmin;
        await user.save();

        res.json({
            success: true,
            message: `User admin status updated to ${isAdmin}`,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin
            }
        });
    } catch (error) {
        console.error('Error updating user admin status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user admin status',
            error: error.message
        });
    }
};

// Validate admin token
export const validateAdminToken = async (req, res) => {
    try {
        // The adminAuthMiddleware has already verified this is an admin user
        // and attached the user object to the request
        res.json({
            success: true,
            user: req.user
        });
    } catch (error) {
        console.error("Admin token validation error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error validating admin token" 
        });
    }
};

// Initialize first admin user
export const initializeAdmin = async (req, res) => {
    try {
        const { name, email, password, override } = req.body;

        // Validate inputs
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields"
            });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        // Check if admin exists
        const existingAdmin = await userModel.findOne({ isAdmin: true });
        
        // If override code is provided and matches env variable, allow reset
        const ADMIN_OVERRIDE = process.env.ADMIN_OVERRIDE_CODE;
        if (existingAdmin) {
            if (!override || override !== ADMIN_OVERRIDE) {
                return res.status(403).json({
                    success: false,
                    message: "Admin user already exists. To reset admin, provide the override code."
                });
            }
            
            // Override existing admin
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            existingAdmin.name = name;
            existingAdmin.email = email;
            existingAdmin.password = hashedPassword;
            
            const savedUser = await existingAdmin.save();
            const token = jwt.sign(
                { 
                    id: savedUser._id,
                    name: savedUser.name,
                    email: savedUser.email,
                    isAdmin: true
                },
                process.env.ADMIN_JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.status(200).json({
                success: true,
                message: "Admin credentials reset successfully",
                token,
                user: {
                    id: savedUser._id,
                    name: savedUser.name,
                    email: savedUser.email,
                    isAdmin: true
                }
            });
        }

        // Create new admin user if none exists
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const adminUser = new userModel({
            name,
            email,
            password: hashedPassword,
            isAdmin: true
        });

        const savedUser = await adminUser.save();
        const token = jwt.sign(
            { 
                id: savedUser._id,
                name: savedUser.name,
                email: savedUser.email,
                isAdmin: true
            },
            process.env.ADMIN_JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: "Admin user initialized successfully",
            token,
            user: {
                id: savedUser._id,
                name: savedUser.name,
                email: savedUser.email,
                isAdmin: true
            }
        });
    } catch (error) {
        console.error("Admin initialization error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to initialize admin user",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

export { loginUser, registerUser, getUserProfile };
