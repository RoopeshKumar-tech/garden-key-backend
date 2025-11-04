import express from 'express';
import multer from 'multer';
import {
  addGardener,
  getAllGardeners,
  getGardenerById,
  updateGardener,
  deleteGardener
} from '../controllers/gardenerController.js';

const router = express.Router();

// Multer config for profileImage
const storage = multer.diskStorage({
  destination: 'uploads',
  filename: (_req, file, cb) => {
    cb(null, `gardener_${Date.now()}_${file.originalname}`);
  }
});
const upload = multer({ storage });

// Create
router.post('/', upload.single('profileImage'), addGardener);
// Read all
router.get('/', getAllGardeners);
// Read one
router.get('/:id', getGardenerById);
// Update
router.put('/:id', upload.single('profileImage'), updateGardener);
// Delete
router.delete('/:id', deleteGardener);

export default router; 