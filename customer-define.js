/* =========================================================================
   customer-define.js — View 5: Customer Define
   Each customer is tagged to one GL account. Entries recorded against a
   customer are meant to post straight to that tagged account — this
   screen only sets up the tag; posting logic lives wherever you build the
   customer-facing entry screen next.
   ========================================================================= */

function renderCustomerTable(){
  const q = $('#customer-search').value.trim().toLowerCase();
  const rows = customers.filter(c => !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));

  const tbody = $('#customer-table tbody');
  if (!rows.length){
    tbody.innerHTML = `<tr class="empty-row"><td colspan="4">No customers yet — add one to get started.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(c => {
    const acc = accountByCode(c.accountCode);
    return `
    <tr>
      <td><span class="code-tag">${c.code}</span></td>
      <td>${c.name}</td>
      <td>${acc ? `<span class="code-tag">${acc.code}</span> ${acc.title}` : '<span class="cell-muted">— account removed —</span>'}</td>
      <td class="col-actions">
        <button class="row-action" data-edit="${c.code}">Edit</button>
        <button class="row-action danger" data-del="${c.code}">Delete</button>
      </td>
    </tr>`;
  }).join('');
}

$('#customer-table').addEventListener('click', e => {
  const editCode = e.target.dataset.edit;
  const delCode = e.target.dataset.del;
  if (editCode) openCustomerModal(customerByCode(editCode));
  if (delCode) confirmDelete(`Delete customer "${customerByCode(delCode).name}"?`, () => {
    customers = customers.filter(c => c.code !== delCode);
    renderCustomerTable();
    sbDelete('customers', { code: delCode });
    toast('Customer deleted.');
  });
});

function openCustomerModal(existing){
  const form = $('#customer-form');
  form.reset();
  $('#cust-account').innerHTML = accountOptionsHtml(existing ? existing.accountCode : null);

  if (existing){
    $('#customer-modal-title').textContent = 'Edit Customer';
    $('#cust-submit-btn').textContent = 'Save Changes';
    $('#cust-edit-code').value = existing.code;
    $('#cust-name').value = existing.name;
    $('#cust-code-preview').textContent = existing.code;
  } else {
    $('#customer-modal-title').textContent = 'Add Customer';
    $('#cust-submit-btn').textContent = 'Add Customer';
    $('#cust-edit-code').value = '';
    $('#cust-code-preview').textContent = nextCustomerCode();
  }
  openModal('customer-modal');
}

$('#btn-add-customer').addEventListener('click', () => openCustomerModal(null));

$('#customer-form').addEventListener('submit', e => {
  e.preventDefault();
  const editCode = $('#cust-edit-code').value;
  const name = $('#cust-name').value.trim();
  const accountCode = $('#cust-account').value;

  if (editCode){
    const c = customerByCode(editCode);
    c.name = name; c.accountCode = accountCode;
    sbUpdate('customers', { code: editCode }, { name, account_code: accountCode });
    toast(`Customer "${name}" updated.`);
  } else {
    const code = nextCustomerCode();
    customers.push({ code, name, accountCode });
    sbInsert('customers', { code, name, account_code: accountCode });
    toast(`Customer "${name}" added as ${code}.`);
  }
  closeModal('customer-modal');
  renderCustomerTable();
});

$('#customer-search').addEventListener('input', renderCustomerTable);
