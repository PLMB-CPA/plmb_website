const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const app = require('./src/app');
const connectDB = require('./src/config/db');

// The /api routes are mounted inside src/app.js now. They have to be registered
// before the React catch-all route there, otherwise every GET /api/... request
// would get the React page instead of JSON.

connectDB();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
