module.exports = {
    preset: "ts-jest",
    testEnvironment: 'jsdom',
    testRegex: "mechanicsValidation\\.tests\\.ts$",
    reporters: ['default'],
    testTimeout: 120000,
};
