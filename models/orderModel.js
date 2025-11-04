import mongoose from 'mongoose';

const statusHistorySchema = new mongoose.Schema({
    status: {
        type: String,
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    note: String
});

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['product', 'gardener'],
        required: true
    },
    // Product order fields
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
        },
        name: String,
        price: Number,
        quantity: Number,
        image: String
    }],
    totalAmount: Number,
    paymentDetails: {
        method: String,
        paymentId: String,
        status: String
    },
    shippingAddress: {
        type: {
            type: String,
            enum: ['home', 'work', 'other'],
            default: 'home'
        },
        address: String,
        city: String,
        state: String,
        pincode: String
    },
    // Gardener booking fields
    gardenerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gardener',
    },
    date: String,
    timeSlot: String,
    bookingStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    // Gardener details snapshot
    specialization: { type: String },
    contactInfo: { type: String },
    location: { type: String },
    profileImage: { type: String },
    name: { type: String },
    // Shared fields
    status: {
        type: String,
        enum: ['Order Placed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'pending', 'approved', 'rejected'],
        default: 'Order Placed'
    },
    statusHistory: [statusHistorySchema],
}, {
    timestamps: true
});

// Instance method to update order status with validation and history tracking
orderSchema.methods.updateStatus = async function(newStatus, userId, note = '') {
    const validStatuses = ['Order Placed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'];
    
    if (!validStatuses.includes(newStatus)) {
        throw new Error('Invalid order status');
    }

    const currentIndex = validStatuses.indexOf(this.status);
    const newIndex = validStatuses.indexOf(newStatus);

    // Prevent status from going backward (except for admin users)
    if (newIndex < currentIndex) {
        throw new Error('Cannot revert order status to a previous state');
    }

    // Add status change to history
    this.statusHistory.push({
        status: newStatus,
        updatedBy: userId,
        note: note
    });

    this.status = newStatus;
    return await this.save();
};

// Static method to get orders by status
orderSchema.statics.getOrdersByStatus = function(status) {
    return this.find({ status })
        .populate('userId', 'name email')
        .populate('statusHistory.updatedBy', 'name email')
        .sort({ createdAt: -1 });
};

// Virtual for order progress percentage
orderSchema.virtual('progressPercentage').get(function() {
    const statuses = ['Order Placed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'];
    const currentIndex = statuses.indexOf(this.status);
    return ((currentIndex + 1) / statuses.length) * 100;
});

// Add virtual fields when converting to JSON
orderSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
