import { TEXTS } from './texts.js';
const ITEMS = Object.freeze([
    ['UI.why.dil', 'A280-IN-11.W-1'],
    ['UI.why.eps', 'A280-IN-11.W-2'],
    ['UI.why.path', 'A280-IN-11.W-3'],
    ['UI.why.mw', 'A280-IN-11.W-4'],
    ['UI.why.cf', 'A280-IN-11.W-5'],
]);
export const faqItems = () => ITEMS.map(([q, a]) => ({ question: TEXTS[q], answer: TEXTS[a] }));
export const faqJsonLd = () => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems().map((i) => ({
        '@type': 'Question',
        name: i.question,
        acceptedAnswer: { '@type': 'Answer', text: i.answer },
    })),
});
export const softwareJsonLd = () => ({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: TEXTS['META.name'],
    description: TEXTS['META.description'],
    url: TEXTS['META.url'],
    applicationCategory: TEXTS['META.category'],
    operatingSystem: TEXTS['META.os'],
});
export const ldText = (obj) => JSON.stringify(obj).split('<').join('\\u003c');
