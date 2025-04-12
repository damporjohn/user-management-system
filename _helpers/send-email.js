const nodemailer = require('nodemailer');
const config = require('config.json');

module.exports = sendEmail;

async function sendEmail({to, subject, html, from = config.emailForm }) {
    const transporter = nodemailer.createTransport(ocnfig.smtpOptions);
    await transporter.sendMail({from, to, subject, html });   
}