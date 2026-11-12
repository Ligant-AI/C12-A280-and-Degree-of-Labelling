import { normaliseSourceString } from './scan.js';
export const storedSourceValue = (raw) => normaliseSourceString(typeof raw === 'string' ? raw : raw == null ? '' : String(raw));
export function settleSource(el) {
    const s = normaliseSourceString(el.value);
    if (s !== el.value)
        el.value = s;
}
const isTyping = (t) => t === 'insertText' || (typeof t === 'string' && t.startsWith('delete'));
export function bindSourceField(el, hooks) {
    el.addEventListener('input', (e) => {
        if (!isTyping(e.inputType || ''))
            settleSource(el);
        hooks.onInput();
    });
    const settle = () => { settleSource(el); hooks.onSettled(); };
    el.addEventListener('change', settle);
    el.addEventListener('blur', settle);
}
