import { TEXTS } from './texts.js';
const F01 = {
    a280: '0.289', dilA280: '10', amax: '0.906', dilAmax: '10', dye: 'dylight550',
    epsProtein: '210000', epsDecl: 'notMeasured',
    epsProteinSource: '[worked example] typical IgG value used in TR0031; 14 × 150,000 / 10 (TR0006)',
    path: '1', mw: '150000',
};
const F02 = { ...F01, dilAmax: '1' };
export const EXAMPLES = Object.freeze({ 1: Object.freeze(F01), 2: Object.freeze(F02) });
export const EXAMPLE_MARKED = Object.freeze([
    'a280', 'dilA280', 'dye', 'amax', 'dilAmax', 'epsProtein', 'epsDecl', 'epsProteinSource', 'path', 'mw',
]);
export const EXAMPLE_LABELS = Object.freeze({ 1: TEXTS['UI.example.1'], 2: TEXTS['UI.example.2'] });
