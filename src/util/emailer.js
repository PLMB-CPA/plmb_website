const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendInquiry(inquiry) {
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.PLMB_EMAIL,
        subject: `New Inquiry from [${inquiry.ticketNumber}]: ${inquiry.subject}`,
        text: `
            You have received a new inquiry:

            <p><b>From:</b> ${inquiry.name}</p>
            <p><b>Business Name:</b> ${inquiry.businessName}</p>
            <p><b>Email:</b> ${inquiry.email}</p>
            <p><b>Phone Number:</b> ${inquiry.number}</p>
            <p><b>Industry Sector:</b> ${inquiry.industrySector}</p>
            <p><b>Category:</b> ${inquiry.category}</p>
            <p><b>Subject:</b> ${inquiry.subject}</p>
            <p><b>Message:</b> ${inquiry.message}</p>
        `
    });
}

async function sendReply(inquiry, replyMessage) {
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: inquiry.email,
        replyTo: process.env.PLMB_EMAIL,
        subject: `Re: [${inquiry.ticketNumber}] ${inquiry.subject}`,
        text: `
            <p>Dear ${inquiry.firstName} ${inquiry.lastName}, </p>

            <p>${replyMessage}</p>

            <p>Best regards,</p>
            <p>The PLMB Team</p>
        `
    });
}

async function sendConfirmation(inquiry) {
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: inquiry.email,
        subject: `Inquiry Received: [${inquiry.ticketNumber}]`,
        text: `
            Dear ${inquiry.firstName} ${inquiry.lastName},

            Thank you for your inquiry. We have received your message and will get back to you shortly.
            Your ticket number is [${inquiry.ticketNumber}]. Please keep this for your reference.

            Best regards,
            The PLMB Team
        `
    });
}

module.exports = { sendInquiry, sendReply, sendConfirmation };
