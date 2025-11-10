import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import productRouter from "./routes/productRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import dotenv from "dotenv";
import { authenticateToken } from "./middleware/authMiddleware.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import gardenerRoutes from "./routes/gardenerRoutes.js";

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ["MONGODB_URL", "JWT_SECRET", "ADMIN_JWT_SECRET"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ ${envVar} not defined in .env file.`);
    process.exit(1);
  }
}

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:4173",
      "https://garden-key-frontend.vercel.app",
      "https://garden-key-admin.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Static file serving
app.use("/uploads", express.static("uploads"));
app.use("/images", express.static("uploads"));
app.use(express.json());

// API routes
app.use("/api/users", userRoutes);
app.use("/api/products", productRouter);
app.use("/api/admin", adminRoutes);
// Remove global admin middleware to allow login
app.use("/api/payments", authenticateToken, paymentRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/gardeners", gardenerRoutes);

// Health check route
app.get("/", (_req, res) => {
  res.send("gardenkey API Working! 🌱");
});

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error("Global error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error:
      process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
