module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEach: [],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/android/', '/ios/', '/.maestro/'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?@?react-native|@react-native-community|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|native-base|react-native-svg|nativewind|react-native-reanimated|react-native-mmkv)',
  ],
};
