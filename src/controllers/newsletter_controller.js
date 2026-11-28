const { sendError } = require('../util/apiError');
const Newsletter = require('../models/Newsletter');
const { sanitizeHtml } = require('../util/sanitizeHtml');
const Subscriber = require('../models/Subscriber');
const { sendNewsletterToSubscriber } = require('../util/emailer');

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
    sendError(res, err);
  }
};

// PUBLIC: only published newsletters, newest first (used by index.html / newsletter-page.html)
exports.getPublishedNewsletters = async (req, res) => {
  try {
    const newsletters = await Newsletter.find({ isPublished: true }).sort({ date: -1 });
    res.status(200).json({ message: 'Newsletters found', newsletters });
  } catch (err) {
    sendError(res, err);
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
    sendError(res, err);
  }
};

// ADMIN: single newsletter by id, for an edit view
exports.getNewsletterById = async (req, res) => {
  try {
    const newsletter = await Newsletter.findById(req.params.id);
    if (!newsletter) return res.status(404).json({ error: 'Newsletter not found' });
    res.status(200).json({ message: 'Newsletter found', newsletter });
  } catch (err) {
    sendError(res, err);
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
    sendError(res, err);
  }
};

// ADMIN: delete a newsletter
exports.deleteNewsletter = async (req, res) => {
  try {
    const newsletter = await Newsletter.findByIdAndDelete(req.params.id);
    if (!newsletter) return res.status(404).json({ error: 'Newsletter not found' });
    res.status(200).json({ message: 'Newsletter deleted', newsletter });
  } catch (err) {
    sendError(res, err);
  }
};

// ADMIN: email a published newsletter to every active subscriber, once
exports.blastNewsletter = async (req, res) => {
  try {
    const newsletter = await Newsletter.findOneAndUpdate(
      { _id: req.params.id, isPublished: true, isBlasted: false },
      { isBlasted: true },
      { new: true }
    );
    if (!newsletter) {
      return res.status(409).json({ error: 'Newsletter must be published and not already sent to subscribers.' });
    }

    const subscribers = await Subscriber.find({ isSubscribed: true });
    let sent = 0;
    let failed = 0;
    for (const subscriber of subscribers) {
      try {
        await sendNewsletterToSubscriber(newsletter, subscriber);
        sent++;
      } catch (err) {
        failed++;
      }
    }

    if (subscribers.length > 0 && sent === 0) {
      await Newsletter.findByIdAndUpdate(newsletter._id, { isBlasted: false });
      return res.status(502).json({ error: 'Could not send the newsletter. Please try again later.' });
    }

    res.status(200).json({ message: 'Newsletter sent to subscribers', sent, failed });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send newsletter.' });
  }
};
