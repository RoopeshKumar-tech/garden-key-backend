// backend/controllers/userController.js
import userModel from "../models/userModel.js";
import Order from "../models/orderModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import validator from "validator";

/* -------------------- HELPER -------------------- */
const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

/* -------------------- USER REGISTRATION -------------------- */
export const registerUser = async (req, res) => {
    const { name, email, password, phone } = req.body;
    try {
        if (!name || !email || !password || !phone) {
            return res.json({
                success: false,
                message: "Please provide all required fields",
            });
        }

        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Invalid email format" });
        }

        if (!/^\d{10}$/.test(phone)) {
            return res.json({
                success: false,
                message: "Please provide a valid 10-digit phone number",
            });
        }

        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.json({ success: false, message: "Email already registered" });
        }

        const existingPhone = await userModel.findOne({ phone });
        if (existingPhone) {
            return res.json({ success: false, message: "Phone number already registered" });
        }

        if (password.length < 8) {
            return res.json({
                success: false,
                message: "Password must be at least 8 characters",
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new userModel({
            name,
            email,
            phone,
            password: hashedPassword,
            isAdmin: false,
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
                phone: savedUser.phone,
                isAdmin: savedUser.isAdmin,
            },
            message: "Registration successful",
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
            success: false,
            message: "Registration failed",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

/* -------------------- USER LOGIN -------------------- */
export const loginUser = async (req, res) => {
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

        const tokenSecret = user.isAdmin ? process.env.ADMIN_JWT_SECRET : process.env.JWT_SECRET;
        const token = jwt.sign(
            { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin },
            tokenSecret,
            { expiresIn: "7d" }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
            },
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: "Login failed" });
    }
};

/* -------------------- ADMIN LOGIN -------------------- */
export const adminLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Please provide email and password" });
        }

        const user = await userModel.findOne({ email }).select("+password +isAdmin");

        if (!user || !user.isAdmin) {
            return res.status(403).json({ success: false, message: "Admin access required" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user._id, name: user.name, email: user.email, isAdmin: true },
            process.env.ADMIN_JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: true,
            },
        });
    } catch (error) {
        console.error("Admin login error:", error);
        res.status(500).json({ success: false, message: "Admin login failed" });
    }
};

/* -------------------- INITIALIZE ADMIN -------------------- */
export const initializeAdmin = async (req, res) => {
    try {
        const { name, email, password, override } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "Please provide all required fields" });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "Invalid email format" });
        }

        const existingAdmin = await userModel.findOne({ isAdmin: true });
        const ADMIN_OVERRIDE = process.env.ADMIN_OVERRIDE_CODE;

        if (existingAdmin) {
            if (!override || override !== ADMIN_OVERRIDE) {
                return res.status(403).json({
                    success: false,
                    message: "Admin user already exists. Provide override code to reset.",
                });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            existingAdmin.name = name;
            existingAdmin.email = email;
            existingAdmin.password = hashedPassword;

            const savedUser = await existingAdmin.save();
            const token = jwt.sign(
                { id: savedUser._id, name: savedUser.name, email: savedUser.email, isAdmin: true },
                process.env.ADMIN_JWT_SECRET,
                { expiresIn: "7d" }
            );

            return res.status(200).json({
                success: true,
                message: "Admin credentials reset successfully",
                token,
                user: {
                    id: savedUser._id,
                    name: savedUser.name,
                    email: savedUser.email,
                    isAdmin: true,
                },
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const adminUser = new userModel({ name, email, password: hashedPassword, isAdmin: true });
        const savedUser = await adminUser.save();
        const token = jwt.sign(
            { id: savedUser._id, name: savedUser.name, email: savedUser.email, isAdmin: true },
            process.env.ADMIN_JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            success: true,
            message: "Admin user initialized successfully",
            token,
            user: {
                id: savedUser._id,
                name: savedUser.name,
                email: savedUser.email,
                isAdmin: true,
            },
        });
    } catch (error) {
        console.error("Admin initialization error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to initialize admin user",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

/* -------------------- USER PROFILE -------------------- */
export const getUserProfile = async (req, res) => {
    try {
        const user = { id: req.user.id, name: req.user.name, email: req.user.email, isAdmin: req.user.isAdmin };
        res.json({ success: true, user });
    } catch (error) {
        console.error("Profile fetch error:", error);
        res.status(500).json({ success: false, message: "Error fetching user profile" });
    }
};

/* -------------------- COUNT USERS -------------------- */
export const countUsers = async (req, res) => {
    try {
        const userCount = await userModel.countDocuments();
        res.json({ count: userCount });
    } catch (error) {
        res.status(500).json({ message: "Error fetching user count", error: error.message });
    }
};

/* -------------------- GET USER ORDERS -------------------- */
export const getUserOrders = async (req, res) => {
    try {
        const { userId } = req.params;
        const orders = await Order.find({ userId }).populate("userId", "name email").sort({ createdAt: -1 });

        res.json({
            success: true,
            orders: orders.map((order) => ({
                ...order.toObject(),
                userName: order.userId?.name || "Unknown User",
                userEmail: order.userId?.email || "No Email",
            })),
        });
    } catch (error) {
        console.error("Error fetching user orders:", error);
        res.status(500).json({ success: false, message: "Failed to fetch user orders", error: error.message });
    }
};

/* -------------------- UPDATE USER ADMIN STATUS -------------------- */
export const updateUserAdminStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { isAdmin } = req.body;
        if (typeof isAdmin !== "boolean") {
            return res.status(400).json({ success: false, message: "isAdmin must be a boolean value" });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        user.isAdmin = isAdmin;
        await user.save();

        res.json({
            success: true,
            message: `User admin status updated to ${isAdmin}`,
            user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin },
        });
    } catch (error) {
        console.error("Error updating user admin status:", error);
        res.status(500).json({ success: false, message: "Failed to update user admin status", error: error.message });
    }
};

/* -------------------- VALIDATE ADMIN TOKEN -------------------- */
export const validateAdminToken = async (req, res) => {
    try {
        res.json({ success: true, user: req.user });
    } catch (error) {
        console.error("Admin token validation error:", error);
        res.status(500).json({ success: false, message: "Error validating admin token" });
    }
};

/* -------------------- VERIFY PHONE -------------------- */
export const verifyPhone = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone || !/^\d{10}$/.test(phone)) {
            return res.status(400).json({ success: false, message: "Please provide a valid 10-digit phone number" });
        }

        const user = await userModel.findOne({ phone });
        if (!user) {
            return res.status(404).json({ success: false, message: "Phone number not found" });
        }

        res.json({ success: true, message: "Phone number verified successfully", userId: user._id });
    } catch (error) {
        console.error("Verify phone error:", error);
        res.status(500).json({ success: false, message: "Error verifying phone number" });
    }
};

/* -------------------- RESET PASSWORD -------------------- */
export const resetPassword = async (req, res) => {
    try {
        const { phone, newPassword } = req.body;
        if (!phone || !/^\d{10}$/.test(phone)) {
            return res.status(400).json({ success: false, message: "Please provide a valid 10-digit phone number" });
        }

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
        }

        const user = await userModel.findOne({ phone });
        if (!user) {
            return res.status(404).json({ success: false, message: "Phone number not found" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        await user.save();

        res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ success: false, message: "Error updating password" });
    }
};
