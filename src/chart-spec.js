import { TEXTS } from './texts.js';
const fill = (s, map) => s.replace(/\{(\w+)\}/g, (_, k) => map[k]);
const serial = (f) => `${f.exact.num}/${f.exact.den}`;
export function buildChartSpec(result) {
    if (!result || result.status !== 'result')
        return null;
    const { a280Neat, amaxNeat, correctedA280, dyeTerm, constants } = result;
    const mark = (name, f, fieldName) => ({
        name, field: `result.${fieldName}`, value: serial(f), display: f.display, unit: 'AU',
        drawRect: f.exact.num !== '0',
    });
    return {
        dataKind: 'segmented-bar',
        title: TEXTS['UI.graph.title'],
        axis: {
            min: { label: '0', value: '0' },
            max: { label: a280Neat.display, value: serial(a280Neat), field: 'result.a280Neat' },
            ticks: ['0', a280Neat.display],
            title: TEXTS['UI.graph.axis'],
            unit: 'AU',
        },
        marks: [
            mark(TEXTS['UI.graph.protein'], correctedA280, 'correctedA280'),
            mark(TEXTS['UI.graph.dye'], dyeTerm, 'dyeTerm'),
        ],
        strip: [
            { label: 'A280 as read (AU)', value: constants.a280 },
            { label: 'Dilution N of that reading', value: constants.dilA280 },
            { label: 'A280, undiluted equivalent (AU)', value: a280Neat.display },
            { label: 'Absorbance at dye maximum as read (AU)', value: constants.amax },
            { label: 'Dilution N of that reading', value: constants.dilAmax },
            { label: 'Dye maximum, undiluted equivalent (AU)', value: amaxNeat.display },
            { label: 'CF', value: constants.cf },
            { label: TEXTS['UI.sources.dye'], value: `${constants.dye}; ${constants.dyeSource}` },
        ],
        table: [
            { name: TEXTS['UI.graph.protein'], value: correctedA280.display, unit: 'AU' },
            { name: TEXTS['UI.graph.dye'], value: dyeTerm.display, unit: 'AU' },
        ],
        pair: null,
        howToRead: TEXTS['UI.graph.howto'],
        ariaLabel: fill(TEXTS['UI.graph.aria'], {
            total: a280Neat.display, protein: correctedA280.display, dye: dyeTerm.display,
        }),
    };
}
