/* =========================================================================
   general-entry.js — View 7: General Entry (Journal Vouchers)

   - Each voucher has a header (date, narration) and 2+ debit/credit lines.
   - Voucher Name is auto-assigned as JV-<MMM>-<YY>-<seq in that month>.
   - Save is blocked until total debit === total credit (and > 0).
   - The list below is filterable by month, mirroring the Nature filter
     used on the Chart of Accounts screen.
   - "Open voucher…" lets you jump straight into any saved voucher by name.
   ========================================================================= */

let _lineRowSeq = 0;

// ---- building one debit/credit line row -----------------------------------
function lineRowHtml(rowId, line){
  line = line || { accountCode: '', description: '', debit: '', credit: '' };
  return `
    <tr data-row-id="${rowId}">
      <td><select class="line-account">${accountOptionsHtml(line.accountCode)}</select></td>
      <td><input type="text" class="line-desc" value="${line.description || ''}" placeholder="Line description"></td>
      <td><input type="number" class="line-debit num-input" min="0" step="0.01" value="${line.debit || ''}" placeholder="0"></td>
      <td><input type="number" class="line-credit num-input" min="0" step="0.01" value="${line.credit || ''}" placeholder="0"></td>
      <td><button type="button" class="row-action danger" data-remove-line>&times;</button></td>
    </tr>`;
}

function addVoucherLine(line){
  _lineRowSeq++;
  $('#voucher-lines-body').insertAdjacentHTML('beforeend', lineRowHtml(_lineRowSeq, line));
}

function clearVoucherLines(){
  $('#voucher-lines-body').innerHTML = '';
  _lineRowSeq = 0;
}

// Debit and credit are mutually exclusive on a single line — typing in one
// clears the other so a line can't hold both at once.
$('#voucher-lines-body').addEventListener('input', e => {
  if (e.target.classList.contains('line-debit') && Number(e.target.value) > 0){
    e.target.closest('tr').querySelector('.line-credit').value = '';
  }
  if (e.target.classList.contains('line-credit') && Number(e.target.value) > 0){
    e.target.closest('tr').querySelector('.line-debit').value = '';
  }
  recalcVoucherTotals();
});

$('#voucher-lines-body').addEventListener('click', e => {
  if (e.target.closest('[data-remove-line]')){
    e.target.closest('tr').remove();
    recalcVoucherTotals();
  }
});

$('#btn-add-line').addEventListener('click', () => { addVoucherLine(); recalcVoucherTotals(); });

function readVoucherLines(){
  return $$('#voucher-lines-body tr').map(tr => ({
    accountCode: tr.querySelector('.line-account').value,
    accountTitle: (accountByCode(tr.querySelector('.line-account').value) || {}).title || '',
    description: tr.querySelector('.line-desc').value.trim(),
    debit: Number(tr.querySelector('.line-debit').value) || 0,
    credit: Number(tr.querySelector('.line-credit').value) || 0
  })).filter(l => l.accountCode && (l.debit > 0 || l.credit > 0)); // drop untouched blank rows
}

function recalcVoucherTotals(){
  const lines = readVoucherLines();
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const diff = Math.round((totalDebit - totalCredit) * 100) / 100;

  $('#vch-total-debit').textContent = totalDebit.toFixed(2);
  $('#vch-total-credit').textContent = totalCredit.toFixed(2);
  $('#vch-diff').textContent = diff.toFixed(2);

  const bar = $('#voucher-totals-bar');
  const msg = $('#voucher-balance-msg');
  const submitBtn = $('#vch-submit-btn');
  const balanced = lines.length >= 2 && diff === 0 && totalDebit > 0;

  bar.classList.toggle('balanced', balanced);
  bar.classList.toggle('unbalanced', !balanced);
  submitBtn.disabled = !balanced;

  if (!lines.length){
    msg.textContent = 'Add lines and balance debit and credit to save.';
  } else if (lines.length < 2){
    msg.textContent = 'A voucher needs at least two lines.';
  } else if (diff !== 0){
    msg.textContent = diff > 0
      ? `Debit exceeds credit by ${Math.abs(diff).toFixed(2)}.`
      : `Credit exceeds debit by ${Math.abs(diff).toFixed(2)}.`;
  } else {
    msg.textContent = 'Balanced — ready to save.';
  }
  return { lines, totalDebit, totalCredit, balanced };
}

// ---- voucher name preview --------------------------------------------------
function refreshVoucherNamePreview(){
  const isEdit = !!$('#vch-edit-id').value;
  const date = $('#vch-date').value;
  if (!date){ $('#vch-name-preview').textContent = '—'; return; }
  $('#vch-name-preview').textContent = isEdit
    ? $('#vch-edit-id').value
    : nextVoucherId(date);
}
$('#vch-date').addEventListener('change', refreshVoucherNamePreview);

// ---- open / populate the modal ---------------------------------------------
function openVoucherModal(existing){
  const form = $('#voucher-form');
  form.reset();
  clearVoucherLines();

  if (existing){
    $('#voucher-modal-title').textContent = `Edit Voucher — ${existing.id}`;
    $('#vch-submit-btn').textContent = 'Save Changes';
    $('#vch-edit-id').value = existing.id;
    $('#vch-date').value = existing.date;
    $('#vch-narration').value = existing.narration || '';
    existing.lines.forEach(addVoucherLine);
  } else {
    $('#voucher-modal-title').textContent = 'New Voucher';
    $('#vch-submit-btn').textContent = 'Save Voucher';
    $('#vch-edit-id').value = '';
    $('#vch-date').value = new Date().toISOString().slice(0, 10);
    addVoucherLine(); addVoucherLine(); // start with two blank lines
  }
  refreshVoucherNamePreview();
  recalcVoucherTotals();
  openModal('voucher-modal');
}

$('#btn-add-voucher').addEventListener('click', () => openVoucherModal(null));

$('#voucher-form').addEventListener('submit', e => {
  e.preventDefault();
  const { lines, balanced } = recalcVoucherTotals();
  if (!balanced){
    toast('Debit and credit totals must be equal before saving.');
    return;
  }
  const date = $('#vch-date').value;
  const narration = $('#vch-narration').value.trim();
  const editId = $('#vch-edit-id').value;

  if (editId){
    const v = voucherById(editId);
    v.date = date; v.narration = narration; v.lines = lines;
    sbSaveVoucher(v, true);
    toast(`Voucher ${editId} updated.`);
  } else {
    const id = nextVoucherId(date);
    const newV = { id, date, narration, lines };
    vouchers.push(newV);
    sbSaveVoucher(newV, false);
    toast(`Voucher ${id} saved.`);
  }
  closeModal('voucher-modal');
  renderVoucherFilters();
  renderVoucherTable();
});

// ---- list / filters ---------------------------------------------------------
function voucherMonthKey(dateStr){
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
function voucherMonthLabel(dateStr){
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function renderVoucherFilters(){
  // Month filter — every distinct month present in saved vouchers.
  const monthSel = $('#voucher-filter-month');
  const current = monthSel.value;
  const months = [...new Set(vouchers.map(v => voucherMonthKey(v.date)))].sort().reverse();
  monthSel.innerHTML = '<option value="">All months</option>' +
    months.map(key => {
      const sample = vouchers.find(v => voucherMonthKey(v.date) === key);
      return `<option value="${key}">${voucherMonthLabel(sample.date)}</option>`;
    }).join('');
  if (months.includes(current)) monthSel.value = current;

  // Open-voucher jump list.
  const openSel = $('#voucher-open-select');
  openSel.innerHTML = '<option value="">Open voucher…</option>' +
    vouchers.slice().reverse().map(v => `<option value="${v.id}">${v.id} — ${v.date}</option>`).join('');
}

$('#voucher-open-select').addEventListener('change', e => {
  const id = e.target.value;
  if (!id) return;
  openVoucherModal(voucherById(id));
  e.target.value = '';
});

function renderVoucherTable(){
  const q = $('#voucher-search').value.trim().toLowerCase();
  const monthFilter = $('#voucher-filter-month').value;

  const rows = vouchers.filter(v => {
    const matchesMonth = !monthFilter || voucherMonthKey(v.date) === monthFilter;
    const haystack = [v.id, v.narration, ...v.lines.map(l => l.accountTitle + ' ' + l.description)]
      .join(' ').toLowerCase();
    const matchesQ = !q || haystack.includes(q);
    return matchesMonth && matchesQ;
  }).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  const tbody = $('#voucher-table tbody');
  if (!rows.length){
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6">No vouchers match your search.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(v => {
    const total = v.lines.reduce((s, l) => s + l.debit, 0);
    const desc = v.narration || v.lines.map(l => l.description).filter(Boolean).join('; ') || '—';
    return `
    <tr>
      <td><span class="code-tag">${v.id}</span></td>
      <td>${v.date}</td>
      <td class="cell-muted">${desc}</td>
      <td class="cell-muted">${v.lines.length} lines</td>
      <td>${total.toFixed(2)}</td>
      <td class="col-actions">
        <button class="row-action" data-edit="${v.id}">Edit</button>
        <button class="row-action danger" data-del="${v.id}">Delete</button>
      </td>
    </tr>`;
  }).join('');
}

$('#voucher-table').addEventListener('click', e => {
  const editId = e.target.dataset.edit;
  const delId = e.target.dataset.del;
  if (editId) openVoucherModal(voucherById(editId));
  if (delId) confirmDelete(`Delete voucher "${delId}"? This cannot be undone.`, () => {
    vouchers = vouchers.filter(v => v.id !== delId);
    renderVoucherFilters();
    renderVoucherTable();
    sbDeleteVoucher(delId);
    toast(`Voucher ${delId} deleted.`);
  });
});

$('#voucher-search').addEventListener('input', renderVoucherTable);
$('#voucher-filter-month').addEventListener('change', renderVoucherTable);

renderVoucherFilters();
