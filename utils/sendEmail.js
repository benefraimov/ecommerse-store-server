import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
    // nodemailer מזהה את השירות 'gmail' ומגדיר את רוב ההגדרות אוטומטית
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const message = {
        from: `E-Shop <${process.env.EMAIL_USER}>`, // עדיף לשלוח מהכתובת האמיתית
        to: options.email,
        subject: options.subject,
        html: options.message,
    };

    // שליחת המייל
    await transporter.sendMail(message);
    console.log(`Verification email sent to ${options.email}`);
};

export default sendEmail;