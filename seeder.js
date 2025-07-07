// server/seeder.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import colors from 'colors';
import connectDB from './config/db.js';
import Product from './models/Product.js';
import User from './models/User.js';

dotenv.config();
await connectDB(); // נמתין לחיבור לפני שנמשיך

const importData = async () => {
    try {
        // 1. מצא משתמש אדמין קיים כדי לשייך אליו את המוצרים
        const adminUser = await User.findOne({ isAdmin: true });
        if (!adminUser) {
            console.error('Error: No admin user found. Please create an admin user first.'.red.inverse);
            process.exit(1);
        }

        const sampleProducts = [
            {
                name: 'אוזניות אלחוטיות Sony WH-1000XM5',
                image: '/images/sony-headphones.jpg',
                description: 'הדור החדש של אוזניות מבטלות רעשים עם איכות סאונד עוצרת נשימה ועיצוב נוח במיוחד.',
                price: 1499.90,
                stock: 10,
            },
            {
                name: 'מקלדת מכנית Keychron K2',
                image: '/images/keychron-k2.jpg',
                description: 'מקלדת מכנית קומפקטית (75%) עם תאורת RGB, תומכת בחיבור אלחוטי וחוטי למק ולווינדוס.',
                price: 450,
                stock: 15,
            },
            {
                name: 'סמארטפון Google Pixel 8 Pro',
                image: '/images/pixel-8-pro.jpg',
                description: 'מכשיר הדגל של גוגל עם מערך הצילום המתקדם בעולם המבוסס AI ומסך Super Actua Display.',
                price: 3800,
                stock: 5,
            },
        ];

        // 2. שייך כל מוצר למשתמש האדמין שמצאנו
        const products = sampleProducts.map(product => {
            return { ...product, user: adminUser._id };
        });

        await Product.deleteMany();
        await Product.insertMany(products);

        console.log('Data Imported!'.green.inverse);
        process.exit();
    } catch (error) {
        console.error(`${error}`.red.inverse);
        process.exit(1);
    }
};

const destroyData = async () => {
    try {
        await Product.deleteMany();
        console.log('Data Destroyed!'.red.inverse);
        process.exit();
    } catch (error) {
        console.error(`${error}`.red.inverse);
        process.exit(1);
    }
};

if (process.argv[2] === '-d') {
    destroyData();
} else {
    importData();
}