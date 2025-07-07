import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import sendEmail from '../utils/sendEmail.js';

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const addOrderItems = async (req, res) => {
    try {
        const { orderItems, shippingAddress, paymentMethod, totalPrice } = req.body;

        if (orderItems && orderItems.length === 0) {
            return res.status(400).json({ message: 'No order items' });
        }

        // --- חלק חדש: ולידציית מלאי לפני יצירת ההזמנה ---
        const productIds = orderItems.map(item => item.product || item._id);
        const productsFromDB = await Product.find({ _id: { $in: productIds } });

        for (const item of orderItems) {
            const productInDB = productsFromDB.find(p => String(p._id) === String(item.product || item._id));
            if (!productInDB) {
                return res.status(404).json({ message: `Product not found: ${item.name}` });
            }
            if (productInDB.stock < item.qty) {
                return res.status(400).json({ message: `Not enough stock for ${item.name}. Only ${productInDB.stock} available.` });
            }
        }
        // --- סוף חלק הולידציה ---

        // הקוד הקיים שלך ליצירת ההזמנה - נשאר ללא שינוי
        const order = new Order({
            orderItems: orderItems.map(x => ({ ...x, product: x.product || x._id, _id: undefined })),
            user: req.user._id,
            shippingAddress,
            paymentMethod,
            totalPrice,
        });

        const createdOrder = await order.save();

        // --- חלק חדש: עדכון המלאי לאחר שמירת ההזמנה ---
        for (const item of createdOrder.orderItems) {
            const product = productsFromDB.find(p => String(p._id) === String(item.product));
            if (product) {
                product.stock -= item.qty;
                await product.save();
            }
        }
        // --- סוף חלק עדכון המלאי ---

        // הקוד הקיים שלך לניקוי העגלה - נשאר ללא שינוי
        const user = await User.findById(req.user._id);
        if (user) {
            user.cart = [];
            await user.save();
            console.log(`Cart cleared for user: ${user.email}`.blue);
        }

        // הקוד הקיים שלך לשליחת המייל - נשאר ללא שינוי
        try {
            const message = `<h1>תודה על הזמנתך!</h1><p>הזמנתך מספר ${createdOrder._id} התקבלה בהצלחה ותטופל בקרוב.</p><p>ניתן לצפות בפרטי ההזמנה בקישור הבא:</p><a href="${process.env.FRONTEND_URL}/order/${createdOrder._id}">צפה בהזמנה</a>`;
            await sendEmail({
                email: req.user.email,
                subject: `אישור הזמנה #${createdOrder._id}`,
                message
            });
        } catch (emailError) {
            console.error(`Failed to send order confirmation email for order ${createdOrder._id}:`, emailError);
        }

        // שליחת התשובה ללקוח - נשאר ללא שינוי
        res.status(201).json(createdOrder);

    } catch (error) {
        console.error('Error in addOrderItems:', error);
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- הוספת הפונקציה החסרה ---
// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('user', 'username email');
        if (order && (order.user._id.equals(req.user._id) || req.user.isAdmin)) {
            res.json(order);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- הוספת הפונקציה החסרה ---
// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
// --- updateOrderToPaid (שולחת קבלה/חשבונית) ---
const updateOrderToPaid = async (req, res) => {
    try {
        // נוסיף .populate כדי לקבל את פרטי המייל של המשתמש
        const order = await Order.findById(req.params.id).populate('user', 'email');

        if (order) {
            order.isPaid = true;
            order.paidAt = Date.now();
            order.paymentResult = { id: req.body.id, status: req.body.status, update_time: req.body.update_time };

            const updatedOrder = await order.save();

            // --- שליחת מייל קבלה על תשלום ---
            try {
                const message = `
                <html lang="he" dir="rtl">
                <body>
                    <h1>קבלה על תשלום עבור הזמנה #${updatedOrder._id}</h1>
                    <p>שלום,</p>
                    <p>התשלום עבור הזמנתך בסך <strong>₪${updatedOrder.totalPrice.toFixed(2)}</strong> בוצע בהצלחה.</p>
                    <h3>פרטי ההזמנה:</h3>
                    <ul>
                        ${updatedOrder.orderItems.map(item => `<li>${item.name} - כמות: ${item.qty}, מחיר: ₪${item.price.toFixed(2)}</li>`).join('')}
                    </ul>
                    <p>ההזמנה תישלח בקרוב לכתובת: ${order.shippingAddress.address}, ${order.shippingAddress.city}.</p>
                    <p>תודה שקנית ב-E-Shop!</p>
                    </body>
                    </html>
                `;
                await sendEmail({
                    email: order.user.email,
                    subject: `קבלה עבור הזמנה #${updatedOrder._id}`,
                    message
                });
            } catch (emailError) {
                console.error(`Failed to send payment receipt email for order ${updatedOrder._id}:`, emailError);
            }
            // --- סוף שליחת מייל ---

            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        console.error('Error in updateOrderToPaid:', error);
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// @desc    Update order to delivered (by user)
// @route   PUT /api/orders/:id/receive
// @access  Private
const updateOrderToReceived = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (order) {
            // נוודא שהמשתמש ששלח את הבקשה הוא בעל ההזמנה
            if (order.user.toString() !== req.user._id.toString()) {
                return res.status(401).json({ message: 'Not authorized to update this order' });
            }
            order.isDelivered = true;
            order.deliveredAt = Date.now();

            const updatedOrder = await order.save();
            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all orders of a specific user (by admin)
// @route   GET /api/orders/user/:userId
// @access  Private/Admin
const getOrdersByUserId = async (req, res) => {
    const orders = await Order.find({ user: req.params.userId });
    res.json(orders);
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
export const getOrders = async (req, res) => {
    // נשתמש ב-populate כדי לקבל גם את שם המשתמש שביצע את ההזמנה
    const orders = await Order.find({}).populate('user', 'id username');
    res.json(orders);
};

// @desc    Update order to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
export const updateOrderToDelivered = async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
        order.isDelivered = true;
        order.deliveredAt = Date.now();
        const updatedOrder = await order.save();
        res.json(updatedOrder);
    } else {
        res.status(404).json({ message: 'Order not found' });
    }
};


export { addOrderItems, getMyOrders, getOrderById, updateOrderToPaid, updateOrderToReceived, getOrdersByUserId };