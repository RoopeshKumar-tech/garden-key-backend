import Notification from '../models/notifications.js';

export const createNotification = async (userId, message, type, orderId) => {
    try {
        const notification = new Notification({
            userId,
            message,
            type,
            orderId
        });
        await notification.save();
        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
};

export const getUserNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ 
            userId: req.params.userId 
        })
        .sort({ createdAt: -1 })
        .limit(20);

        res.json({
            success: true,
            notifications,
            unreadCount: notifications.filter(n => !n.read).length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch notifications"
        });
    }
};
