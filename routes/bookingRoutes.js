import express from 'express';
import mongoose from 'mongoose';
import Booking from '../models/bookingModel.js';
import Order from '../models/orderModel.js';
import Gardener from '../models/gardenerModel.js';

const router = express.Router();

// ----------------------------
// POST /api/bookings
// Create a new booking
// ----------------------------
router.post('/', async (req, res) => {
  try {
    const { userId, gardenerId, date, timeSlot } = req.body;

    if (!gardenerId || !date || !timeSlot) {
      return res.status(400).json({ message: 'Missing booking fields' });
    }

    // --- Check if gardener is already booked for the same date & time ---
    const existingBooking = await Booking.findOne({
      gardenerId,
      date,
      timeSlot,
      status: { $in: ['pending', 'approved'] }, // only active bookings
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'This gardener is not available at the selected date and time slot.'
      });
    }

    // --- Create new booking ---
    const newBooking = new Booking({
      userId,
      gardenerId,
      date,
      timeSlot,
      status: 'pending',
    });
    await newBooking.save();

    // --- Fetch gardener details ---
    const gardener = await Gardener.findById(gardenerId);

    // --- Create corresponding order ---
    const order = new Order({
      orderId: 'GD' + Date.now(),
      userId,
      type: 'gardener',
      gardenerId,
      date,
      timeSlot,
      bookingStatus: 'pending',
      status: 'pending',
      specialization: gardener?.specialization,
      contactInfo: gardener?.contactInfo,
      location: gardener?.location,
      profileImage: gardener?.profileImage,
      name: gardener?.name
    });
    await order.save();

    res.status(201).json({
      success: true,
      message: 'Booking request submitted',
      booking: newBooking
    });

  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ----------------------------
// GET /api/bookings/user/:userId
// Fetch bookings for a user
// ----------------------------
router.get('/user/:userId', async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.userId }).populate('gardenerId');
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching user bookings' });
  }
});

// ----------------------------
// PUT /api/bookings/:id/approve
// Approve a booking (admin)
// ----------------------------
router.put('/:id/approve', async (req, res) => {
  try {
    const updated = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true }
    );

    // Update the corresponding order status
    await Order.findOneAndUpdate(
      { gardenerId: updated.gardenerId, date: updated.date, timeSlot: updated.timeSlot },
      { bookingStatus: 'approved', status: 'approved' }
    );

    res.json({ success: true, message: 'Booking approved', booking: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------
// PUT /api/bookings/:id/reject
// Reject a booking (admin)
// ----------------------------
router.put('/:id/reject', async (req, res) => {
  try {
    const updated = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    );

    // Update the corresponding order status
    await Order.findOneAndUpdate(
      { gardenerId: updated.gardenerId, date: updated.date, timeSlot: updated.timeSlot },
      { bookingStatus: 'rejected', status: 'rejected' }
    );

    res.json({ success: true, message: 'Booking rejected', booking: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------
// GET /api/bookings/slots/:gardenerId
// Fetch all active bookings for a gardener (used in frontend to filter available slots)
// ----------------------------
router.get('/slots/:gardenerId', async (req, res) => {
  try {
    const bookings = await Booking.find({
      gardenerId: req.params.gardenerId,
      status: { $in: ['pending', 'approved'] } // only active bookings
    });

    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching gardener bookings' });
  }
});

export default router;
