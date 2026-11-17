const { checkPasswordStrength } = require('../../src/util/passwordStrength');

const LENGTH = 'Password must be at least 10 characters long';
const SPECIAL = 'Password must have at least one (1) special character';
const CAPITAL = 'Password must have at least one (1) capitalized letter';
const NUMBER = 'Password must have at least one (1) number';

describe('checkPasswordStrength', () => {
  // SITUATION: passwords that follow every rule. 
  // CHECKS: null means "no problem".
  test.each(['Abcdefgh1!', 'Newpass123.', 'A1!aaaaaaaaaaaaaaaaaaaaaaaa'])('%s is accepted', (pw) => {
    expect(checkPasswordStrength(pw)).toBeNull();
  });

  test('9 characters is too short, 10 is fine', () => {
    expect(checkPasswordStrength('Abcdefg1!')).toBe(LENGTH);
    expect(checkPasswordStrength('Abcdefgh1!')).toBeNull();
    expect(checkPasswordStrength('')).toBe(LENGTH);
  });

  test.each([
    ['no special character', 'Abcdefghi12', SPECIAL],
    ['no capital letter', 'abcdefghi1.', CAPITAL],
    ['no number', 'Abcdefghij.', NUMBER],
  ])('%s', (_l, pw, message) => {
    expect(checkPasswordStrength(pw)).toBe(message);
  });

  test('reports one problem at a time, in a fixed order', () => {
    expect(checkPasswordStrength('abc')).toBe(LENGTH);
    expect(checkPasswordStrength('abcdefghij')).toBe(SPECIAL);
    expect(checkPasswordStrength('abcdefghi.')).toBe(CAPITAL);
  });

  test.each('!@#$%^&*(),.?":{}|<>_-'.split(''))('"%s" counts as a special character', (ch) => {
    expect(checkPasswordStrength('Abcdefgh1' + ch)).toBeNull();
  });

  // "special" characters but are not in the list.
  test.each(['+', '=', '[', ']', ';', "'", '/', '~'])('"%s" should count as a special character', (ch) => {
    expect(checkPasswordStrength('Abcdefgh1' + ch)).toBeNull();
  });
});