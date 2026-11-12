import { TEXTS } from './texts.js';
export const DYE_SOURCE = TEXTS['A280-OU-07.source'];
export const DYES = Object.freeze([
    { key: 'fitc', name: 'FITC and NHS-fluorescein', lambdaMax: '494', eps: '68000', epsShown: '68,000', cf: '0.3000' },
    { key: 'tritc', name: 'TRITC', lambdaMax: '555', eps: '65000', epsShown: '65,000', cf: '0.3400' },
    { key: 'dylight550', name: 'DyLight 550', lambdaMax: '562', eps: '150000', epsShown: '150,000', cf: '0.0806' },
    { key: 'dylight488', name: 'DyLight 488', lambdaMax: '493', eps: '70000', epsShown: '70,000', cf: '0.1470' },
    { key: 'rpe', name: 'R-phycoerythrin', lambdaMax: '566', eps: '1863000', epsShown: '1,863,000', cf: '0.1700' },
].map((d) => Object.freeze({ ...d, source: DYE_SOURCE })));
export const OTHER_DYE = 'other';
export const dyeByKey = (key) => DYES.find((d) => d.key === key) || null;
