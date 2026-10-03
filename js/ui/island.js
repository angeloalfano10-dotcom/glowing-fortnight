// Dynamic Island style confirmation: a black capsule that springs open at the top,
// says one short thing, and closes.

import { iconStr } from './icons.js';
import { esc } from '../lib/dom.js';

let node = null;
let host = null;
let timer = 0;

export function mountIsland(root) {
  host = root;
  node = document.createElement('div');
  node.className = 'island';
  node.setAttribute('role', 'status');
  node.setAttribute('aria-live', 'polite');
  root.append(node);
}

/** @param {string} text  @param {string} [ico] icon name */
export function island(text, ico = 'check', ms = 2600) {
  if (!node) return;
  node.innerHTML = `<span class="ii">${iconStr(ico)}</span><span class="it">${esc(text)}</span>`;
  node.classList.remove('on');
  void node.offsetWidth;
  node.classList.add('on');
  host.classList.add('island-on');
  clearTimeout(timer);
  timer = setTimeout(() => { node.classList.remove('on'); host.classList.remove('island-on'); }, ms);
}
