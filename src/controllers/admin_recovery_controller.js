const crypto = require('crypto');
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');
const { checkPasswordStrength } = require('../util/passwordStrength');
const { sendAdminRecoveryEmail } = require('../util/emailer');
const TOKEN_EXPIRATION_MS = 30 * 60 * 1000;
const REQUEST_COOLDOWN_MS = 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const RECOVERY_MESSAGE ='If an administrator account is registered with that email, a recovery link will be sent.';
const INVALID_TOKEN_MESSAGE ='This recovery link is invalid or has expired. Please request a new link.';

exports.requestRecovery = async (req, res) => {

  const { email } = req.body || {};

  if (
    typeof email !== 'string' ||
    email.length > 254 ||
    !EMAIL_PATTERN.test(email.trim())
  ) {
    return res.status(400).json({
      error: 'Please enter a valid email address.'
    });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {

    //Find admin by registered email
    const admins = await Admin.find({
      email: normalizedEmail
    }).limit(2);

    if (admins.length === 1) {

      const admin = admins[0];

      //Use a configured URL
      const resetUrl = new URL(
        '/admin/reset-password',
        process.env.PUBLIC_BASE_URL
      );

      if (
        process.env.NODE_ENV === 'production' &&
        resetUrl.protocol !== 'https:'
      ) {
        throw new Error('Recovery URL must use HTTPS in production.');
      }

      //Generate random recovery token
      const token = crypto.randomBytes(32).toString('hex');

      //Store only the token hash
      const tokenHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      const now = new Date();

      const expiresAt = new Date(
        now.getTime() + TOKEN_EXPIRATION_MS
      );

      const cooldownBefore = new Date(
        now.getTime() - REQUEST_COOLDOWN_MS
      );

      //Allow one recovery request per account per minute
      const result = await Admin.updateOne(
        {
          _id: admin._id,

          $or: [
            {resetRequestedAt: {$exists: false}},
            {resetRequestedAt: null},
            {resetRequestedAt: {$lt: cooldownBefore}}
          ]
        },
        {
          $set: {
            resetTokenHash: tokenHash,
            resetTokenExpiresAt: expiresAt,
            resetRequestedAt: now
          }
        }
      );

      if (result.modifiedCount === 1) {

        //Include the token in the email link
        resetUrl.searchParams.set('token', token);

        try {

          await sendAdminRecoveryEmail(
            admin.email,
            resetUrl.toString()
          );

        } catch (mailError) {

          console.error(
            'F08 recovery email delivery failed:',
            mailError.message
          );

          //Remove token if email delivery fails
          await Admin.updateOne(
            {
              _id: admin._id,
              resetTokenHash: tokenHash
            },
            {
              $unset: {
                resetTokenHash: '',
                resetTokenExpiresAt: ''
              }
            }
          );
        }
      }
    }

  
    return res.status(200).json({
      message: RECOVERY_MESSAGE
    });

  } catch (error) {

    console.error('F08 recovery request error:', error.message);

  
    return res.status(200).json({
      message: RECOVERY_MESSAGE
    });
  }
};


//Reset password using a valid recovery token
exports.resetPassword = async (req, res) => {

  const { token, newPassword } = req.body || {};

  
  if (
    typeof token !== 'string' ||
    !TOKEN_PATTERN.test(token)
  ) {
    return res.status(400).json({
      code: 'INVALID_RECOVERY_TOKEN',
      error: INVALID_TOKEN_MESSAGE
    });
  }

  try {
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    //Check token validity and expiration
    const admin = await Admin.findOne({
      resetTokenHash: tokenHash,
      resetTokenExpiresAt: {$gt: new Date()}
    });

    if (!admin) {
      return res.status(400).json({
        code: 'INVALID_RECOVERY_TOKEN',
        error: INVALID_TOKEN_MESSAGE
      });
    }

    //Validate the new password
    if (typeof newPassword !== 'string') {
      return res.status(400).json({
        error: 'Please enter a new password.'
      });
    }

    const passwordError = checkPasswordStrength(newPassword);

    if (passwordError) {
      return res.status(400).json({
        error: passwordError
      });
    }
    const isSamePassword = await bcrypt.compare(
      newPassword,
      admin.password
    );

    if (isSamePassword) {
      return res.status(400).json({
        error: 'Your new password must be different from your current password.'
      });
    }

    //Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    
    const result = await Admin.updateOne(
      {
        _id: admin._id,
        resetTokenHash: tokenHash,
        resetTokenExpiresAt: {$gt: new Date()}
      },
      {
        $set: {
          password: hashedPassword
        },
        $unset: {
          resetTokenHash: '',
          resetTokenExpiresAt: ''
        }
      }
    );

    if (result.modifiedCount !== 1) {
      return res.status(400).json({
        code: 'INVALID_RECOVERY_TOKEN',
        error: INVALID_TOKEN_MESSAGE
      });
    }

    return res.status(200).json({
      message: 'Password reset successfully. You can now log in.'
    });

  } catch (error) {

    console.error('F08 password reset error:', error.message);

    return res.status(500).json({
      error: 'Unable to reset your password. Please try again.'
    });
  }
};