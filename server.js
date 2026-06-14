//
//  server.js
//  PLMB_Website
//
//  Created by Justine Aniko Major on 4/8/26.
//

const app = require('./src/app');
const connectDB = require('./src/config/db');

connectDB();
app.listen(3000, () => console.log('Server running on port 3000'));
