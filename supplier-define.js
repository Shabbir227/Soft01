/* =========================================================================
   supplier-define.js — View 6: Supplier Define
   Mirrors customer-define.js exactly, one GL account tag per supplier.
   ========================================================================= */

function renderSupplierTable(){
  const q = $('#supplier-search').value.trim().toLowerCase();
  const rows = suppliers.filter(s => !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));

  const tbody = $('#supplier-table tbody');
  if (!rows.length){
    tbody.innerHTML = `<tr class="empty-row"><td colspan="4">No suppliers yet — add one to get started.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(s => {
    const acc = accountByCode(s.accountCode);
    return `
    <tr>
      <td><span class="code-tag">${s.code}</span></td>
      <td>${s.name}</td>
      <td>${acc ? `<span class="code-tag">${acc.code}</span> ${acc.title}` : '<span class="cell-muted">— account removed —</span>'}</td>
      <td class="col-actions">
        <button class="row-action" data-edit="${s.code}">Edit</button>
        <button class="row-action danger" data-del="${s.code}">Delete</button>
      </td>
    </tr>`;
  }).join('');
}

$('#supplier-table').addEventListener('click', e => {
  const editCode = e.target.dataset.edit;
  const delCode = e.target.dataset.del;
  if (editCode) openSupplierModal(supplierByCode(editCode));
  if (delCode) confirmDelete(`Delete supplier "${supplierByCode(delCode).name}"?`, () => {
    suppliers = suppliers.filter(s => s.code !== delCode);
    renderSupplierTable();
    sbDelete('suppliers', { code: delCode });
    toast('Supplier deleted.');
  });
});

function openSupplierModal(existing){
  const form = $('#supplier-form');
  form.reset();
  $('#supp-account').innerHTML = accountOptionsHtml(existing ? existing.accountCode : null);

  if (existing){
    $('#supplier-modal-title').textContent = 'Edit Supplier';
    $('#supp-submit-btn').textContent = 'Save Changes';
    $('#supp-edit-code').value = existing.code;
    $('#supp-name').value = existing.name;
    $('#supp-code-preview').textContent = existing.code;
  } else {
    $('#supplier-modal-title').textContent = 'Add Supplier';
    $('#supp-submit-btn').textContent = 'Add Supplier';
    $('#supp-edit-code').value = '';
    $('#supp-code-preview').textContent = nextSupplierCode();
  }
  openModal('supplier-modal');
}

$('#btn-add-supplier').addEventListener('click', () => openSupplierModal(null));

$('#supplier-form').addEventListener('submit', e => {
  e.preventDefault();
  const editCode = $('#supp-edit-code').value;
  const name = $('#supp-name').value.trim();
  const accountCode = $('#supp-account').value;

  if (editCode){
    const s = supplierByCode(editCode);
    s.name = name; s.accountCode = accountCode;
    sbUpdate('suppliers', { code: editCode }, { name, account_code: accountCode });
    toast(`Supplier "${name}" updated.`);
  } else {
    const code = nextSupplierCode();
    suppliers.push({ code, name, accountCode });
    sbInsert('suppliers', { code, name, account_code: accountCode });
    toast(`Supplier "${name}" added as ${code}.`);
  }
  closeModal('supplier-modal');
  renderSupplierTable();
});

$('#supplier-search').addEventListener('input', renderSupplierTable);
