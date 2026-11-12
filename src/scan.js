import { rat } from './engine/core.js';
export const TRIM_CODE_POINTS = Object.freeze([
    0x0009, 0x000a, 0x000b, 0x000c, 0x000d, 0x0020, 0x00a0, 0x1680,
    0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a,
    0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff,
]);
const TRIM_SET = new Set(TRIM_CODE_POINTS);
export const MAX_ENTRY_LENGTH = 32;
export function isTrimmed(codeUnit) { return TRIM_SET.has(codeUnit); }
export function trim25(s) {
    let a = 0;
    let b = s.length;
    while (a < b && TRIM_SET.has(s.charCodeAt(a)))
        a++;
    while (b > a && TRIM_SET.has(s.charCodeAt(b - 1)))
        b--;
    return a === 0 && b === s.length ? s : s.slice(a, b);
}
export function allTrimmed(s) {
    for (let i = 0; i < s.length; i++)
        if (!TRIM_SET.has(s.charCodeAt(i)))
            return false;
    return true;
}
export const LINE_BREAK_CODE_POINTS = Object.freeze([0x000a, 0x000d, 0x000b, 0x000c, 0x0085, 0x2028, 0x2029]);
const BREAK_SET = new Set(LINE_BREAK_CODE_POINTS);
const STRIP_RANGES = Object.freeze([
    [0x0000, 0x0008], [0x000e, 0x001f], [0x007f, 0x007f], [0x0080, 0x0084], [0x0086, 0x009f],
    [0x202a, 0x202e], [0x2066, 0x2069], [0x200e, 0x200f], [0x061c, 0x061c],
]);
export const STRIP_CODE_POINTS = Object.freeze(STRIP_RANGES.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i)));
const STRIP_SET = new Set(STRIP_CODE_POINTS);
export const SOURCE_MAX_CODE_POINTS = 1000;
export const sourceLength = (s) => [...s].length;
export function normaliseSourceString(s) {
    let broken = '';
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c === 0x0d && s.charCodeAt(i + 1) === 0x0a) {
            broken += ' ';
            i++;
            continue;
        }
        broken += BREAK_SET.has(c) ? ' ' : s[i];
    }
    let out = '';
    for (let i = 0; i < broken.length; i++)
        if (!STRIP_SET.has(broken.charCodeAt(i)))
            out += broken[i];
    return trim25(out);
}
export function scanNumber(raw) {
    const text = trim25(typeof raw === 'string' ? raw : raw == null ? '' : String(raw));
    const n = text.length;
    if (n === 0)
        return { state: 'empty', text };
    let i = 0;
    let neg = false;
    if (text.charCodeAt(0) === 0x2d) {
        neg = true;
        i = 1;
    }
    let digits = 0;
    let dot = -1;
    for (; i < n; i++) {
        const c = text.charCodeAt(i);
        if (c >= 0x30 && c <= 0x39)
            digits++;
        else if (c === 0x2e && dot < 0)
            dot = i;
        else
            return { state: 'RF-07', text };
    }
    if (digits === 0)
        return { state: 'RF-07', text };
    if (n > MAX_ENTRY_LENGTH)
        return { state: 'RF-11', text };
    const start = neg ? 1 : 0;
    const body = dot < 0 ? text.slice(start) : text.slice(start, dot) + text.slice(dot + 1);
    const fracLen = dot < 0 ? 0 : n - dot - 1;
    const num = BigInt(body);
    const value = rat(neg ? -num : num, 10n ** BigInt(fracLen));
    return { state: 'ok', text: value.n === 0n ? '0' : text, value };
}
