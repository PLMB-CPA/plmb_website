const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  ticketNumber: {type: String},
  firstName: {type: String, required: true},
  lastName: {type: String, required: true},
  businessName: {type: String, required: true},
  email: {type: String, required: true},
  number: {type: String, required: true},
  industrySector: {type: String,
              enum: [
                'Healthcare',
                'Real Estate',
                'Retail',
                'Professional Services',
                'Non-Profit',
                'Other'
              ],
              required: true
  },
  category: {type: String, 
             enum: [
                      'New Client General Inquiry',
                      'Audit & Assurance',
                      'Tax Services',
                      'Accounting & Bookkeeping',
                      'Business Advisory',
                      'Payroll Services',
                      'Billing Concerns',
                      'Comments & Complaints',
                      'Other'
                    ],
            required: true
            },
  subject: {type: String, required: true},
  message: {type: String, required: true},
  date: {type: Date, default: Date.now},
  reply: {type: String, default: null},
  repliedAt: {type: Date, default: null},
  isArchived: {type: Boolean, default: false},
  isRead: {type: Boolean, default: false},
  isAnswered: {type: Boolean, default: false}
});

module.exports = mongoose.model('Inquiry', inquirySchema);
