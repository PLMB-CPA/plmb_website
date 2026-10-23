const dns = require('dns');
const { isValidInquiryEmail } = require('../../src/util/emailValidator');

jest.mock('dns', () => ({
  promises: {
    resolveMx: jest.fn(),
  },
}));

describe('isValidInquiryEmail utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects invalid email formats', async () => {
    expect(await isValidInquiryEmail('')).toEqual({
      valid: false,
      reason: 'Invalid email format.',
    });
    expect(await isValidInquiryEmail('not-an-email')).toEqual({
      valid: false,
      reason: 'Invalid email format.',
    });
    expect(await isValidInquiryEmail(null)).toEqual({
      valid: false,
      reason: 'Invalid email format.',
    });
  });

  test('rejects disposable email domains', async () => {
    const res = await isValidInquiryEmail('user@mailinator.com');
    expect(res).toEqual({
      valid: false,
      reason: 'Disposable email addresses are not allowed.',
    });
    expect(dns.promises.resolveMx).not.toHaveBeenCalled();
  });

  test('rejects domains without MX records', async () => {
    dns.promises.resolveMx.mockResolvedValueOnce([]);
    const res = await isValidInquiryEmail('client@nomx-domain.test');
    expect(res).toEqual({
      valid: false,
      reason: 'This email domain cannot receive mail.',
    });
  });

  test('rejects non-existent domains when DNS resolution throws', async () => {
    dns.promises.resolveMx.mockRejectedValueOnce(new Error('ENOTFOUND'));
    const res = await isValidInquiryEmail('client@nonexistent-domain.test');
    expect(res).toEqual({
      valid: false,
      reason: 'This email domain does not exist.',
    });
  });

  test('accepts valid email domain with MX records', async () => {
    dns.promises.resolveMx.mockResolvedValueOnce([{ exchange: 'mx.google.com', priority: 10 }]);
    const res = await isValidInquiryEmail('client@gmail.com');
    expect(res).toEqual({ valid: true });
  });
});
