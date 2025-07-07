import Product from '../models/Product.js';
import fs from 'fs/promises'; // ייבוא ספריית קבצים של Node.js
import path from 'path'; // ייבוא ספריית נתיבים
import { fileURLToPath } from 'url';

// הגדרת __dirname עבור ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Fetch all products with pagination
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
    try {
        const pageSize = 4; // נקבע כמה מוצרים יוצגו בכל עמוד
        const page = Number(req.query.pageNumber) || 1;

        const count = await Product.countDocuments({}); // ספירת כלל המוצרים
        const products = await Product.find({})
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        res.json({ products, page, pages: Math.ceil(count / pageSize) });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Fetch single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            res.json(product);
        } else {
            // חשוב לטפל במקרה שה-ID תקין בפורמט אך לא קיים ב-DB
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        // טיפול במקרה שה-ID לא תקין בפורמט שלו (לא ObjectId)
        console.error(error);
        res.status(404).json({ message: 'Product not found' });
    }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
    const product = new Product({
        name: 'Sample name',
        price: 0,
        user: req.user._id,
        image: '/images/sample.jpg',
        description: 'Sample description',
        stock: 0,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
    const { name, price, description, image, stock } = req.body;
    const product = await Product.findById(req.params.id);

    if (product) {
        const oldImagePath = product.image; // 1. שומרים את הנתיב הישן

        // מעדכנים את פרטי המוצר באובייקט
        product.name = name;
        product.price = price;
        product.description = description;
        product.image = image;
        product.stock = stock;

        const updatedProduct = await product.save();

        // 2. בודקים אם התמונה השתנתה והאם הישנה היא קובץ שהעלינו
        const imageHasChanged = oldImagePath !== image;
        const oldImageIsLocalUpload = oldImagePath && oldImagePath.startsWith('/uploads');

        if (imageHasChanged && oldImageIsLocalUpload) {
            // 3. בונים את הנתיב הפיזי המלא לקובץ הישן
            const physicalPath = path.join(path.dirname(__dirname), oldImagePath);

            try {
                // 4. מנסים למחוק את הקובץ הישן
                await fs.unlink(physicalPath);
                console.log(`Successfully deleted old image: ${physicalPath}`.yellow);
            } catch (err) {
                // אם המחיקה נכשלת, רק נדפיס שגיאה אבל לא נכשיל את כל הבקשה
                console.error(`Failed to delete old image file: ${err.message}`.red);
            }
        }

        res.json(updatedProduct);
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (product) {
        await Product.deleteOne({ _id: product._id });
        res.json({ message: 'Product removed' });
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
};

// @desc    Get all products for admin (no pagination)
// @route   GET /api/products/admin
// @access  Private/Admin
const getAdminProducts = async (req, res) => {
    try {
        const products = await Product.find({});
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const getTopProducts = async (req, res) => {
    try {
        // כרגע נחזיר 3 מוצרים אקראיים, בעתיד אפשר לפי דירוג או מכירות
        const products = await Product.aggregate([{ $sample: { size: 3 } }]);
        res.json(products);
    } catch (error) { res.status(500).json({ message: 'Server Error' }); }
};

export { getProducts, getProductById, createProduct, updateProduct, deleteProduct, getAdminProducts, getTopProducts }