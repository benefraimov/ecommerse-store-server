import express from 'express'
import { body, validationResult } from 'express-validator'
import {
    deleteUserAccount,
    forgotPassword,
    getUserById,
    getUserCart,
    getUserProfile,
    getUsers,
    loginAdminStep1,
    loginAdminStep2,
    loginUser,
    registerUser,
    resetPassword,
    updateUserCart,
    updateUserProfile,
    verifyUser
} from '../controllers/userController.js';
import {
    admin,
    protect
} from '../middleware/authMiddleware.js';

const router = express.Router()

// פונקציית middleware לבדיקת תוצאות הולידציה
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

router.get('/', protect, admin, getUsers);
router.post('/login', loginUser);
// נתיב התחברות למנהלים
router.post('/admin/login', loginAdminStep1);
router.post('/admin/verify', loginAdminStep2);
router.post('/register',
    [
        body('username', 'שם המשתמש הוא שדה חובה').not().isEmpty(),
        body('email', 'אנא הזן כתובת אימייל תקינה').isEmail(),
        body('password', 'הסיסמה חייבת להכיל לפחות 6 תווים').isLength({ min: 6 })
    ],
    validateRequest,
    registerUser);
router.route('/cart')
    .get(protect, getUserCart)
    .post(protect, updateUserCart);
router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile)
    .delete(protect, deleteUserAccount);
router.post('/forgotpassword', forgotPassword);
router.get('/verify/:token', verifyUser);
router.put('/resetpassword/:token', resetPassword);
router.route('/:id').get(protect, admin, getUserById);

export default router;