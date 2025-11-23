module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@presentation/(.*)$': '<rootDir>/src/presentation/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@validation/(.*)$': '<rootDir>/src/validation/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
  },
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};
