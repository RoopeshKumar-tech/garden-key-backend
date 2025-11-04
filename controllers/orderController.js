// controllers/orderController.js
import Order from '../models/orderModel.js';
import { createNotification } from './notificationController.js';
import Gardener from '../models/gardenerModel.js';

export const createOrder = async (req, res) => {
  try {
    let orderData = {
      ...req.body,
      userId: req.user?.id,
      orderId: 'OD' + Date.now()
    };

    // If this is a gardener order, fetch and store snapshot fields
    if (orderData.type === 'gardener' && orderData.gardenerId) {
      const Gardener = (await import('../models/gardenerModel.js')).default;
      const gardener = await Gardener.findById(orderData.gardenerId);
      if (gardener) {
        orderData.specialization = gardener.specialization;
        orderData.contactInfo = gardener.contactInfo;
        orderData.location = gardener.location;
        orderData.profileImage = gardener.profileImage;
        orderData.name = gardener.name;
      }
    }

    const order = new Order(orderData);
    await order.save();

    res.json({
      success: true,
      order: {
        orderId: order.orderId,
        status: order.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

export const getOrderHistory = async (req, res) => {
  try {
    let orders = await Order.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .select('-__v');

    // Manually populate gardener data for gardener orders
    orders = await Promise.all(orders.map(async (order) => {
      if (order.type === 'gardener' && order.gardenerId) {
        const gardener = await Gardener.findById(order.gardenerId).lean();
        return {
          ...order.toObject(),
          gardenerId: gardener || order.gardenerId // fallback to ID if not found
        };
      }
      return order.toObject();
    }));

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order history',
      error: error.message
    });
  }
};

export const getOrderStatus = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId })
      .select('status orderId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      status: order.status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order status',
      error: error.message
    });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
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
    console.error('Error fetching all orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const order = await Order.findOne({ orderId })
      .populate('userId', 'name email')
      .populate('statusHistory.updatedBy', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.type === 'gardener') {
      // Only allow approval/rejection for gardener bookings
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status for gardener booking. Only approved/rejected allowed.'
        });
      }
      order.bookingStatus = status;
      order.status = status;
      order.statusHistory.push({
        status,
        updatedBy: req.user.id,
        note: note || ''
      });
      await order.save();

      // Notify user
      await createNotification(
        order.userId._id,
        `Your gardener booking #${orderId} has been ${status}. ${note ? 'Message: ' + note : ''}`,
        'order_status',
        order._id
      );

      return res.json({
        success: true,
        message: `Gardener booking ${status} successfully`,
        order: {
          ...order.toObject(),
          userName: order.userId?.name || 'Unknown User',
          userEmail: order.userId?.email || 'No Email'
        }
      });
    }

    // Product order management (existing flow)
    await order.updateStatus(status, req.user.id, note);

    // Notify user
    await createNotification(
      order.userId._id,
      `Your order #${orderId} has been updated to: ${status}`,
      'order_status',
      order._id
    );

    const updatedOrder = await Order.findOne({ orderId })
      .populate('userId', 'name email')
      .populate('statusHistory.updatedBy', 'name email');

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: {
        ...updatedOrder.toObject(),
        userName: updatedOrder.userId?.name || 'Unknown User',
        userEmail: updatedOrder.userId?.email || 'No Email'
      }
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

export const searchOrders = async (req, res) => {
  try {
    const {
      query,
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = -1,
      page = 1,
      limit = 10
    } = req.query;

    const filter = {};

    if (query) {
      filter.$or = [
        { orderId: { $regex: query, $options: 'i' } },
        { 'items.name': { $regex: query, $options: 'i' } }
      ];
    }

    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(filter)
      .populate('userId', 'name email')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      orders: orders.map(order => ({
        ...order.toObject(),
        userName: order.userId?.name || 'Unknown User',
        userEmail: order.userId?.email || 'No Email'
      })),
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Order search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search orders',
      error: error.message
    });
  }
};
