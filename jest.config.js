module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: '.',
    testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
    transform: {
        '^.+\\.(t|j)s$': ['ts-jest', { useESM: true }],
    },
    transformIgnorePatterns: [
        'node_modules/(?!(better-auth)/)'
    ],
    collectCoverageFrom: ['**/*.(t|j)s'],
    coverageDirectory: './coverage',
    testEnvironment: 'node',
    modulePaths: ['<rootDir>'],
};
