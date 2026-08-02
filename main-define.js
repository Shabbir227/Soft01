/* =========================================================================
   main-define.js — View 3: Main Mapping Define
   ========================================================================= */

function renderMainTable(){
  const q = $('#main-search').value.trim().toLowerCase();
  const rows = mainMappings.filter(m => !q || m.name.toLowerCase().includes(q));

  const tbody = $('#main-table tbody');
  if (!rows.length){
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">No main mappings match your search.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(m => {
    const usageCount = accounts.filter(a => a.mainCode === m.code).length;
    return `
    <tr>
      <td><span class="code-tag">${m.code}</span></td>
      <td>${m.name}</td>
      <td><span class="nature-pill">${natureName(m.natureCode)}</span></td>
      <td class="cell-muted">${usageCount} account${usageCount === 1 ? '' : 's'}</td>
      <td class="col-actions">
        <button class="row-action" data-edit="${m.code}">Edit</button>
        <button class="row-action danger" data-del="${m.code}">Delete</button>
      </td>
    </tr>`;
  }).join('');
}

$('#main-table').addEventListener('click', e => {
  const editCode = e.target.dataset.edit;
  const delCode = e.target.dataset.del;
  if (editCode) openMainModal(mainMappings.find(m => m.code === Number(editCode)));
  if (delCode){
    const code = Number(delCode);
    if (accounts.some(a => a.mainCode === code)){
      toast('Cannot delete — one or more accounts use this main mapping.');
      return;
    }
    if (subMappings.some(s => s.mainCode === code)){
      toast('Cannot delete — sub mappings still exist under this main mapping.');
      return;
    }
    confirmDelete(`Delete main mapping "${mainByCode(code).name}"?`, () => {
      mainMappings = mainMappings.filter(m => m.code !== code);
      renderMainTable();
      sbDelete('main_mappings', { code });
      toast('Main mapping deleted.');
    });
  }
});

function openMainModal(existing){
  const form = $('#main-form');
  form.reset();
  $('#main-nature').innerHTML = natures.map(n => `<option value="${n.code}">${n.name}</option>`).join('');

  if (existing){
    $('#main-modal-title').textContent = 'Edit Main Mapping';
    $('#main-submit-btn').textContent = 'Save Changes';
    $('#main-edit-code').value = existing.code;
    $('#main-name').value = existing.name;
    $('#main-nature').value = existing.natureCode;
    $('#main-code-preview').textContent = existing.code;
  } else {
    $('#main-modal-title').textContent = 'Add Main Mapping';
    $('#main-submit-btn').textContent = 'Add Main Mapping';
    $('#main-edit-code').value = '';
    $('#main-code-preview').textContent = nextMainCode();
  }
  openModal('main-modal');
}

$('#btn-add-main').addEventListener('click', () => openMainModal(null));

$('#main-form').addEventListener('submit', e => {
  e.preventDefault();
  const editCode = $('#main-edit-code').value;
  const name = $('#main-name').value.trim();
  const natureCode = Number($('#main-nature').value);

  if (editCode){
    const code = Number(editCode);
    const m = mainByCode(code);
    m.name = name; m.natureCode = natureCode;
    accounts.filter(a => a.mainCode === code).forEach(a => a.main = name);
    sbUpdate('main_mappings', { code }, { name, nature_code: natureCode });
    toast(`Main mapping "${name}" updated.`);
  } else {
    const code = nextMainCode();
    mainMappings.push({ code, name, natureCode });
    sbInsert('main_mappings', { code, name, nature_code: natureCode });
    toast(`Main mapping "${name}" added as code ${code}.`);
  }
  closeModal('main-modal');
  renderMainTable(); renderDefineTable(); renderCoaTable();
});

$('#main-search').addEventListener('input', renderMainTable);
