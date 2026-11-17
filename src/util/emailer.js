const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

function esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

async function sendInquiryNotification(inquiry) {
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.PLMB_EMAIL,
        subject: `New Inquiry [${inquiry.ticketNumber}]: ${esc(inquiry.subject)}`,
        text: `
            You have received a new inquiry:

            From: ${inquiry.firstName} ${inquiry.lastName}
            Business Name: ${inquiry.businessName}
            Email: ${inquiry.email}
            Phone Number: ${inquiry.number}
            Industry Sector: ${inquiry.industrySector}
            Category: ${inquiry.category}
            Subject: ${inquiry.subject}
            Message: ${inquiry.message}
        `,
        html: `
            <p>You have received a new inquiry.</p>
            <table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">
                <tr><td style="padding:6px 12px;font-weight:bold">Ticket</td><td style="padding:6px 12px">${esc(inquiry.ticketNumber)}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold">From</td><td style="padding:6px 12px">${esc(inquiry.firstName)} ${esc(inquiry.lastName)}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold">Business</td><td style="padding:6px 12px">${esc(inquiry.businessName)}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold">Email</td><td style="padding:6px 12px">${esc(inquiry.email)}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold">Phone</td><td style="padding:6px 12px">${esc(inquiry.number)}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold">Industry</td><td style="padding:6px 12px">${esc(inquiry.industrySector)}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold">Category</td><td style="padding:6px 12px">${esc(inquiry.category)}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold">Subject</td><td style="padding:6px 12px">${esc(inquiry.subject)}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold;vertical-align:top">Message</td><td style="padding:6px 12px">${esc(inquiry.message)}</td></tr>
            </table>
        `
    });
}

async function sendReply(inquiry, replyMessage) {
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: inquiry.email,
        replyTo: process.env.PLMB_EMAIL,
        subject: `Re: [${inquiry.ticketNumber}] ${esc(inquiry.subject)}`,
        text: `
            Dear ${inquiry.firstName} ${inquiry.lastName},

            ${replyMessage}

            Best regards,
            The PLMB Team
        `,
        html: `
            <p style="font-family:Arial,sans-serif;font-size:14px">Dear ${esc(inquiry.firstName)} ${esc(inquiry.lastName)},</p>
            <p style="font-family:Arial,sans-serif;font-size:14px">${esc(replyMessage)}</p>
            <p style="font-family:Arial,sans-serif;font-size:14px">Best regards,<br>Po Lao Marquez Benedictos &amp; Co.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
            <p style="font-family:Arial,sans-serif;font-size:12px;color:#888">This is a reply to your inquiry <strong>${esc(inquiry.ticketNumber)}</strong>. Please do not reply directly to this email — use the reply-to address above.</p>
        `
    });
}

async function sendConfirmation(inquiry) {
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: inquiry.email,
        subject: `We received your inquiry [${inquiry.ticketNumber}]`,
        text: `
            Dear ${inquiry.firstName} ${inquiry.lastName},

            Thank you for your inquiry. We have received your message and will get back to you shortly.
            Your ticket number is [${inquiry.ticketNumber}]. Please keep this for your reference.

            Best regards,
            The PLMB Team
        `,
        html: `
            <p style="font-family:Arial,sans-serif;font-size:14px">Dear ${esc(inquiry.firstName)} ${esc(inquiry.lastName)},</p>
            <p style="font-family:Arial,sans-serif;font-size:14px">Thank you for reaching out to Po Lao Marquez Benedictos &amp; Co. We have received your inquiry and will get back to you as soon as possible.</p>
            <p style="font-family:Arial,sans-serif;font-size:14px">Your reference number is: <strong>${esc(inquiry.ticketNumber)}</strong></p>
            <table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;margin:16px 0">
                <tr><td style="padding:6px 12px;font-weight:bold">Subject</td><td style="padding:6px 12px">${esc(inquiry.subject)}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold">Category</td><td style="padding:6px 12px">${esc(inquiry.category)}</td></tr>
            </table>
            <p style="font-family:Arial,sans-serif;font-size:14px">Best regards,<br>Po Lao Marquez Benedictos &amp; Co.</p>
        `
    });
}

async function sendClientWelcome(client, tempPassword) {
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        replyTo: process.env.PLMB_EMAIL,
        to: client.email,
        subject: "PLMB Website Client Login", 
        text: `
            Dear ${client.firstName} ${client.lastName},

            Your new PLMB Portal Account has been created. Your login information is as follows.

            Email: ${client.email}
            Temporary Password: ${tempPassword}
            
            Setting a new password for your first time logging in will be required by the site. 
            If you have any concerns or questions, please don't hesitate to reach out to us. 
            
            Have a lovely day. 

            Best regards,
            The PLMB Team
        `
    });
}

module.exports = { sendInquiryNotification, sendReply, sendReplyEmail: sendReply, sendConfirmation, sendClientWelcome};
