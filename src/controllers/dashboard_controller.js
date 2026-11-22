const Admin = require('../models/Admin');
const Newsletter = require('../models/Newsletter');
const Inquiry = require('../models/Inquiry');
const Remittance = require('../models/Remittance');
const { isOverdue } = require('../util/inquiryMetrics');

exports.getAdminStat = async function (req, res) {
  try {
    const now = new Date();

    const [totalAdmins, publishedNewsletters, pendingNewsletters, allInquiries, allRemittances] = await Promise.all([
      Admin.countDocuments(),
      Newsletter.countDocuments({ isPublished: true }),
      Newsletter.countDocuments({ isPublished: false }),
      Inquiry.find({ isArchived: false }).lean(),
      Remittance.find().lean(),
    ]);

    // --- inquiry analytics ---
    const inquiryByStatus = { new: 0, in_progress: 0, answered: 0 };
    let overdueInquiries = 0;
    let totalResponseMinutes = 0;
    let answeredCount = 0;

    for (const inq of allInquiries) {
      const status = inq.isAnswered ? 'answered' : inq.isRead ? 'in_progress' : 'new';
      inquiryByStatus[status]++;
      if (isOverdue(inq, now)) overdueInquiries++;
      if (inq.isAnswered && inq.date && inq.repliedAt) {
        totalResponseMinutes += Math.max(0, Math.round((new Date(inq.repliedAt) - new Date(inq.date)) / 60000));
        answeredCount++;
      }
    }

    // --- remittance analytics ---
    const remittanceByStatus = { Pending: 0, Processing: 0, Remitted: 0, Completed: 0 };
    let overdueRemittances = 0;

    for (const rem of allRemittances) {
      if (remittanceByStatus[rem.status] !== undefined) remittanceByStatus[rem.status]++;
      if (rem.dueDate && rem.status !== 'Completed' && rem.status !== 'Remitted' && new Date(rem.dueDate) < now) {
        overdueRemittances++;
      }
    }

    res.json({
      totalAdmins,
      publishedNewsletters,
      pendingNewsletters,
      pendingInquiries: inquiryByStatus.new + inquiryByStatus.in_progress,
      inquiries: {
        byStatus: inquiryByStatus,
        overdue: overdueInquiries,
        avgResponseMinutes: answeredCount > 0 ? Math.round(totalResponseMinutes / answeredCount) : null,
      },
      remittances: {
        byStatus: remittanceByStatus,
        overdue: overdueRemittances,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
