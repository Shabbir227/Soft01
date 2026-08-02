/* =========================================================================
   state.js — single shared source of truth for the whole app.

   Every view module (coa.js, coa-define.js, main-define.js, sub-define.js,
   customer-define.js, supplier-define.js, general-entry.js) reads and
   writes these same arrays, so data stays in sync across screens without
   any extra plumbing.

   Nothing here is persisted yet — it all lives in memory and resets on
   page reload. Swap the TODO-marked spots for real API calls once you
   have a backend.
   ========================================================================= */

// ---- working copies (mutable) --------------------------------------------
let accounts = ACCOUNTS.map(a => ({ ...a }));
let mainMappings = MAIN_MAPPINGS.map(m => ({ ...m }));
let subMappings = SUB_MAPPINGS.map(s => ({ ...s }));
const natures = NATURES; // fixed list: Asset / Equity / Liability / Income / Expense

let customers = [];   // { code, name, accountCode }
let suppliers = [];   // { code, name, accountCode }
let vouchers = [];    // { id, date, narration, lines:[{accountCode, accountTitle, description, debit, credit}] }

// ---- DOM helpers -----------------------------------------------------------
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const pad2 = n => String(n).padStart(2, '0');

// ---- lookups ---------------------------------------------------------------
function natureName(code){ return (natures.find(n => n.code === code) || {}).name || ''; }
function mainByCode(code){ return mainMappings.find(m => m.code === code); }
function subByCode(code){ return subMappings.find(s => s.code === code); }
function accountByCode(code){ return accounts.find(a => a.code === code); }
function customerByCode(code){ return customers.find(c => c.code === code); }
function supplierByCode(code){ return suppliers.find(s => s.code === code); }
function voucherById(id){ return vouchers.find(v => v.id === id); }

// ---- toast -------------------------------------------------------------
function toast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.remove('show'), 2400);
}

// ---- modal open/close (shared by every modal in the app) ------------------
function openModal(id){ $('#' + id).classList.add('open'); }
function closeModal(id){ $('#' + id).classList.remove('open'); }
document.addEventListener('click', e => {
  if (e.target.matches('[data-close]')) closeModal(e.target.getAttribute('data-close'));
  if (e.target.classList.contains('modal-backdrop')) e.target.classList.remove('open');
});

// ---- shared confirm-delete modal -------------------------------------------
let _confirmAction = null;
function confirmDelete(text, action){
  $('#confirm-text').textContent = text;
  _confirmAction = action;
  openModal('confirm-modal');
}
$('#confirm-delete-btn').addEventListener('click', () => {
  if (_confirmAction) _confirmAction();
  closeModal('confirm-modal');
  _confirmAction = null;
});

/* =========================================================================
   CODE GENERATION RULES
   ========================================================================= */

// Account Code = <NatureCode padded to 2 digits> - <next sequence number>.
// The next sequence number is (highest existing sequence number under that
// Nature) + 1. Example: Assets already run 01-1 .. 01-35 -> next is 01-36.
function nextAccountCode(natureCode){
  let maxSeq = 0;
  accounts.forEach(a => {
    if (a.natureCode !== natureCode) return;
    const seq = parseInt(a.code.split('-')[1], 10);
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
  });
  return `${pad2(natureCode)}-${maxSeq + 1}`;
}

function nextMainCode(){
  return mainMappings.reduce((max, m) => Math.max(max, m.code), 0) + 1;
}
function nextSubCode(){
  return subMappings.reduce((max, s) => Math.max(max, s.code), 0) + 1;
}

function nextEntityCode(list, prefix){
  let maxSeq = 0;
  list.forEach(item => {
    const seq = parseInt(String(item.code).split('-')[1], 10);
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
  });
  return `${prefix}-${String(maxSeq + 1).padStart(3, '0')}`;
}
function nextCustomerCode(){ return nextEntityCode(customers, 'CUST'); }
function nextSupplierCode(){ return nextEntityCode(suppliers, 'SUPP'); }

// Voucher Name = JV-<MMM>-<YY>-<sequence within that month, 2 digits>
// Sequence resets every month and is based on the voucher's own Date field,
// not the date it happens to be saved on.
function monthAbbr(dateStr){
  return new Date(dateStr + 'T00:00:00').toLocaleString('en-US', { month: 'short' }).toUpperCase();
}
function yearShort(dateStr){
  return String(new Date(dateStr + 'T00:00:00').getFullYear()).slice(-2);
}
function voucherPrefix(dateStr){
  return `JV-${monthAbbr(dateStr)}-${yearShort(dateStr)}-`;
}
function nextVoucherId(dateStr, excludeId){
  const prefix = voucherPrefix(dateStr);
  let maxSeq = 0;
  vouchers.forEach(v => {
    if (v.id === excludeId) return; // don't count the voucher being edited against itself
    if (!v.id.startsWith(prefix)) return;
    const seq = parseInt(v.id.slice(prefix.length), 10);
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
  });
  return `${prefix}${pad2(maxSeq + 1)}`;
}

// Builds <option> markup for every account, grouped by nature — reused by
// every dropdown that needs to pick a GL account (customer/supplier tagging,
// voucher lines).
function accountOptionsHtml(selectedCode){
  return natures.map(n => {
    const opts = accounts
      .filter(a => a.natureCode === n.code)
      .map(a => `<option value="${a.code}" ${a.code === selectedCode ? 'selected' : ''}>${a.code} — ${a.title}</option>`)
      .join('');
    return opts ? `<optgroup label="${n.name}">${opts}</optgroup>` : '';
  }).join('');
}
