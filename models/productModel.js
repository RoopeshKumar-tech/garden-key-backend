import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: [
            'Flowering Plants',
            'Fruit & Vegetable Plants',
            'Soil & Fertilizers',
            'Pesticides & Insecticides',
            'Gardening Tools',
            'Seedlings & Saplings',
            'Pots & Planters',
            'Professional Gardeners'
        ]
    },
    description: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    inStock: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export default mongoose.model('Product', productSchema);