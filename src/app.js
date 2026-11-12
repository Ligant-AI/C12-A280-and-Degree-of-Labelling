import { compute } from './calc.js';
import { buildChartSpec } from './chart-spec.js';
import { DYES, OTHER_DYE, dyeByKey } from './constants.js';
import { TEXTS, BENCH_ORDER, labelOf } from './texts.js';
import { normaliseSourceString } from './scan.js';
import { bindSourceField, storedSourceValue } from './source-field.js';
import { EXAMPLES, EXAMPLE_MARKED } from './examples.js';
import { ENGINE_VERSION } from './engine/version.js';
import vendored from './engine/VENDORED.json';
import { version as TOOL_VERSION } from '../package.json';
import { buildRecord, toJson, toCsv, toNotebookText } from './export.js';
import { faqItems } from './structured.js';
import { textOf, messageNodes, isInvalid, resultStateNode, graphMountNodes, panelSourceNode, resultsListNode, fl04Node, roundingPairNode, errorTableNode, constantsTableNode, notDoNode, legendRowsNode, dyeEchoNode, bannerText, } from './render.js';
const VALUE_FIELDS = ['a280', 'dilA280', 'dye', 'lambdaMax', 'epsDye', 'cf', 'dyeSource', 'amax', 'dilAmax',
    'epsProtein', 'epsProteinSource', 'path', 'mw'];
const SOURCE_FIELDS = ['dyeSource', 'epsProteinSource'];
const byId = (id) => document.getElementById(id);
const setText = (id, t) => { const el = byId(id); if (el)
    el.textContent = t; };
function build(n) {
    if (typeof n === 'string')
        return document.createTextNode(n);
    const el = document.createElement(n.tag);
    for (const [k, v] of Object.entries(n.attrs))
        el.setAttribute(k, v);
    for (const kid of n.kids)
        el.appendChild(build(kid));
    return el;
}
const mountEl = (el, nodes) => el.replaceChildren(...nodes.filter(Boolean).map(build));
const mount = (id, nodes) => mountEl(byId(id), nodes);
let marks = new Set();
let loadedN = 0;
let announceTimer = null;
function readInputs() {
    const v = {};
    for (const k of VALUE_FIELDS)
        v[k] = byId(`f-${k}`).value;
    const picked = document.querySelector('input[name="epsDecl"]:checked');
    v.epsDecl = picked ? picked.value : '';
    return v;
}
function writeInputs(set) {
    for (const k of VALUE_FIELDS) {
        const v = set[k] || '';
        byId(`f-${k}`).value = SOURCE_FIELDS.includes(k) ? storedSourceValue(v) : v;
    }
    for (const r of document.querySelectorAll('input[name="epsDecl"]'))
        r.checked = (r.value === set.epsDecl);
}
function announce(res, now) {
    const say = () => {
        mount('live-announce', [res.status === 'result'
                ? `${TEXTS['UI.dol.card']}: ${res.dol.display}. ${TEXTS['UI.protein.card']}: ${res.proteinMolar.display}.`
                : textOf(resultStateNode(res))]);
    };
    clearTimeout(announceTimer);
    if (now)
        say();
    else
        announceTimer = setTimeout(say, 800);
}
function render(now) {
    const inputs = readInputs();
    const res = compute(inputs);
    byId('dye-other').hidden = inputs.dye !== OTHER_DYE;
    mount('dye-echo', [dyeEchoNode(dyeByKey(inputs.dye))]);
    for (const k of [...VALUE_FIELDS, 'epsDecl']) {
        mount(`msg-${k}`, messageNodes(res, k));
        const input = byId(`f-${k}`);
        if (input)
            input.setAttribute('aria-invalid', isInvalid(res, k) ? 'true' : 'false');
    }
    mount('fl04', [fl04Node(inputs.epsDecl, normaliseSourceString(inputs.epsProteinSource))]);
    const spec = buildChartSpec(res);
    mount('r4-state', [resultStateNode(res)]);
    mount('graph-38', graphMountNodes(res, spec));
    mount('r4-source', [panelSourceNode(spec)]);
    mount('r5-body', [resultsListNode(res, { exampleInUse: marks.size > 0 })]);
    for (const k of EXAMPLE_MARKED)
        byId(`mark-${k}`).hidden = !marks.has(k);
    const labels = BENCH_ORDER.filter((k) => marks.has(k)).map(labelOf);
    const banner = byId('example-banner');
    banner.hidden = labels.length === 0;
    banner.textContent = labels.length ? bannerText(loadedN, labels) : '';
    const status = byId('r4-status');
    status.hidden = labels.length === 0;
    status.textContent = labels.length ? TEXTS['UI.example.head'] : '';
    announce(res, now);
}
function loadExample(n, silent) {
    loadedN = n;
    writeInputs(EXAMPLES[n]);
    marks = new Set(EXAMPLE_MARKED);
    setText('example-status', silent ? '' : TEXTS[`UI.example.status.${n}`]);
    render(true);
}
function clearAll() {
    loadedN = 0;
    writeInputs({});
    marks = new Set();
    setText('example-status', TEXTS['UI.example.status.clear']);
    render(true);
}
function focusNext(el) {
    const all = [...document.querySelectorAll('#main input[type="text"], #main textarea, #main select')]
        .filter((x) => !x.closest('[hidden]'));
    const at = all.indexOf(el);
    if (at >= 0 && at + 1 < all.length)
        all[at + 1].focus();
}
function fillStatic() {
    const sel = byId('f-dye');
    sel.add(new Option(TEXTS['UI.dye.choose'], ''));
    for (const d of DYES)
        sel.add(new Option(d.name, d.key));
    sel.add(new Option(TEXTS['UI.dye.other'], OTHER_DYE));
    for (const el of document.querySelectorAll('[data-t]'))
        el.textContent = TEXTS[el.getAttribute('data-t')];
    for (const el of document.querySelectorAll('[data-u]'))
        el.textContent = ` (${TEXTS[el.getAttribute('data-u')]})`;
    for (const k of EXAMPLE_MARKED)
        setText(`mark-${k}`, TEXTS['UI.example.mark']);
    setText('engine-line', `Engine: @ligant/bench-engines ${ENGINE_VERSION}, commit ${vendored.commit}.`);
    mount('constants-table', [constantsTableNode()]);
    mount('notdo-list', [notDoNode()]);
    mount('static-pair', [roundingPairNode()]);
    mount('static-error', [errorTableNode()]);
    mountEl(byId('flags-legend').querySelector('tbody'), legendRowsNode());
    fillFaq();
}
function fillFaq() {
    const list = byId('faq-list');
    list.replaceChildren(...faqItems().flatMap((i) => {
        const d = document.createElement('details');
        d.className = 'why';
        const s = document.createElement('summary');
        s.textContent = i.question;
        const p = document.createElement('p');
        p.className = 'help';
        p.textContent = i.answer;
        d.append(s, p);
        return [d];
    }));
}
function download(name, mime, text) {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportAs(kind) {
    const inputs = readInputs();
    const rec = buildRecord(inputs, compute(inputs), {
        marks, loadedN,
        meta: {
            toolVersion: TOOL_VERSION, date: new Date().toISOString().slice(0, 10),
            engine: { package: '@ligant/bench-engines', version: ENGINE_VERSION, commit: vendored.commit },
        },
    });
    if (kind === 'json')
        download('a280-dol.json', 'application/json', toJson(rec));
    else if (kind === 'csv')
        download('a280-dol.csv', 'text/csv', toCsv(rec));
    else
        download('a280-dol.txt', 'text/plain', toNotebookText(rec));
}
export function start() {
    fillStatic();
    for (const k of VALUE_FIELDS) {
        const el = byId(`f-${k}`);
        const isSelect = el.tagName === 'SELECT';
        if (SOURCE_FIELDS.includes(k)) {
            el.addEventListener('input', () => { if (EXAMPLE_MARKED.includes(k))
                marks.delete(k); });
            bindSourceField(el, { onInput: () => render(false), onSettled: () => render(true) });
        }
        else {
            el.addEventListener('input', () => {
                if (EXAMPLE_MARKED.includes(k))
                    marks.delete(k);
                render(false);
            });
            el.addEventListener('blur', () => render(true));
        }
        if (isSelect) {
            el.addEventListener('change', () => { marks.delete(k); render(false); });
        }
        else {
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    focusNext(el);
                }
            });
        }
    }
    for (const r of document.querySelectorAll('input[name="epsDecl"]')) {
        const pick = () => { marks.delete('epsDecl'); render(false); };
        r.addEventListener('click', pick);
        r.addEventListener('change', pick);
    }
    byId('ex-1').addEventListener('click', () => loadExample(1, false));
    byId('ex-2').addEventListener('click', () => loadExample(2, false));
    byId('ex-clear').addEventListener('click', clearAll);
    byId('x-json').addEventListener('click', () => exportAs('json'));
    byId('x-csv').addEventListener('click', () => exportAs('csv'));
    byId('x-text').addEventListener('click', () => exportAs('text'));
    loadExample(1, true);
}
