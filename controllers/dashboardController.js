import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private/Admin
export const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();

        const salesData = await Order.aggregate([
            { $match: { isPaid: true } },
            { $group: { _id: null, totalSales: { $sum: '$totalPrice' } } }
        ]);

        const totalSales = salesData.length > 0 ? salesData[0].totalSales : 0;

        res.json({
            totalUsers,
            totalProducts,
            totalOrders,
            totalSales,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};