import express from 'express';
import { body, validationResult } from 'express-validator';

import {
    registerUser,
    loginUser,
    loginAdminStep1,
    loginAdminStep2,
    verifyUser,
    forgotPassword,
    resetPassword,
    getUsers,
    getUserProfile,
    updateUserProfile,
    deleteUserAccount,
    getUserById,
    getUserCart,
    updateUserCart,
    toggleAdminStatus
} from '../controllers/userController.js';

import { protect, admin, superAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// פונקציית middleware לטיפול בשגיאות ולידציה
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// --- נתיבי אימות ציבוריים ---
router.post('/login', loginUser);

router.post('/register',
    [
        body('username', 'שם המשתמש הוא שדה חובה').not().isEmpty(),
        body('email', 'אנא הזן כתובת אימייל תקינה').isEmail(),
        body('password', 'הסיסמה חייבת להכיל לפחות 6 תווים').isLength({ min: 6 })
    ],
    validateRequest,
    registerUser
);

router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:token', resetPassword);
router.get('/verify/:token', verifyUser);


// --- נתיבי מנהל (CRM) ---
router.post('/admin/login', loginAdminStep1);
router.post('/admin/verify', loginAdminStep2);

// --- נתיבי משתמשים (דורשים הרשאות) ---
router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile)
    .delete(protect, deleteUserAccount);

router.route('/cart')
    .get(protect, getUserCart)
    .post(protect, updateUserCart);

// --- נתיבי ניהול (דורשים הרשאות מנהל) ---
router.route('/')
    .get(protect, admin, getUsers);

router.route('/:id')
    .get(protect, admin, getUserById);

router.put('/:id/toggle-admin', protect, superAdmin, toggleAdminStatus);

export default router;