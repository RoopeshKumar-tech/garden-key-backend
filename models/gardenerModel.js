import mongoose from 'mongoose';

const gardenerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  experience: { type: Number, required: true },
  location: { type: String, required: true },
  specialization: { type: String, required: true },
  price: { type: Number, required: true },
  availability: { type: Boolean, default: true },
  contactInfo: { type: String, required: true },
  profileImage: { type: String },
}, { timestamps: true });

const Gardener = mongoose.model('Gardener', gardenerSchema);
export default Gardener; 