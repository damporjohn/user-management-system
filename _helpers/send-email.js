const nodemailer = require('nodemailer');
const config = require('../config.json');

module.exports = sendEmail;

async function sendEmail({ to, subject, html, from = config.emailFrom }) {
    // For development/testing, create a test account
    if (process.env.NODE_ENV !== 'production') {
        // Log email details
        console.log('\nEmail Details:');
        console.log('-------------');
        console.log('To:', to);
        console.log('Subject:', subject);
        console.log('Content:', html);
        console.log('-------------\n');

        try {
            // Create ethereal test account
            const testAccount = await nodemailer.createTestAccount();

            // Create test SMTP transport
            const transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                }
            });

            // Send mail with test account
            const info = await transporter.sendMail({
                from: from,
                to: to,
                subject: subject,
                html: html
            });

            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
            return info;
        } catch (error) {
            console.error('Test email error:', error);
            return { messageId: 'test-mode-failed' };
        }
    }

    // Production email sending
    try {
        const transporter = nodemailer.createTransport(config.smtpOptions);
        const result = await transporter.sendMail({ from, to, subject, html });
        console.log('Email sent successfully:', result.messageId);
        return result;
    } catch (error) {
        console.error('Email sending failed:', error);
        return { error: error.message };
    }
}