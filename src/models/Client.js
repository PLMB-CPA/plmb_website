const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    email: {type: String, required: true, unique: true, lowercase: true, trim: true},
    password: {type: String, required: true},
    firstName: {type: String, required: true},
    lastName: {type: String, required: true},
    phoneNumber: {type: String, required: true},
    address: {type: String, required: true},
    city: {type: String, required: true},
    businessName: {type: String, required: true},
    mustChangePassword: {type: Boolean, default: true},
}, {timestamps: true});

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;