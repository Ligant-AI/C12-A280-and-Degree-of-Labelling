import { TEXTS, BENCH_ORDER, labelOf } from './texts.js';
import { DYES, dyeByKey, OTHER_DYE } from './constants.js';
import { normaliseSourceString } from './scan.js';
const L = TEXTS['EXPORT.labels'];
const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const UNIT_KEY = {
    a280: 'UNIT.a280', amax: 'UNIT.amax', lambdaMax: 'UNIT.lambdaMax', epsDye: 'UNIT.epsDye', epsProtein: 'UNIT.epsProtein',
    path: 'UNIT.path', mw: 'UNIT.mw',
};
const RESULT_ORDER = ['a280Neat', 'amaxNeat', 'dyeTerm', 'correctedA280', 'proteinMolar', 'proteinMgPerMl', 'dyeMolar', 'dol'];
const RESULT_NAME = {
    a280Neat: TEXTS['EXPORT.result.a280Neat'], amaxNeat: TEXTS['EXPORT.result.amaxNeat'], dyeTerm: TEXTS['EXPORT.result.dyeTerm'],
    correctedA280: TEXTS['UI.row.corrected'], proteinMolar: TEXTS['UI.row.protein'], proteinMgPerMl: TEXTS['A280-OU-01.mgml'],
    dyeMolar: TEXTS['UI.row.dye'], dol: TEXTS['UI.row.dol'],
};
const RESULT_UNIT = {
    a280Neat: 'UNIT.au', amaxNeat: 'UNIT.au', dyeTerm: 'UNIT.au', correctedA280: 'UNIT.au', proteinMolar: 'UNIT.molar',
    proteinMgPerMl: 'UNIT.mgml', dyeMolar: 'UNIT.molar', dol: null,
};
function inputEntries(inputs, res) {
    const isOther = inputs.dye === OTHER_DYE;
    const row = isOther ? null : dyeByKey(inputs.dye);
    const dyeSource = row ? row.source : isOther ? (normaliseSourceString(str(inputs.dyeSource)) || null) : null;
    const out = [];
    for (const k of BENCH_ORDER) {
        if ((k === 'lambdaMax' || k === 'epsDye' || k === 'cf') && !row && !isOther)
            continue;
        if (k === 'dyeSource' && !isOther)
            continue;
        let value = null;
        let source = null;
        if (k === 'dye')
            value = row ? row.name : isOther ? TEXTS['UI.dye.other'] : null;
        else if (k === 'epsDecl') {
            value = inputs.epsDecl === 'measured' ? TEXTS['A280-IN-11.W-6.measured']
                : inputs.epsDecl === 'notMeasured' ? TEXTS['A280-IN-11.W-6.notMeasured'] : null;
        }
        else if (k === 'epsProteinSource')
            value = normaliseSourceString(str(inputs.epsProteinSource)) || null;
        else if (k === 'dyeSource')
            value = dyeSource;
        else {
            const s = res.fields[k] && res.fields[k].scan;
            value = s && s.state !== 'empty' ? s.text : null;
            if (k === 'lambdaMax' || k === 'epsDye' || k === 'cf')
                source = dyeSource;
        }
        out.push({ key: k, label: labelOf(k), value, unit: UNIT_KEY[k] ? TEXTS[UNIT_KEY[k]] : '', source });
    }
    return out;
}
function refusalText(res, code) {
    if (!code || code === 'RF-01')
        return null;
    const line = (res.panel || []).find((p) => p.code === code);
    if (line)
        return line.text;
    for (const k of BENCH_ORDER) {
        const m = res.fields[k] && res.fields[k].messages.find((x) => x.code === code);
        if (m)
            return m.text;
    }
    return null;
}
function resultEntries(res) {
    const out = [];
    for (const k of RESULT_ORDER) {
        const f = res[k];
        const code = f ? null : (res.withheld && res.withheld[k]) || null;
        const refusal = refusalText(res, code);
        out.push({
            key: k, label: RESULT_NAME[k], unit: RESULT_UNIT[k] ? TEXTS[RESULT_UNIT[k]] : '',
            display: f ? f.display : null,
            exact: f ? { num: f.exact.num, den: f.exact.den } : null,
            refusal,
            withheld: !f && !!code,
            note: !f && !code ? L.notDeclared : null,
        });
        if (k === 'dol' && f)
            out.push({ key: 'freeDyeStatement', statement: TEXTS['A280-FL-03'] });
    }
    return out;
}
function flagEntries(inputs, res) {
    const out = res.flags.map((f) => ({ code: f.code, field: labelOf(f.field) || null, text: f.text }));
    if (dyeByKey(inputs.dye))
        out.push({ code: 'FL-02', field: null, text: TEXTS['A280-FL-02'] });
    const source = normaliseSourceString(str(inputs.epsProteinSource));
    if ((inputs.epsDecl === 'measured' || inputs.epsDecl === 'notMeasured') && source !== '') {
        const decl = inputs.epsDecl === 'measured' ? TEXTS['A280-IN-11.W-6.measured'] : TEXTS['A280-IN-11.W-6.notMeasured'];
        out.push({ code: 'FL-04', field: null, text: TEXTS['A280-FL-04.a'] + decl + TEXTS['A280-FL-04.b'] + source + TEXTS['A280-FL-04.c'] });
    }
    return out.map((e, i) => ({ e, i })).sort((a, b) => (a.e.code < b.e.code ? -1 : a.e.code > b.e.code ? 1 : a.i - b.i)).map((x) => x.e);
}
export function buildRecord(inputs, res, ctx) {
    const marks = new Set(ctx.marks || []);
    const labels = BENCH_ORDER.filter((k) => marks.has(k)).map(labelOf);
    const meta = ctx.meta;
    return {
        schemaVersion: 1,
        title: TEXTS['EXPORT.title'],
        workedExample: labels.length && ctx.loadedN === 1 ? TEXTS['EXPORT.example.worked1'] : null,
        exampleLine: labels.length ? TEXTS['EXPORT.example.pre'] + labels.join(', ') : null,
        versions: {
            tool: { name: TEXTS['EXPORT.title'], version: meta.toolVersion },
            engine: { package: meta.engine.package, version: meta.engine.version, commit: meta.engine.commit },
            date: meta.date,
            constantsTable: {
                version: TEXTS['A280-OU-07.version'], date: TEXTS['A280-OU-07.date'], caption: TEXTS['A280-OU-07.caption'],
                rows: DYES.map((d) => ({ dye: d.name, lambdaMax: d.lambdaMax, epsilon: d.epsShown, cf: d.cf, source: d.source })),
            },
            constantsLine: TEXTS['EXPORT.constants.line'],
            citation: TEXTS['EXPORT.citation'],
        },
        status: res.status,
        inputs: inputEntries(inputs, res),
        operands: res.operands ? res.operands.map((o) => o.text) : null,
        assumption: res.assumption || null,
        results: resultEntries(res),
        withheld: Object.fromEntries(Object.entries(res.withheld || {}).map(([k, c]) => [k, refusalText(res, c)])),
        flags: flagEntries(inputs, res),
        roundingLine: TEXTS['A280-IN-11.W-8'],
        panel: res.status === 'blocked' ? res.panel.map((p) => p.text) : null,
        noResult: res.status === 'refused' ? TEXTS['EXPORT.noResult.pre'] + TEXTS['A280-RF-01'] : null,
    };
}
export const toJson = (record) => JSON.stringify(record, null, 2);
const GUARD = '=+-@\t\r';
export function csvCell(v) {
    let s = str(v);
    if (s.length > 0 && GUARD.includes(s[0]))
        s = `'${s}`;
    return `"${s.split('"').join('""')}"`;
}
const csvRow = (cells) => `${cells.map(csvCell).join(',')}\r\n`;
export function toCsv(record) {
    const rec = record;
    const rows = [[rec.title]];
    if (rec.workedExample)
        rows.push([rec.workedExample]);
    if (rec.exampleLine)
        rows.push([rec.exampleLine]);
    rows.push([TEXTS['EXPORT.csv.declared']]);
    rows.push([L.colSection, L.colItem, L.colValue, L.colUnit, L.colExact, L.colNote]);
    const R = (section, item, value, unit, exact, note) => rows.push([section, item, value, unit, exact, note]);
    const v = rec.versions;
    R(L.sectionVersions, L.tool, v.tool.version, '', '', v.tool.name);
    R(L.sectionVersions, L.engine, `${v.engine.package} ${v.engine.version}`, '', '', v.engine.commit);
    R(L.sectionVersions, L.date, v.date, '', '', '');
    R(L.sectionVersions, v.constantsLine, '', '', '', '');
    R(L.sectionVersions, L.citation, v.citation, '', '', '');
    for (const i of rec.inputs)
        R(L.sectionInputs, i.label, i.value == null ? '' : i.value, i.unit, '', i.source == null ? '' : i.source);
    if (rec.operands)
        for (const t of rec.operands)
            R(L.sectionOperands, t, '', '', '', '');
    for (const r of rec.results) {
        if (r.statement)
            R(L.sectionResults, r.statement, '', '', '', '');
        else
            R(L.sectionResults, r.label, r.display == null ? '' : r.display, r.unit, r.exact ? `${r.exact.num}/${r.exact.den}` : '', r.refusal || r.note || (r.withheld ? L.noValue : ''));
    }
    if (rec.assumption)
        R(L.sectionNotes, L.assumption, rec.assumption, '', '', '');
    for (const f of rec.flags)
        R(L.sectionFlags, f.code, f.text, '', '', f.field || '');
    R(L.sectionNotes, L.rounding, rec.roundingLine, '', '', '');
    if (rec.panel)
        for (const p of rec.panel)
            R(L.sectionStatus, p, '', '', '', '');
    if (rec.noResult)
        R(L.sectionStatus, rec.noResult, '', '', '', '');
    return rows.map(csvRow).join('');
}
export function toNotebookText(record) {
    const rec = record;
    const v = rec.versions;
    const out = [rec.title];
    if (rec.workedExample)
        out.push(rec.workedExample);
    if (rec.exampleLine)
        out.push(rec.exampleLine);
    out.push('', `${L.tool}: ${v.tool.version}`, `${L.engine}: ${v.engine.package} ${v.engine.version} (${v.engine.commit})`, `${L.date}: ${v.date}`, v.constantsLine, `${L.citation}: ${v.citation}`, '', L.sectionInputs);
    for (const i of rec.inputs) {
        out.push(`${i.label}: ${i.value == null ? L.notEntered : i.value}${i.value != null && i.unit ? ` ${i.unit}` : ''}${i.source ? ` (${L.source}: ${i.source})` : ''}`);
    }
    if (rec.operands)
        out.push('', L.sectionOperands, ...rec.operands);
    out.push('', L.sectionResults);
    for (const r of rec.results) {
        if (r.statement)
            out.push(r.statement);
        else if (r.display != null)
            out.push(`${r.label}: ${r.display}${r.unit ? ` ${r.unit}` : ''} (${L.colExact}: ${r.exact.num}/${r.exact.den})`);
        else
            out.push(`${r.label}: ${r.refusal ? `${L.noValue} (${r.refusal})` : r.withheld ? L.noValue : r.note}`);
    }
    if (rec.assumption)
        out.push(rec.assumption);
    if (rec.flags.length) {
        out.push('', L.sectionFlags);
        for (const f of rec.flags)
            out.push(`${f.code}: ${f.text}`);
    }
    out.push('', `${L.rounding}: ${rec.roundingLine}`);
    if (rec.panel) {
        out.push('', ...rec.panel);
    }
    if (rec.noResult)
        out.push('', rec.noResult);
    return `${out.join('\n')}\n`;
}
