// export default {
//     testEnvironment: 'node',
//     transform: {},
//     extensionsToTreatAsEsm: ['.js'],
//     moduleNameMapper: {
//         '^(\\.{1,2}/.*)\\.js$': '$1'
//     }
// }

import { defaults } from 'jest-config';

const config = {
    moduleFileExtensions: [...defaults.moduleFileExtensions, 'mts'],
    transform: {}

};

export default config;