import nodemailer from 'nodemailer';
import { google } from 'googleapis';

const createTransporter = async () => {
    const oAuth2Client = new google.auth.OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        "https://developers.google.com/oauthplayground"
    );

    oAuth2Client.setCredentials({
        refresh_token: process.env.REFRESH_TOKEN
    });

    const accessToken = await new Promise((resolve, reject) => {
        oAuth2Client.getAccessToken((err, token) => {
         if (err) {
             reject("Failed to create access token :(");
          }
         resolve(token);
    })})


    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: 'info@zoomtech.co.il',
            accessToken,
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            refreshToken: process.env.REFRESH_TOKEN,
        },
    });

    return transporter
}


const sendEmail = async (options) => {
    try {
        
        const message = {
            from: `${process.env.EMAIL_USER}`, // עדיף לשלוח מהכתובת האמיתית
            to: options.email,
            subject: options.subject,
            html: options.message,
        };
        
        // שליחת המייל
        let emailTransporter = await createTransporter();
        await emailTransporter.sendMail(message)
        console.log(`Verification email sent to ${options.email}`);
    } catch (error) {
        console.error('שגיאה בשליחה:', error);
    }
};

export default sendEmail;