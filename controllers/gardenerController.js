import Gardener from '../models/gardenerModel.js';

// Create a new gardener
export const addGardener = async (req, res) => {
  try {
    const { name, experience, location, specialization, availability, contactInfo, price } = req.body;
    if (!name || !experience || !location || !specialization || !contactInfo || !price) {
      return res.status(400).json({ success: false, message: 'All required fields must be provided.' });
    }
    const profileImage = req.file ? `/uploads/${req.file.filename}` : '';
    const gardener = new Gardener({
      name,
      experience,
      location,
      specialization,
      availability,
      contactInfo,
      price,
      profileImage
    });
    await gardener.save();
    res.status(201).json({ success: true, gardener });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all gardeners
export const getAllGardeners = async (req, res) => {
  try {
    const gardeners = await Gardener.find();
    res.status(200).json({ success: true, gardeners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get a single gardener by ID
export const getGardenerById = async (req, res) => {
  try {
    const gardener = await Gardener.findById(req.params.id);
    if (!gardener) return res.status(404).json({ success: false, message: 'Gardener not found' });
    res.status(200).json({ success: true, gardener });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a gardener
export const updateGardener = async (req, res) => {
  try {
    const { name, experience, location, specialization, availability, contactInfo, price } = req.body;
    const updateData = { name, experience, location, specialization, availability, contactInfo, price };
    if (req.file) {
      updateData.profileImage = `/uploads/${req.file.filename}`;
    }
    const gardener = await Gardener.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!gardener) return res.status(404).json({ success: false, message: 'Gardener not found' });
    res.status(200).json({ success: true, gardener });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a gardener
export const deleteGardener = async (req, res) => {
  try {
    const gardener = await Gardener.findByIdAndDelete(req.params.id);
    if (!gardener) return res.status(404).json({ success: false, message: 'Gardener not found' });
    res.status(200).json({ success: true, message: 'Gardener deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}; 