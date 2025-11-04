import express from 'express';
import { createOrder, getOrderHistory, getOrderStatus, getAllOrders, updateOrderStatus } from '../controllers/orderController.js';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import Order from '../models/orderModel.js'; // Adjust path if needed
const router = express.Router();

// Add this POST route for order creation
router.post('/', authenticateToken, createOrder);

// ✅ Get all orders (for admin)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('userId', 'name email')
      .populate('items.productId', 'name')
      .populate('gardenerId', 'name specialization location profileImage')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Update order status
router.put('/:orderId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status },
      { new: true }
    );
    res.json({ success: true, message: 'Order status updated', order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// User order history
router.get('/history', authenticateToken, getOrderHistory);

export default router;
