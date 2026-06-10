//
//  db.js
//  PLMB_Website
//
//  Created by Justine Aniko Major on 4/8/26.
//

const mongoose = require('mongoose');
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGOOSE_DB, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected');
    } catch (err) {
        console.error('MongoDB Connection Error.', err);
        process.exit(1);
    }
};

module.exports = connectDB;
