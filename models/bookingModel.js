import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // assuming you use a user model
    required: false, // optional, depends if user is logged in
  },
  gardenerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gardener',
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  timeSlot: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
}, { timestamps: true });


const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
