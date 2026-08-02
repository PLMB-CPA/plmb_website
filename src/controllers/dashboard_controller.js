const Admin = require('../models/Admin');

exports.getAdminStat = async function(req, res) {
  try {
    const totalAdmins = await Admin.countDocuments();
    res.json({ totalAdmins: totalAdmins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};