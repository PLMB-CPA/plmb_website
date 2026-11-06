module.exports = {
  coverageDirectory: 'reports/coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/public/**',
    '!src/config/db.js',
  ],
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      setupFiles: ['<rootDir>/tests/setup.js'],
    },
  ],
};
