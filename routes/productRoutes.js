import express from 'express'
import { createProduct, deleteProduct, getAdminProducts, getProductById, getProducts, getTopProducts, updateProduct } from '../controllers/productController.js'
import { admin, protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.route('/')
    .get(getProducts)
    .post(protect, admin, createProduct)

router.get('/admin', protect, admin, getAdminProducts);

router.get('/top', getTopProducts);
// Dynamic paths with (:id) must be written after static paths
// To prevent conflicts
router.route('/:id')
    .get(getProductById)
    .put(protect, admin, updateProduct)
    .delete(protect, admin, deleteProduct);


export default router;