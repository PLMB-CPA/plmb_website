const mongoose = require('mongoose');
const { TAX_TYPES, REMITTANCE_STATUS } = require('../util/constants');

// TODO: confirm which fields are mandatory

const remittanceSchema = new mongoose.Schema({
    client: { // stores a MongoDB ObjectId referencing a document in the Client collection
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client', 
        required: true
    },
    taxType: {
        type: String,
        required: true,
        enum: Object.values(TAX_TYPES)
    },
    amount: {
        type: Number,
        required: true
    },
    dueDate: {
        type: Date,
        required: false 
    },
    status: {
        type: String,
        required: true,
        default: REMITTANCE_STATUS.PENDING,
        enum: Object.values(REMITTANCE_STATUS)
    },
    lastEditedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: false 
    }
}, {
    timestamps: true 
});

module.exports = mongoose.model('Remittance', remittanceSchema);