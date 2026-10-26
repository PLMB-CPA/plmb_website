const bcrypt = require('bcrypt');
const crypto = require('crypto');
const Client = require('../models/Client');
const { checkPasswordStrength } = require('../util/passwordStrength');
const { sendClientWelcome } = require('../util/emailer');

// 12 random characters, e.g. "q3Zk-8vRt_Lp"
function generateTempPassword() {
  return crypto.randomBytes(9).toString('base64url');
}

// Admin create client
exports.createClient = async (req, res) => {
  try {
    const { email, firstName, lastName, phoneNumber, address, city, businessName } = req.body;
    if (!email || !firstName || !lastName || !phoneNumber || !address || !city || !businessName)
        return res.status(400).json({error: 'Please recheck missing information.'})
    if (await Client.findOne({email: email.toLowerCase().trim()}))
        return res.status(409).json({error: 'Client account already exists.'});

    const tempPassword = generateTempPassword();
    const tempPasswordHash = await bcrypt.hash(tempPassword, 10);

    const client = await Client.create({
        email, firstName, lastName, phoneNumber, address, city, businessName,
        password: tempPasswordHash
    });

    try {
      await sendClientWelcome(client, tempPassword);
    } catch (mailErr) {
        console.error(mailErr);
        await Client.findByIdAndDelete(client._id);
        return res.status(502).json({error: 'Account not created: welcome email could not be sent.'});
    }

    res.status(201).json({
        message: 'New client account created.',
        client: { id: client._id, email: client.email, firstName:  client.firstName, lastName: client.lastName}
        });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred. Account not created.' });
  }
};

// Admin list all clients 
exports.getClients = async (req, res) => {
  try {
    const clients = await Client.find().select('-password').sort({ createdAt: -1 });
    return res.status(200).json(clients)
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load clients.' });
  }
};

// Client Login
exports.loginClient = async (req, res) => {
  try {
    const {email, password} = req.body;
    if (!email || !password)
        return res.status(400).json({error: 'Email and password are required.'});
    const client = await Client.findOne({email: email.toLowerCase().trim()})
        if (!client || !(await bcrypt.compare(password, client.password))) {
            return res.status(401).json({error: 'Invalid email or password.'})
        }
        req.session.isClient = true;
        req.session.clientId = client._id;
        req.session.mustChangePassword = client.mustChangePassword;
    if (req.body.remember) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    }

    res.json({mustChangePassword: client.mustChangePassword});

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred.' });
  }
};

// Client Change Password
exports.changeClientPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'Current and new password are required.' });

    const client = await Client.findById(req.session.clientId);
    if (!client)
      return res.status(404).json({ error: 'Client not found.' });

    if (!(await bcrypt.compare(currentPassword, client.password)))
      return res.status(401).json({ error: 'Current password is incorrect.' });

    const passwordError = checkPasswordStrength(newPassword);
    if (passwordError)
      return res.status(400).json({ error: passwordError });

    if (newPassword === currentPassword)
      return res.status(400).json({ error: 'New password must be different from the current one.' });

    client.password = await bcrypt.hash(newPassword, 10);
    client.mustChangePassword = false;
    await client.save();

    req.session.mustChangePassword = false;
    res.status(200).json({ message: 'Password updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error has occurred' });
  }
};

// Client Log Out
exports.logoutClient = (req, res) => {
    try {
        req.session.destroy(() => {
            res.json({message: 'Logged out'});
        });
    } catch (err) {
        res.status(500).json({error: 'An error has occurred'})
    }
};

// Check client who is logged in
exports.getCurrentClient = async (req, res) => {
  try {
    const clientUser = req.session.clientId;
    const client = await Client.findById(clientUser).select('-password');
        
    if (!client)
      return res.status(404).json({error: 'User not found, cannot retrieve information.'});
        
        res.status(200).json(client);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error has occurred' });
  }
};