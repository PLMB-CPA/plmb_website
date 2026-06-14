
const app = require('./src/app');
const connectDB = require('./src/config/db');
const routes = require('./src/routes/index');

connectDB();
app.listen(3000, () => console.log('Server running on port 3000'));
app.use('/api', routes);
