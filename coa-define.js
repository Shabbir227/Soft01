/* =========================================================================
   coa-define.js — View 2: Chart of Accounts Define
   Search / edit / delete existing accounts, and add new ones. Account Code
   is generated automatically from state.js's nextAccountCode() — see the
   rule documented there.
   ========================================================================= */

function renderDefineTable(){
  const q = $('#define-search').value.trim().toLowerCase();
  const natureFilter = $('#define-filter-nature').value;

  const rows = accounts.filter(a => {
    const matchesQ = !q || a.title.toLowerCase().includes(q) || a.code.toLowerCase().includes(q);
    const matchesNature = !natureFilter || String(a.natureCode) === natureFilter;
    return matchesQ && matchesNature;
  });

  const tbody = $('#define-table tbody');
  if (!rows.length){
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">No accounts match your search.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(a => `
    <tr>
      <td><span class="code-tag">${a.code}</span></td>
      <td>${a.title}</td>
      <td class="${a.pl || a.bs ? '' : 'cell-muted'}">${a.pl || a.bs || '—'}</td>
      <td><span class="nature-pill">${a.nature}</span></td>
      <td>${a.main}</td>
      <td>${a.sub}</td>
      <td class="col-actions">
        <button class="row-action" data-edit="${a.code}">Edit</button>
        <button class="row-action danger" data-del="${a.code}">Delete</button>
      </td>
    </tr>
  `).join('');
}

$('#define-table').addEventListener('click', e => {
  const editCode = e.target.dataset.edit;
  const delCode = e.target.dataset.del;
  if (editCode) openAccountModal(accounts.find(a => a.code === editCode));
  if (delCode) confirmDelete(
    `Delete account "${delCode}"? This cannot be undone.`,
    () => {
      accounts = accounts.filter(a => a.code !== delCode);
      renderDefineTable(); renderCoaTable(); refreshSidebarCount();
      sbDelete('accounts', { code: delCode });
      toast(`Account ${delCode} deleted.`);
    }
  );
});

// ---- Account add/edit modal ------------------------------------------------
function populateAccountNatureSelect(){
  $('#acc-nature').innerHTML = natures.map(n => `<option value="${n.code}">${n.name}</option>`).join('');
}

function refreshAccountCategoryOptions(){
  const nc = Number($('#acc-nature').value);
  const cats = CATEGORIES_BY_NATURE[nc] || [];
  $('#acc-category').innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

function refreshAccountMainOptions(){
  const nc = Number($('#acc-nature').value);
  const opts = mainMappings.filter(m => m.natureCode === nc);
  $('#acc-main').innerHTML = opts.map(m => `<option value="${m.code}">${m.name}</option>`).join('');
}

function refreshAccountSubOptions(){
  const mc = Number($('#acc-main').value);
  const opts = subMappings.filter(s => s.mainCode === mc);
  $('#acc-sub').innerHTML = opts.length
    ? opts.map(s => `<option value="${s.code}">${s.name}</option>`).join('')
    : '<option value="">No sub mappings under this main mapping yet</option>';
}

function refreshAccountCodePreview(){
  const isEdit = !!$('#acc-edit-code').value;
  if (isEdit){
    $('#acc-code-preview').textContent = $('#acc-edit-code').value;
    return;
  }
  const nc = Number($('#acc-nature').value);
  $('#acc-code-preview').textContent = nextAccountCode(nc);
}

$('#acc-nature').addEventListener('change', () => {
  refreshAccountCategoryOptions();
  refreshAccountMainOptions();
  refreshAccountSubOptions();
  refreshAccountCodePreview();
});
$('#acc-main').addEventListener('change', refreshAccountSubOptions);

function openAccountModal(existing){
  const form = $('#account-form');
  form.reset();
  populateAccountNatureSelect();

  if (existing){
    $('#account-modal-title').textContent = 'Edit Account';
    $('#acc-submit-btn').textContent = 'Save Changes';
    $('#acc-edit-code').value = existing.code;
    $('#acc-title').value = existing.title;
    $('#acc-nature').value = existing.natureCode;
    $('#acc-nature').disabled = true; // nature fixed once an account is created — keeps the code prefix meaningful
    refreshAccountCategoryOptions();
    $('#acc-category').value = existing.pl || existing.bs;
    refreshAccountMainOptions();
    $('#acc-main').value = existing.mainCode;
    refreshAccountSubOptions();
    $('#acc-sub').value = existing.subCode;
  } else {
    $('#account-modal-title').textContent = 'Add Account';
    $('#acc-submit-btn').textContent = 'Add Account';
    $('#acc-edit-code').value = '';
    $('#acc-nature').disabled = false;
    $('#acc-nature').value = natures[0].code;
    refreshAccountCategoryOptions();
    refreshAccountMainOptions();
    refreshAccountSubOptions();
  }
  refreshAccountCodePreview();
  openModal('account-modal');
}

$('#btn-add-account').addEventListener('click', () => openAccountModal(null));

$('#account-form').addEventListener('submit', e => {
  e.preventDefault();
  const editCode = $('#acc-edit-code').value;
  const natureCode = Number($('#acc-nature').value);
  const mainCode = Number($('#acc-main').value);
  const subCode = Number($('#acc-sub').value);
  const category = $('#acc-category').value;
  const title = $('#acc-title').value.trim();
  const nature = natureName(natureCode);
  const main = (mainByCode(mainCode) || {}).name || '';
  const sub = (subByCode(subCode) || {}).name || '';
  const isPL = natureCode === 4 || natureCode === 5; // Income / Expense post to P&L, else Balance Sheet

  if (editCode){
    const acc = accounts.find(a => a.code === editCode);
    acc.title = title;
    acc.pl = isPL ? category : '';
    acc.bs = isPL ? '' : category;
    acc.mainCode = mainCode; acc.main = main;
    acc.subCode = subCode; acc.sub = sub;
    sbUpdate('accounts', { code: editCode }, {
      title: acc.title, pl: acc.pl, bs: acc.bs,
      main_code: acc.mainCode, main: acc.main,
      sub_code: acc.subCode, sub: acc.sub
    });
    toast(`Account ${editCode} updated.`);
  } else {
    const code = nextAccountCode(natureCode);
    const newAcc = {
      code, title,
      pl: isPL ? category : '',
      bs: isPL ? '' : category,
      natureCode, nature,
      mainCode, main,
      subCode, sub
    };
    accounts.push(newAcc);
    sbInsert('accounts', {
      code: newAcc.code, title: newAcc.title, pl: newAcc.pl, bs: newAcc.bs,
      nature_code: newAcc.natureCode, nature: newAcc.nature,
      main_code: newAcc.mainCode, main: newAcc.main,
      sub_code: newAcc.subCode, sub: newAcc.sub
    });
    toast(`Account ${code} added.`);
  }

  closeModal('account-modal');
  renderDefineTable(); renderCoaTable(); refreshSidebarCount();
});

populateNatureFilter($('#define-filter-nature'));
$('#define-search').addEventListener('input', renderDefineTable);
$('#define-filter-nature').addEventListener('change', renderDefineTable);
