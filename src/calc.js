import { R, mul, div, sub, cmp, display } from './engine/core.js';
import { molarToMass } from './engine/e10/index.js';
import { ENGINE_VERSION } from './engine/version.js';
import { dyeByKey, OTHER_DYE } from './constants.js';
import { TEXTS, BENCH_ORDER, labelOf } from './texts.js';
import { scanNumber, normaliseSourceString, sourceLength, SOURCE_MAX_CODE_POINTS } from './scan.js';
const ZERO = R(0);
const ONE = R(1);
const TWO = R(2);
const exactOfRat = (r) => ({ num: r.n.toString(), den: r.d.toString() });
export function formatValue(mode, r) {
    const ex = exactOfRat(r);
    if (mode === 'sci3')
        return display('sci3', ex);
    const sci = display('sci3', ex);
    const at = sci.indexOf('^');
    if (at >= 0 && parseInt(sci.slice(at + 1), 10) >= 3)
        return sci;
    return display('sig3', ex);
}
const makeField = (r, mode) => ({ exact: exactOfRat(r), display: formatValue(mode, r) });
export const exactOf = (f) => ({ n: BigInt(f.exact.num), d: BigInt(f.exact.den) });
export const RESULT_FIELDS = Object.freeze([
    'a280Neat', 'amaxNeat', 'dyeTerm', 'correctedA280', 'proteinMolar', 'dyeMolar', 'dol', 'proteinMgPerMl',
]);
const fillField = (t, k) => t.replace('[Field]', labelOf(k));
const NUMERIC_ALWAYS = ['a280', 'dilA280', 'amax', 'dilAmax', 'epsProtein', 'path'];
const NUMERIC_OTHER = ['lambdaMax', 'epsDye', 'cf'];
export function compute(inputs, deps = { molarToMass }) {
    const i = inputs || {};
    const isOther = i.dye === OTHER_DYE;
    const row = isOther ? null : dyeByKey(i.dye);
    const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
    const scan = {};
    for (const k of NUMERIC_ALWAYS)
        scan[k] = scanNumber(i[k]);
    if (isOther)
        for (const k of NUMERIC_OTHER)
            scan[k] = scanNumber(i[k]);
    else if (row) {
        scan.lambdaMax = scanNumber(row.lambdaMax);
        scan.epsDye = scanNumber(row.eps);
        scan.cf = scanNumber(row.cf);
    }
    scan.mw = scanNumber(i.mw);
    const epsSource = normaliseSourceString(str(i.epsProteinSource));
    const dyeSource = isOther ? normaliseSourceString(str(i.dyeSource)) : '';
    const missing = [];
    for (const k of BENCH_ORDER) {
        if (k === 'mw')
            continue;
        if (k === 'dye') {
            if (!row && !isOther)
                missing.push(k);
            continue;
        }
        if (k === 'epsDecl') {
            if (i.epsDecl !== 'measured' && i.epsDecl !== 'notMeasured')
                missing.push(k);
            continue;
        }
        if (k === 'epsProteinSource') {
            if (epsSource === '')
                missing.push(k);
            continue;
        }
        if (k === 'dyeSource') {
            if (isOther && dyeSource === '')
                missing.push(k);
            continue;
        }
        if (['lambdaMax', 'epsDye', 'cf'].includes(k) && !isOther)
            continue;
        if (scan[k] && scan[k].state === 'empty')
            missing.push(k);
    }
    const fields = {};
    const msg = (code, k) => {
        let text = fillField(TEXTS[`A280-${code}`], k);
        if (code === 'RF-07' && (k === 'dilA280' || k === 'dilAmax'))
            text += TEXTS['A280-RF-07.dilution'];
        return { code, field: k, text };
    };
    for (const k of BENCH_ORDER) {
        const s = scan[k];
        const f = { scan: s || null, messages: [], flagFL01: false };
        if (s && (k !== 'epsDye' && k !== 'cf' && k !== 'lambdaMax' || isOther)) {
            if (s.state === 'RF-07')
                f.messages.push(msg('RF-07', k));
            else if (s.state === 'RF-11')
                f.messages.push(msg('RF-11', k));
            else if (s.state === 'ok') {
                const v = s.value;
                if ((k === 'dilA280' || k === 'dilAmax') && cmp(v, ONE) < 0)
                    f.messages.push(msg('RF-02', k));
                if (k === 'path' && cmp(v, ZERO) <= 0)
                    f.messages.push({ code: 'RF-03', field: k, text: TEXTS['A280-RF-03'] });
                if ((k === 'epsProtein' || k === 'epsDye') && cmp(v, ZERO) <= 0)
                    f.messages.push(msg('RF-04', k));
                if (k === 'cf' && cmp(v, ZERO) < 0)
                    f.messages.push({ code: 'RF-05', field: k, text: TEXTS['A280-RF-05'] });
                if ((k === 'a280' || k === 'amax') && cmp(v, ZERO) < 0)
                    f.messages.push(msg('RF-06', k));
                if (k === 'mw' && cmp(v, ZERO) <= 0)
                    f.messages.push({ code: 'RF-09', field: k, text: TEXTS['A280-RF-09'] });
                if ((k === 'a280' || k === 'amax') && cmp(v, TWO) > 0)
                    f.flagFL01 = true;
            }
        }
        if ((k === 'epsProteinSource' && sourceLength(epsSource) > SOURCE_MAX_CODE_POINTS)
            || (k === 'dyeSource' && isOther && sourceLength(dyeSource) > SOURCE_MAX_CODE_POINTS))
            f.messages.push(msg('RF-12', k));
        fields[k] = f;
    }
    const flags = [];
    for (const k of ['a280', 'amax']) {
        if (fields[k].flagFL01)
            flags.push({ code: 'FL-01', field: k, text: TEXTS['A280-FL-01'] });
    }
    const msgsOf = (codes) => BENCH_ORDER.flatMap((k) => fields[k].messages.filter((m) => codes.includes(m.code)));
    const step2 = msgsOf(['RF-07', 'RF-11', 'RF-12']);
    const step3 = msgsOf(['RF-02', 'RF-03', 'RF-04', 'RF-05', 'RF-06']);
    const rf09 = msgsOf(['RF-09']);
    const blocked = missing.length > 0 || step2.length > 0 || step3.length > 0;
    const base = { fields, flags, missing, engine: { package: '@ligant/bench-engines', version: ENGINE_VERSION } };
    const nulls = (code, keep = {}) => {
        const out = {};
        const withheld = {};
        for (const k of RESULT_FIELDS) {
            out[k] = keep[k] || null;
            if (!keep[k])
                withheld[k] = code;
        }
        return { ...out, withheld };
    };
    if (blocked) {
        const panel = [];
        if (missing.length) {
            panel.push({
                code: 'RF-08', fields: missing.slice(),
                text: TEXTS['A280-RF-08.pre'] + missing.map(labelOf).join(', ') + TEXTS['A280-RF-08.post'],
            });
        }
        panel.push(...step2, ...step3, ...rf09);
        const code = panel[0].code;
        return {
            ...base, status: 'blocked', code, panel, operands: null, assumption: null, constants: null, ...nulls(code),
        };
    }
    const num = {};
    for (const k of Object.keys(scan))
        if (scan[k].state === 'ok')
            num[k] = scan[k].value;
    const a280Neat = mul(num.a280, num.dilA280);
    const amaxNeat = mul(num.amax, num.dilAmax);
    const dyeTerm = mul(amaxNeat, num.cf);
    const echo = (k) => scan[k].text;
    const dyeShown = row ? row.name : TEXTS['UI.dye.other'];
    const operands = [
        { id: 'a280', text: `A280 used: ${formatValue('sig3', a280Neat)} AU (reading ${echo('a280')} × dilution ${echo('dilA280')})` },
        { id: 'amax', text: `Dye maximum used: ${formatValue('sig3', amaxNeat)} AU (reading ${echo('amax')} × dilution ${echo('dilAmax')})` },
        { id: 'dyeShare', text: `Dye share at 280 nm: ${formatValue('sig3', dyeTerm)} AU (dye maximum used × CF ${echo('cf')})` },
    ];
    if (cmp(a280Neat, dyeTerm) <= 0) {
        const code = 'RF-01';
        return {
            ...base,
            status: 'refused', code, panel: [{ code, text: TEXTS['A280-RF-01'] }], operands, assumption: null, constants: null,
            ...nulls(code, {
                a280Neat: makeField(a280Neat, 'sig3'), amaxNeat: makeField(amaxNeat, 'sig3'), dyeTerm: makeField(dyeTerm, 'sig3'),
            }),
        };
    }
    const correctedA280 = sub(a280Neat, dyeTerm);
    const proteinMolar = div(correctedA280, mul(num.epsProtein, num.path));
    const dyeMolar = div(amaxNeat, mul(num.epsDye, num.path));
    const dol = div(dyeMolar, proteinMolar);
    const out = {
        ...base,
        status: 'result', code: null, panel: [], operands,
        a280Neat: makeField(a280Neat, 'sig3'),
        amaxNeat: makeField(amaxNeat, 'sig3'),
        dyeTerm: makeField(dyeTerm, 'sig3'),
        correctedA280: makeField(correctedA280, 'sig3'),
        proteinMolar: makeField(proteinMolar, 'sci3'),
        dyeMolar: makeField(dyeMolar, 'sci3'),
        dol: makeField(dol, 'sig3'),
        proteinMgPerMl: null,
        withheld: {},
        assumption: TEXTS['A280-IN-05.assumption.pre'] + echo('lambdaMax') + TEXTS['A280-IN-05.assumption.post'],
        constants: {
            dye: dyeShown,
            lambdaMax: echo('lambdaMax'),
            epsDye: echo('epsDye'),
            cf: echo('cf'),
            dyeSource: row ? row.source : dyeSource,
            epsProtein: echo('epsProtein'),
            epsDecl: i.epsDecl === 'measured' ? TEXTS['A280-IN-11.W-6.measured'] : TEXTS['A280-IN-11.W-6.notMeasured'],
            epsProteinSource: epsSource,
            path: echo('path'),
            dilA280: echo('dilA280'),
            dilAmax: echo('dilAmax'),
            a280: echo('a280'),
            amax: echo('amax'),
        },
    };
    if (num.amax.n === 0n)
        flags.push({ code: 'FL-06', field: 'amax', text: TEXTS['A280-FL-06'] });
    if (scan.mw.state === 'ok') {
        if (cmp(num.mw, ZERO) <= 0) {
            out.withheld.proteinMgPerMl = 'RF-09';
        }
        else {
            const e = deps.molarToMass('1', 'M', scan.mw.text, 'mg/mL');
            if (e.status === 'result') {
                const ex = { n: BigInt(e.exact.num), d: BigInt(e.exact.den) };
                out.proteinMgPerMl = makeField(mul(proteinMolar, ex), 'sci3');
                out.mw = scan.mw.text;
                out.mwFactorExact = e.exact;
            }
            else {
                out.withheld.proteinMgPerMl = 'RF-09';
            }
        }
    }
    return out;
}
export { cmp };
