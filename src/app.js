const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
  
app.use(cors());

app.use(express.json());
// add routes here when developed

app.use(express.static(path.join(__dirname, 'views')));
app.use('/styles', express.static(path.join(__dirname, 'styles')));
app.use('/image', express.static(path.join(__dirname, 'image')));

app.get('/', (req, res) => {
  res.send('PLMB API is running');
});

module.exports = app;
