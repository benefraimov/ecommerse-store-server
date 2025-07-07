import express from 'express';
import {
    addOrderItems,
    getMyOrders,
    getOrderById,
    getOrders,
    getOrdersByUserId,
    updateOrderToDelivered,
    updateOrderToPaid,
    updateOrderToReceived
} from '../controllers/orderController.js';
import { admin, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, admin, getOrders);
router.route('/').post(protect, addOrderItems);
router.route('/:id/deliver').put(protect, admin, updateOrderToDelivered);
router.route('/myorders').get(protect, getMyOrders);
router.get('/user/:userId', protect, admin, getOrdersByUserId);
router.route('/:id').get(protect, getOrderById);
router.route('/:id/pay').put(protect, updateOrderToPaid);
router.route('/:id/receive').put(protect, updateOrderToReceived);

export default router;