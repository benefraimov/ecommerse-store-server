import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, required: true, default: false },
    isVerified: { type: Boolean, required: true, default: false },
    verificationToken: { type: String },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    shippingAddress: {
        address: { type: String },
        city: { type: String },
        postalCode: { type: String },
    },
    cart: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
            name: { type: String, required: true },
            image: { type: String, required: true },
            price: { type: Number, required: true },
            qty: { type: Number, required: true },
            stock: { type: Number, required: true }
        }
    ],
    twoFactorCode: { type: String },
    twoFactorCodeExpires: { type: Date },
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);

export default User;
