import { TEXTS, labelOf } from './texts.js';
import { DYES } from './constants.js';
export const h = (tag, attrs, ...kids) => ({ tag, attrs: attrs || {}, kids: kids.flat(Infinity).filter((k) => k != null && k !== false) });
export function textOf(n) {
    if (n == null)
        return '';
    if (typeof n === 'string')
        return n;
    if (Array.isArray(n))
        return n.map(textOf).join(' ');
    return n.kids.map(textOf).join(' ');
}
const unitSpan = (s) => h('span', { class: 'u' }, s);
const fieldCode = (c) => h('span', { class: 'flag-code' }, c);
export function messageNodes(res, k) {
    const f = res.fields[k];
    if (!f)
        return [];
    const out = f.messages.map((m) => h('p', { class: 'msg-refusal' }, m.text));
    if (f.flagFL01)
        out.push(h('p', { class: 'msg-flag' }, fieldCode('FL-01'), ' ', TEXTS['A280-FL-01']));
    return out;
}
export const isInvalid = (res, k) => !!(res.fields[k] && res.fields[k].messages.length);
function flagItem(f) {
    return h('li', { class: 'flag-item' }, fieldCode(f.code), ' ', f.code === 'FL-01' ? h('strong', {}, labelOf(f.field), ': ') : null, h('span', { class: 'flag-quote' }, f.text));
}
export function resultStateNode(res) {
    if (res.status === 'blocked') {
        return h('div', { class: 'state-block incomplete' }, res.panel.map((p) => h('p', {}, p.text)));
    }
    if (res.status === 'refused') {
        return h('div', { class: 'state-block withheld', role: 'alert' }, res.operands.map((o) => h('p', { class: 'num' }, o.text)), h('p', {}, res.panel[0].text));
    }
    const cards = h('div', { class: 'headline' }, h('div', { class: 'card' }, h('div', { class: 'k' }, TEXTS['UI.dol.card']), h('div', { class: 'v num' }, res.dol.display), h('p', { class: 'free-dye' }, TEXTS['A280-FL-03'])), h('div', { class: 'card' }, h('div', { class: 'k' }, TEXTS['UI.protein.card']), h('div', { class: 'v num' }, res.proteinMolar.display, ' ', unitSpan(TEXTS['UNIT.molar']))));
    const flags = res.flags.length ? h('ul', { class: 'plan-flags' }, res.flags.map(flagItem)) : null;
    return h('div', { class: 'state-body' }, cards, flags);
}
export function graphMountNodes(res, spec) {
    if (res.status === 'refused')
        return [];
    if (!spec)
        return [h('div', { class: 'graph-placeholder' }, h('p', {}, TEXTS['UI.graph.loading']))];
    const items = spec.strip.slice(0, spec.strip.length - 1);
    const rows = spec.table.map((r) => h('tr', {}, h('th', { scope: 'row' }, r.name), h('td', { class: 'num' }, r.value), h('td', {}, r.unit)));
    return [
        h('div', { class: 'graph-placeholder' }, h('p', {}, TEXTS['UI.graph.values'])),
        h('ul', { class: 'strip' }, items.map((s) => h('li', {}, h('span', { class: 'k' }, s.label), ' ', h('span', { class: 'num' }, s.value)))),
        h('p', { class: 'note' }, spec.howToRead),
        h('table', { class: 'stack-table' }, h('caption', {}, spec.axis.title, ': ', spec.axis.min.label, ' to ', spec.axis.max.label), h('tbody', {}, rows)),
        spec.marks.some((m) => !m.drawRect) ? h('p', { class: 'note' }, TEXTS['UI.graph.nodraw.zero']) : null,
    ];
}
export function panelSourceNode(spec) {
    if (!spec)
        return null;
    const last = spec.strip[spec.strip.length - 1];
    return h('p', { class: 'source-line' }, h('span', { class: 'k' }, last.label, ': '), h('span', { class: 'src' }, last.value));
}
function row(name, valueNodes, working, extra) {
    return h('li', { class: 'result-row' }, h('div', { class: 'line' }, h('span', { class: 'k' }, name), ' ', valueNodes), extra || null, h('details', {}, h('summary', {}, TEXTS['UI.working']), h('div', { class: 'working num' }, working.map((w) => h('p', {}, w)), h('p', {}, TEXTS['A280-IN-11.W-8']))));
}
export function resultsListNode(res, ctx) {
    if (res.status !== 'result')
        return null;
    const c = res.constants;
    const opLine = (o) => h('span', { class: 'v num' }, o.text);
    const rows = [];
    rows.push(row('', opLine(res.operands[0]), [`${c.a280} × ${c.dilA280} = ${res.a280Neat.display}`]));
    rows.push(row('', opLine(res.operands[1]), [`${c.amax} × ${c.dilAmax} = ${res.amaxNeat.display}`], h('p', { class: 'note' }, res.assumption)));
    rows.push(row('', opLine(res.operands[2]), [`${res.amaxNeat.display} × ${c.cf} = ${res.dyeTerm.display}`]));
    rows.push(row(TEXTS['UI.row.corrected'], h('span', { class: 'v num' }, res.correctedA280.display, ' ', unitSpan(TEXTS['UNIT.au'])), [`${res.a280Neat.display} − ${res.dyeTerm.display} = ${res.correctedA280.display}`]));
    rows.push(row(TEXTS['UI.row.protein'], h('span', { class: 'v num' }, res.proteinMolar.display), [`${res.correctedA280.display} / (${c.epsProtein} × ${c.path}) = ${res.proteinMolar.display}`]
        .concat(ctx && ctx.exampleInUse ? [TEXTS['A280-IN-12.note']] : [])));
    if (res.proteinMgPerMl) {
        rows.push(row(TEXTS['A280-OU-01.mgml'], h('span', { class: 'v num' }, res.proteinMgPerMl.display, ' ', unitSpan(TEXTS['UNIT.mgml'])), [TEXTS['A280-OU-03.mgml'].replace('[MW]', res.mw), `${res.proteinMgPerMl.display} ${TEXTS['UNIT.mgml']}`]));
    }
    else {
        const withheld = res.withheld.proteinMgPerMl === 'RF-09';
        rows.push(h('li', { class: 'result-row' }, h('div', { class: 'line' }, h('span', { class: 'k' }, TEXTS['A280-OU-01.mgml']), ' ', h('span', { class: 'v' }, withheld ? TEXTS['UI.row.mgml.withheld'] : TEXTS['A280-IN-09.hint']))));
    }
    rows.push(row(TEXTS['UI.row.dye'], h('span', { class: 'v num' }, res.dyeMolar.display), [`${res.amaxNeat.display} / (${c.epsDye} × ${c.path}) = ${res.dyeMolar.display}`]));
    rows.push(row(TEXTS['UI.row.dol'], h('span', { class: 'v num' }, res.dol.display), [`${res.dyeMolar.display} / ${res.proteinMolar.display} = ${res.dol.display}`]));
    return h('div', { class: 'results-body' }, h('ol', { class: 'results' }, rows), h('p', { class: 'note' }, TEXTS['A280-DT-09']), h('p', { class: 'source-line' }, h('span', { class: 'k' }, labelOf('epsProteinSource'), ': '), h('span', { class: 'src' }, c.epsProteinSource)));
}
export function fl04Node(declKey, source) {
    if ((declKey !== 'measured' && declKey !== 'notMeasured') || source === '')
        return null;
    const decl = declKey === 'measured' ? TEXTS['A280-IN-11.W-6.measured'] : TEXTS['A280-IN-11.W-6.notMeasured'];
    return h('p', { class: 'help' }, TEXTS['A280-FL-04.a'], decl, TEXTS['A280-FL-04.b'], h('span', { class: 'src' }, source), TEXTS['A280-FL-04.c']);
}
export function roundingPairNode() {
    const t = TEXTS['A280-OU-04'];
    return h('div', { class: 'static-block' }, h('h3', {}, TEXTS['A280-OU-04.heading']), h('div', { class: 'pair' }, h('div', { class: 'card' }, h('div', { class: 'k' }, t.unroundedLabel), h('div', { class: 'v num' }, t.unrounded), h('div', { class: 'k' }, `prints ${t.unroundedPrints}`)), h('div', { class: 'card' }, h('div', { class: 'k' }, `${t.roundedLabel} ${t.roundedMolar} M`), h('div', { class: 'v num' }, t.rounded), h('div', { class: 'k' }, `prints ${t.roundedPrints}`))), h('p', { class: 'note' }, t.caption), h('p', {}, t.sentence));
}
export function errorTableNode() {
    const t = TEXTS['A280-OU-05'];
    const rows = [h('tr', {}, h('th', { scope: 'row' }, t.correctLabel), h('td', { class: 'num' }, t.correctDol), h('td', { class: 'num' }, t.correctRatio))]
        .concat(t.rows.map((r) => h('tr', {}, h('th', { scope: 'row' }, r.label), h('td', { class: 'num' }, r.dol), h('td', { class: 'num' }, r.ratio))));
    return h('div', { class: 'static-block' }, h('h3', {}, TEXTS['A280-OU-05.heading']), h('p', {}, TEXTS['A280-OU-05.premise']), h('p', {}, `Corrected A280 ${t.correctedA280}; protein ${t.proteinMolar} M.`), h('p', { class: 'note' }, t.caption), h('div', { class: 'table-wrap' }, h('table', { class: 'stack-table' }, h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, TEXTS['UI.table.where']), h('th', { scope: 'col' }, TEXTS['UI.table.dol']), h('th', { scope: 'col' }, TEXTS['UI.table.wrongby']))), h('tbody', {}, rows))));
}
export function constantsTableNode() {
    const rows = DYES.map((d) => h('tr', {}, h('th', { scope: 'row' }, d.name), h('td', { class: 'num', 'data-label': TEXTS['UI.table.lambda'] }, d.lambdaMax), h('td', { class: 'num', 'data-label': TEXTS['UI.table.eps'] }, d.epsShown), h('td', { class: 'num', 'data-label': TEXTS['UI.table.cf'] }, d.cf), h('td', { 'data-label': TEXTS['UI.table.source'] }, d.source)));
    return h('div', { class: 'table-wrap' }, h('table', { class: 'stack-table' }, h('caption', {}, TEXTS['A280-OU-07.caption'], ' ', TEXTS['A280-FL-02']), h('thead', {}, h('tr', {}, [TEXTS['UI.table.dye'], TEXTS['UI.table.lambda'], TEXTS['UI.table.eps'], TEXTS['UI.table.cf'], TEXTS['UI.table.source']].map((t) => h('th', { scope: 'col' }, t)))), h('tbody', {}, rows)));
}
export const notDoNode = () => h('ul', {}, TEXTS['A280-OU-09'].map((s) => h('li', {}, s)));
export function legendRowsNode() {
    const rows = [['FL-01', TEXTS['A280-FL-01']], ['FL-02', TEXTS['A280-FL-02']], ['FL-03', TEXTS['A280-FL-03']], ['FL-04', TEXTS['A280-FL-04.legend']], ['FL-06', TEXTS['A280-FL-06']]];
    return rows.map(([c, t]) => h('tr', {}, h('td', {}, c), h('td', {}, t)));
}
export function dyeEchoNode(d) {
    if (!d)
        return null;
    return h('p', { class: 'dye-echo num' }, `${TEXTS['LABEL.lambdaMax']} ${d.lambdaMax} ${TEXTS['UNIT.lambdaMax']}; ${TEXTS['LABEL.epsDye']} ${d.epsShown} ${TEXTS['UNIT.epsDye']}; ${TEXTS['LABEL.cf']} ${d.cf}; ${d.source}`);
}
export function bannerText(n, labels) {
    return TEXTS['UI.example.banner.pre'] + n + TEXTS['UI.example.banner.mid'] + labels.join(', ') + TEXTS['UI.example.banner.post'];
}
