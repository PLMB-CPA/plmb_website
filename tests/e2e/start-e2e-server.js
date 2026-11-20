const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const express = require('express');

// ---- fake emailer (E2E only) ----
// GET    /__e2e/outbox                          -> list of "sent" emails
// DELETE /__e2e/outbox                          -> clear the list
// POST   /__e2e/fail-next-email                 -> the next email (any kind) throws
// POST   /__e2e/fail-next-email?fn=sendConfirmation -> the next email of THAT kind throws
const outbox = [];
let failNext = null;   // null, '*' (any), or an emailer function name

function installFakeEmailer() {
  const emailerPath = require.resolve('../../src/util/emailer');
  const fake = new Proxy({}, {
    get(_target, name) {
      if (typeof name !== 'string' || name === 'then') return undefined;
      return async (...args) => {
        if (failNext && (failNext === '*' || failNext === name)) {
          failNext = null;
          throw new Error('E2E: forced email failure');
        }
        outbox.push({ fn: name, args: JSON.parse(JSON.stringify(args)) });
      };
    },
  });
  require.cache[emailerPath] = { id: emailerPath, filename: emailerPath, loaded: true, exports: fake };
}

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

  const Admin = require('../../src/models/Admin');
  const username = 'plmbadmin';
  const existing = await Admin.findOne({ username });
  if (!existing) {
    const hashedPassword = await bcrypt.hash('plmb2026.', 10);
    await Admin.create({ username, password: hashedPassword });
  }

  installFakeEmailer();                       
  const app = require('../../src/app');

  const outer = express();
  outer.get('/__e2e/outbox', (_req, res) => res.json(outbox));
  outer.delete('/__e2e/outbox', (_req, res) => { outbox.length = 0; res.sendStatus(204); });
  outer.post('/__e2e/fail-next-email', (req, res) => {
    failNext = req.query.fn || '*';
    res.sendStatus(204);
  });
  outer.use(app);

  const port = process.env.PORT || 3000;
  const server = outer.listen(port, () => {
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