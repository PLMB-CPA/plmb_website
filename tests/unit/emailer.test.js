// F05 and F01 emails (unit). 

process.env.EMAIL_USER = 'sender@test.com';
process.env.PLMB_EMAIL = 'firm@test.com';

const mockSendMail = jest.fn().mockResolvedValue({});
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

const emailer = require('../../src/util/emailer');
const { sendConfirmation, sendInquiryNotification, sendReply, sendClientWelcome } = emailer;

const inquiry = {
  ticketNumber: 'INQ-0001', firstName: 'Juan', lastName: 'Dela Cruz',
  businessName: 'JDC Corp', email: 'juan@gmail.com', number: '09171234567',
  industrySector: 'Retail', category: 'Audit & Assurance',
  subject: 'Statutory Audit Inquiry', message: 'We need an audit quote for FY 2026.',
};

beforeEach(() => mockSendMail.mockClear());
const sentMail = () => mockSendMail.mock.calls[0][0];   //sent

describe('F05 · sendConfirmation', () => {
  // SITUATION: a client just submitted an inquiry.
  // CHECKS: exactly one email, to them, from our sender. 
  test('sends one email to the person who submitted', async () => {
    await sendConfirmation(inquiry);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(sentMail().to).toBe('juan@gmail.com');
    expect(sentMail().from).toBe('sender@test.com');
  });

  // SITUATION: the client searches their inbox later by ticket number.
  test('subject and body contain the ticket number', async () => {
    await sendConfirmation(inquiry);
    expect(sentMail().subject).toContain('INQ-0001');
    expect(sentMail().text).toContain('INQ-0001');
  });

  test('greets the client by full name', async () => {
    await sendConfirmation(inquiry);
    expect(sentMail().text).toContain('Dear Juan Dela Cruz');
  });

  // SITUATION: the email sits in a possibly shared inbox.
  // CHECKS: the phone number and the full message are not repeated.
  test('does not repeat private inquiry details', async () => {
    await sendConfirmation(inquiry);
    expect(sentMail().text).not.toContain('09171234567');
    expect(sentMail().text).not.toContain('We need an audit quote');
  });

  test('keeps accents and apostrophes in names readable', async () => {
    await sendConfirmation({ ...inquiry, firstName: 'Zoë', lastName: "O'Brien" });
    expect(sentMail().text).toContain("Zoë O'Brien");
  });

  // SITUATION: smtp is down. 
  // CHECKS: it rejects so the caller can handle it, not fail silently.
  test('rejects when smtp fails', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('smtp down'));
    await expect(sendConfirmation(inquiry)).rejects.toThrow('smtp down');
  });
});

describe('F01 · sendClientWelcome', () => {
  const client = { firstName: 'Ana', lastName: 'Reyes', email: 'ana@business.com' };

  // SITUATION: admin just created a client. 
  // CHECKS: the email goes to the client with the login details.
  test('sends the login details to the new client', async () => {
    await sendClientWelcome(client, 'Temp-pass_12');
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(sentMail().to).toBe('ana@business.com');
    expect(sentMail().replyTo).toBe('firm@test.com');
    expect(sentMail().subject).toBe('PLMB Website Client Login');
    expect(sentMail().text).toContain('Dear Ana Reyes');
    expect(sentMail().text).toContain('ana@business.com');
    expect(sentMail().text).toContain('Temp-pass_12');
  });

  test('tells the client a new password is required', async () => {
    await sendClientWelcome(client, 'Temp-pass_12');
    expect(sentMail().text).toMatch(/new password/i);
  });

  test('rejects when smtp fails (the controller then rolls the account back)', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('smtp down'));
    await expect(sendClientWelcome(client, 'x')).rejects.toThrow('smtp down');
  });
});

describe('F03 · reply and notification emails', () => {
  test('sendReplyEmail is the same function as sendReply', () => {
    expect(emailer.sendReplyEmail).toBe(emailer.sendReply);
  });

  test('a reply goes to the client with reply-to set to the firm', async () => {
    await sendReply(inquiry, 'Thank you for your inquiry.');
    expect(sentMail().to).toBe('juan@gmail.com');
    expect(sentMail().replyTo).toBe('firm@test.com');
    expect(sentMail().subject).toBe('Re: [INQ-0001] Statutory Audit Inquiry');
    expect(sentMail().text).toContain('Thank you for your inquiry.');
  });

  test('the notification goes to the firm inbox, not the client', async () => {
    await sendInquiryNotification(inquiry);
    expect(sentMail().to).toBe('firm@test.com');
    expect(sentMail().subject).toContain('INQ-0001');
  });
});

// passes while the bug exists and goes
// red when it's fixed (then delete the ".failing").
describe('known bugs in the plain-text emails', () => {
  // the notification reads inquiry.name, but inquiries have firstName and lastName
  test('the notification shows who the inquiry is from', async () => {
    await sendInquiryNotification(inquiry);
    expect(sentMail().text).not.toContain('undefined');
    expect(sentMail().text).toContain('Juan Dela Cruz');
  });

  test('the notification has no raw html tags', async () => {
    await sendInquiryNotification(inquiry);
    expect(sentMail().text).not.toMatch(/<\/?(p|b)>/);
  });

  test('the reply email has no raw html tags', async () => {
    await sendReply(inquiry, 'Thank you for your inquiry.');
    expect(sentMail().text).not.toMatch(/<\/?p>/);
  });
});