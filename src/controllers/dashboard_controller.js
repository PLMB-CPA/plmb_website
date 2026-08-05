const Admin = require('../models/Admin');
const Newsletter = require('../models/Newsletter');
const Inquiry = require('../models/Inquiry');

exports.getAdminStat = async function(req, res) {
  try {
    const [totalAdmins, publishedNewsletters, pendingNewsletters, pendingInquiries] = await Promise.all([
      Admin.countDocuments(),
      Newsletter.countDocuments({ isPublished: true }),
      Newsletter.countDocuments({ isPublished: false }),
      Inquiry.countDocuments({ isAnswered: false, isArchived: false })
    ]);

    res.json({
      totalAdmins: totalAdmins,
      publishedNewsletters: publishedNewsletters,
      pendingNewsletters: pendingNewsletters,
      pendingInquiries: pendingInquiries
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
