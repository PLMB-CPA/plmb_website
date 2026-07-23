const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

app.use(express.json());
// add routes here when developed

app.use(express.static(this.path.join(__dirname, 'src/views')));
app.use('/styles', express.static(path.join(__dirname, 'src/styles')));
app.use('/image', express.static(path.join(__dirname, 'src/image')));

app.get('/', (req, res) => {
  res.send('PLMB API is running');
});

module.exports = app;
