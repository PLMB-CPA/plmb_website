const dns = require('dns');
const disposableDomains = require('disposable-email-domains');

const disposableSet = new Set(disposableDomains);

async function isValidInquiryEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) {
    return { valid: false, reason: 'Invalid email format.' };
  }

  const domain = email.split('@')[1].toLowerCase().trim();

  if (disposableSet.has(domain)) {
    return { valid: false, reason: 'Disposable email addresses are not allowed.' };
  }

  try {
    const records = await dns.promises.resolveMx(domain);
    if (!records || records.length === 0) {
      return { valid: false, reason: 'This email domain cannot receive mail.' };
    }
  } catch (err) {
    return { valid: false, reason: 'This email domain does not exist.' };
  }

  return { valid: true };
}

module.exports = { isValidInquiryEmail };