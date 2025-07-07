import User from '../models/User.js'
import Order from '../models/Order.js'
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';

// Helper function to create Token!
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'// Token Expiration Date
    })
}

// --- User Actions ---

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
    const { username, email, password } = req.body;
    const userExists = await User.findOne({ email });

    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const user = await User.create({
        username,
        email,
        password: await bcrypt.hash(password, 10),
        verificationToken,
    });

    if (user) {
        try {
            const verificationUrl = `${req.protocol}://${req.get('host')}/api/users/verify/${verificationToken}`;
            // console.log(verificationUrl)
            const message = `<p>אנא לחץ על הקישור הבא כדי לאמת את חשבונך:</p> <a href="${verificationUrl}">${verificationUrl}</a>`;

            await sendEmail({
                email: user.email,
                subject: 'אימות חשבון - E-Shop',
                message
            });

            res.status(201).json({ message: 'נשלח מייל אימות. אנא בדוק את תיבת הדואר שלך.' });
        } catch (error) {
            console.error(error);
            // אם שליחת המייל נכשלה, נמחק את המשתמש כדי שיוכל לנסות להירשם שוב
            await user.deleteOne();
            res.status(500).json({ message: 'שליחת מייל האימות נכשלה' });
        }
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};
const verifyUser = async (req, res) => {
    const verificationToken = req.params.token;
    const user = await User.findOne({ verificationToken });

    if (!user) {
        return res.status(400).send('<h1>קישור אימות לא תקין או שפג תוקפו.</h1>');
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    // נבצע redirect לדף אישור בצד הלקוח
    res.redirect(`${process.env.FRONTEND_URL_STORE}/verification-success`);
};
// @desc    Forgot password
// @route   POST /api/users/forgotpassword
// @access  Public
const forgotPassword = async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        // אנחנו שולחים הודעת הצלחה גנרית בכוונה, כדי לא לחשוף אילו מיילים קיימים במערכת
        return res.status(200).json({ message: 'אם קיים משתמש עם כתובת זו, נשלח אליו קישור לאיפוס.' });
    }

    // יצירת טוקן איפוס
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // תוקף ל-10 דקות

    await user.save({ validateBeforeSave: false });

    try {
        const resetUrl = `${process.env.FRONTEND_URL_STORE}/reset-password/${resetToken}`;
        const message = `<p>קיבלת בקשה לאיפוס סיסמה. לחץ על הקישור הבא כדי להמשיך (הקישור בתוקף ל-10 דקות):</p> <a href="${resetUrl}">${resetUrl}</a>`;

        await sendEmail({
            email: user.email,
            subject: 'איפוס סיסמה - E-Shop',
            message
        });

        res.status(200).json({ message: 'נשלח קישור לאיפוס.' });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        console.error(err);
        res.status(500).json({ message: 'שליחת המייל נכשלה' });
    }
};
// @desc    Reset password
// @route   PUT /api/users/resetpassword/:token
// @access  Public
const resetPassword = async (req, res) => {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    });
    if (!user) {
        return res.status(400).json({ message: 'הקישור לאיפוס אינו תקין או שפג תוקפו.' });
    }

    // קביעת הסיסמה החדשה
    user.password = await bcrypt.hash(req.body.password, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // אפשר גם ליצור טוקן התחברות ולהתחבר אוטומטית, אבל כרגע נסתפק בהודעת הצלחה
    res.status(200).json({ message: 'הסיסמה אופסה בהצלחה. ניתן כעת להתחבר עם הסיסמה החדשה.' });
};
// @desc    Get all users by admin
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
    const users = await User.find({});
    res.json(users);
}

// --- Profile Actions ---
// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
        res.json({ _id: user._id, username: user.username, email: user.email, isAdmin: user.isAdmin });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};
// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
        user.username = req.body.username || user.username;
        user.email = req.body.email || user.email;
        if (req.body.password) {
            user.password = await bcrypt.hash(req.body.password, 10);
        }
        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            username: updatedUser.username,
            email: updatedUser.email,
            isAdmin: updatedUser.isAdmin,
            token: generateToken(updatedUser._id), // ננפיק טוקן חדש עם המידע המעודכן
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};
// @desc    Delete user account
// @route   DELETE /api/users/profile
// @access  Private
const deleteUserAccount = async (req, res) => {
    try {
        // בדיקה אם יש הזמנות פתוחות
        const openOrders = await Order.findOne({ user: req.user._id, isDelivered: false });
        if (openOrders) {
            return res.status(400).json({ message: 'לא ניתן למחוק חשבון עם הזמנות פתוחות' });
        }

        const user = await User.findById(req.user._id);
        if (user) {
            await user.deleteOne();
            res.json({ message: 'User account deleted successfully' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- Cart Actions ---
// @desc    Authentication a user (login)
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password, guestCart } = req.body;
        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {

            if (!user.isVerified) {
                return res.status(401).json({ message: 'יש לאמת את כתובת המייל לפני ההתחברות' });
            }

            // --- לוגיקת המיזוג החכמה והמאובטחת ---
            if (guestCart && guestCart.length > 0) {
                // 1. שלוף את כל פרטי המוצרים מעגלת האורח מה-DB כדי לקבל מידע אמין
                const productIds = guestCart.map(item => item.product || item._id);
                const productsFromDB = await Product.find({ _id: { $in: productIds } });
                const productsMap = new Map(productsFromDB.map(p => [String(p._id), p]));

                // 2. צור מפה מהעגלה הקיימת ב-DB
                const serverCartMap = new Map(user.cart.map(item => [String(item.product), item]));

                // 3. עבור על כל פריט בעגלת האורח
                for (const guestItem of guestCart) {
                    const productId = String(guestItem.product || guestItem._id);
                    const productDetails = productsMap.get(productId);

                    // דלג על פריטים שלא נמצאו ב-DB
                    if (!productDetails) continue;

                    const existingItem = serverCartMap.get(productId);

                    if (existingItem) {
                        // 4. אם הפריט קיים - עדכן כמות
                        existingItem.qty += guestItem.qty;
                    } else {
                        // 5. אם הפריט לא קיים - הוסף אותו עם פרטים מלאים מה-DB
                        serverCartMap.set(productId, {
                            name: productDetails.name,
                            qty: guestItem.qty,
                            image: productDetails.image,
                            price: productDetails.price,
                            stock: productDetails.stock, // <-- הוספת המלאי האמיתי
                            product: productDetails._id,
                        });
                    }
                }

                user.cart = Array.from(serverCartMap.values());
                await user.save();
            }
            // --- סוף לוגיקת המיזוג ---

            res.json({
                _id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin,
                cart: user.cart,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'אימייל או סיסמה לא נכונים' });
        }
    } catch (error) {
        console.error('Error in loginUser:', error);
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// @desc    Admin Login - Step 1: Verify password and send 2FA code
// @route   POST /api/users/admin/login
const loginAdminStep1 = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user && user.isAdmin && (await bcrypt.compare(password, user.password))) {
            // יצירת קוד אימות בן 6 ספרות
            const twoFactorCode = Math.floor(100000 + Math.random() * 900000).toString();

            user.twoFactorCode = await bcrypt.hash(twoFactorCode, 10);
            user.twoFactorCodeExpires = Date.now() + 10 * 60 * 1000; // תוקף ל-10 דקות
            await user.save();

            // שליחת הקוד למייל
            await sendEmail({
                email: user.email,
                subject: 'קוד אימות כניסה - E-Shop CRM',
                message: `<h1>קוד האימות שלך הוא: ${twoFactorCode}</h1><p>הקוד בתוקף ל-10 דקות.</p>`
            });

            res.status(200).json({ message: 'קוד אימות נשלח למייל שלך' });
        } else {
            res.status(401).json({ message: 'אימייל או סיסמה לא נכונים, או שאינך מנהל' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Admin Login - Step 2: Verify 2FA code and complete login
// @route   POST /api/users/admin/verify
const loginAdminStep2 = async (req, res) => {
    try {
        const { email, twoFactorCode } = req.body;
        const user = await User.findOne({
            email,
            twoFactorCodeExpires: { $gt: Date.now() } // בודק שהקוד לא פג תוקף
        });

        if (user && (await bcrypt.compare(twoFactorCode, user.twoFactorCode))) {
            // אימות הצליח, ננקה את שדות הקוד
            user.twoFactorCode = undefined;
            user.twoFactorCodeExpires = undefined;
            await user.save();

            // ננפיק טוקן התחברות ונחזיר את פרטי המשתמש
            res.json({
                _id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'קוד אימות שגוי או פג תוקף' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add or update item in user cart
// @route   POST /api/users/cart
// @access  Private
const updateUserCart = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            // --- התיקון הקריטי כאן ---
            const formattedCart = req.body.cartItems.map(item => ({
                name: item.name,
                qty: item.qty,
                image: item.image,
                price: item.price,
                stock: item.stock, // מוודאים ששדה המלאי מועתק למערך החדש
                product: item.product || item._id
            }));

            user.cart = formattedCart;
            const updatedUser = await user.save();
            res.status(200).json(updatedUser.cart);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Error in updateUserCart:', error);
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};
// @desc    Get user cart
// @route   GET /api/users/cart
// @access  Private
const getUserCart = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            res.json(user.cart);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
    const user = await User.findById(req.params.id).select('-password');
    if (user) {
        res.json(user);
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

export {
    registerUser,
    verifyUser,
    loginUser,
    getUsers,
    getUserCart,
    updateUserCart,
    deleteUserAccount,
    updateUserProfile,
    getUserProfile,
    forgotPassword,
    resetPassword,
    getUserById,
    loginAdminStep1,
    loginAdminStep2
};