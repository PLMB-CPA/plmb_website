const Newsletter = require('../models/Newsletter');
const { sanitizeHtml } = require('../util/sanitizeHtml');

// The editor on post-newsletter.html submits formatted HTML, and the public page
// renders it with innerHTML. Strip anything executable before it reaches the DB
// so the check cannot be skipped by posting to the API directly.
function sanitizeBody(body) {
  if (typeof body.content === 'string') {
    return Object.assign({}, body, { content: sanitizeHtml(body.content) });
  }
  return body;
}

// ADMIN: create a new newsletter (starts unpublished/draft unless isPublished is sent explicitly)
exports.createNewsletter = async (req, res) => {
  try {
    const newsletter = await Newsletter.create(sanitizeBody(req.body));
    res.status(201).json({ message: 'Newsletter created', newsletter });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// PUBLIC: only published newsletters, newest first (used by index.html / newsletter-page.html)
exports.getPublishedNewsletters = async (req, res) => {
  try {
    const newsletters = await Newsletter.find({ isPublished: true }).sort({ date: -1 });
    res.status(200).json({ message: 'Newsletters found', newsletters });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ADMIN: every newsletter regardless of status, for the dashboard list view
exports.getAllNewsletters = async (req, res) => {
  try {
    const filter = {};
    if (req.query.isPublished !== undefined) filter.isPublished = req.query.isPublished === 'true';
    if (req.query.isBlasted !== undefined) filter.isBlasted = req.query.isBlasted === 'true';

    const newsletters = await Newsletter.find(filter).sort({ date: -1 });
    res.status(200).json({ message: 'Newsletters found', newsletters });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ADMIN: single newsletter by id, for an edit view
exports.getNewsletterById = async (req, res) => {
  try {
    const newsletter = await Newsletter.findById(req.params.id);
    if (!newsletter) return res.status(404).json({ error: 'Newsletter not found' });
    res.status(200).json({ message: 'Newsletter found', newsletter });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ADMIN: edit title/content/image, publish/unpublish, etc.
exports.updateNewsletter = async (req, res) => {
  try {
    const newsletter = await Newsletter.findByIdAndUpdate(req.params.id, sanitizeBody(req.body), {
      new: true,
      runValidators: true
    });
    if (!newsletter) return res.status(404).json({ error: 'Newsletter not found' });
    res.status(200).json({ message: 'Newsletter updated', newsletter });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ADMIN: delete a newsletter
exports.deleteNewsletter = async (req, res) => {
  try {
    const newsletter = await Newsletter.findByIdAndDelete(req.params.id);
    if (!newsletter) return res.status(404).json({ error: 'Newsletter not found' });
    res.status(200).json({ message: 'Newsletter deleted', newsletter });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
