const express = require('express');
const app = express();

app.use(express.json());
// add routes here when developed

app.get('/', (req, res) => {
  res.send('PLMB API is running');
});

module.exports = app;
