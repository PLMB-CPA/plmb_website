function sendError(res, err) {
  console.error('Request failed:', err && err.name);

  if (err && err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Please check the submitted fields and try again.' });
  }
  if (err && err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid request.' });
  }
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
}

module.exports = { sendError };
