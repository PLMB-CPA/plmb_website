export const PASSWORD_RULES = [
    { id: 'length', label: 'At least 10 characters', test: pw => pw.length >= 10 },
    { id: 'upper', label: 'At least 1 uppercase letter', test: pw => /[A-Z]/.test(pw) },
    { id: 'special', label: 'At least 1 special character', test: pw => /[^A-Za-z0-9\s]/.test(pw) },
    { id: 'number', label: 'At least 1 number', test: pw => /[0-9]/.test(pw) },
];
