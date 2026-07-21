
const app = require('./src/app');
const connectDB = require('./src/config/db');
const routes = require('./src/routes/index');

connectDB();
app.listen(process.env.PORT || 3000, () => console.log('Server running'));
app.use('/api', routes);
