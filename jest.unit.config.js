module.exports = {
    preset: "ts-jest",
    testEnvironment: 'jsdom',
    testRegex: "(/__tests__/.*\\.unit\\.tests\.ts)$",
    collectCoverageFrom: [
        'src/ts/**/*.ts',
        '!src/ts/tests/**',
        '!src/ts/**/*.d.ts',
    ],
};
