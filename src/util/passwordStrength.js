function checkPasswordStrength(password) {
  const specialChars = /[!@#$%^&*(),.?":{}|<>_-]/;
  const capitalChars = /[A-Z]/;
  const numberChars = /[0-9]/;

  if (password.length < 10)
    return 'Password must be at least 10 characters long';

  if (!specialChars.test(password))
    return 'Password must have at least one (1) special character';

  if (!capitalChars.test(password))
    return 'Password must have at least one (1) capitalized letter';

  if (!numberChars.test(password))
    return 'Password must have at least one (1) number';

  return null; 
}

module.exports = {checkPasswordStrength}