const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function startServer() {
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = 'e2e-test-session-secret';
  }

  let mongoServer;
  let mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    process.env.MONGO_URI = mongoUri;
  }

  await mongoose.connect(mongoUri);

  // Ensure default admin account exists for E2E login tests
  const Admin = require('../../src/models/Admin');
  const username = 'plmbadmin';
  const existing = await Admin.findOne({ username });
  if (!existing) {
    const hashedPassword = await bcrypt.hash('plmb2026.', 10);
    await Admin.create({ username, password: hashedPassword });
  }

  const app = require('../../src/app');
  const port = process.env.PORT || 3000;
  const server = app.listen(port, () => {
    console.log(`E2E server listening on http://localhost:${port}`);
  });

  const shutdown = async () => {
    server.close();
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start E2E server:', err);
  process.exit(1);
});
