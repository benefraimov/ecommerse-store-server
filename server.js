// Express 
import express from 'express';

// Security
import rateLimit from 'express-rate-limit';
import cors from 'cors';

// Configs
import path from 'path';
import dotenv from 'dotenv';
dotenv.config()
import { fileURLToPath } from 'url';
import connectDB from './config/db.js'

// Routes
import userRoutes from './routes/userRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

connectDB()

const app = express();
const PORT = process.env.PORT || 5001;

// ✅ חשוב! זה פותר את שגיאת X-Forwarded-For
app.set('trust proxy', 'loopback');

// --- הגדרת CORS מאובטחת ---
// רשימת הכתובות המורשות לגשת לשרת
const whitelist = [
    process.env.ENVIRONMENT === "production" ?
        process.env.FRONTEND_URL_STORE : process.env.FRONTEND_URL_STORE_DEV,
    process.env.ENVIRONMENT === "production" ?
        process.env.FRONTEND_URL_CRM : process.env.FRONTEND_URL_CRM_DEV
];

const corsOptions = {
    origin: function (origin, callback) {
        // מאפשר בקשות ללא origin (כמו מ-Postman) או בקשות מהרשימה הלבנה
        if (whitelist.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
};
app.use(cors(corsOptions));

// שכבת ביניים להמיר גופי בקשה המכילים JSON
app.use(express.json());

// יצירת החלה של המגבלה
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,// 15 minutes
    max: 100, // Limit each ip to 100 requests in 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
})

app.use('/api', limiter)

app.get('/api/test', (req, res) => {
    res.send('<h1>Wow We Preventing Attacks On Our Api...</h1>')
})

app.get('/', (req, res) => {
    res.send("API is running with ES Modules!");
});

// שימוש בנתיבים
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/dashboard', dashboardRoutes);

// הגדרת תיקייה סטטית - uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});