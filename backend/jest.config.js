export default{
    // run tests in Node environment (not browser)
    testEnvironment: 'node',

    // where to run tests
    testMatch: [
        '**/__tests__/**/*.js',
        '**/*.test.js',
        '**/*.spec.js'
    ],

    // dont test these folders
    testPathIgnorePatterns: [
        '/node_modules/',
        '/frontend/'
    ],

    // setup file runs before all tests
    setupFilesAfterEnv: ['<rootDir>/test/setup.js'],

    // transform ES6 to CommonJS
    transform: {
        '^.+\\.js$': 'babel-jest'
    },

    // Longer timeout for database operations
    testTimeout: 10000,

    // Coverage settings
    collectCoverageFrom: [
        '**/*.js',
        '!**/node_modules/**',
        '!**/frontend/**',
        '!**/test/**',
        '!jest.config.js'
    ]
};