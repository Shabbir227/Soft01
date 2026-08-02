/* =========================================================================
   sub-define.js — View 4: Sub Mapping Define
   ========================================================================= */

function renderSubTable(){
  const q = $('#sub-search').value.trim().toLowerCase();
  const rows = subMappings.filter(s => !q || s.name.toLowerCase().includes(q));

  const tbody = $('#sub-table tbody');
  if (!rows.length){
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">No sub mappings match your search.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(s => {
    const usageCount = accounts.filter(a => a.subCode === s.code).length;
    const main = mainByCode(s.mainCode);
    return `
    <tr>
      <td><span class="code-tag">${s.code}</span></td>
      <td>${s.name}</td>
      <td>${main ? main.name : '—'}</td>
      <td class="cell-muted">${usageCount} account${usageCount === 1 ? '' : 's'}</td>
      <td class="col-actions">
        <button class="row-action" data-edit="${s.code}">Edit</button>
        <button class="row-action danger" data-del="${s.code}">Delete</button>
      </td>
    </tr>`;
  }).join('');
}

$('#sub-table').addEventListener('click', e => {
  const editCode = e.target.dataset.edit;
  const delCode = e.target.dataset.del;
  if (editCode) openSubModal(subMappings.find(s => s.code === Number(editCode)));
  if (delCode){
    const code = Number(delCode);
    if (accounts.some(a => a.subCode === code)){
      toast('Cannot delete — one or more accounts use this sub mapping.');
      return;
    }
    confirmDelete(`Delete sub mapping "${subByCode(code).name}"?`, () => {
      subMappings = subMappings.filter(s => s.code !== code);
      renderSubTable();
      sbDelete('sub_mappings', { code });
      toast('Sub mapping deleted.');
    });
  }
});

function openSubModal(existing){
  const form = $('#sub-form');
  form.reset();
  $('#sub-main').innerHTML = mainMappings.map(m => `<option value="${m.code}">${m.name}</option>`).join('');

  if (existing){
    $('#sub-modal-title').textContent = 'Edit Sub Mapping';
    $('#sub-submit-btn').textContent = 'Save Changes';
    $('#sub-edit-code').value = existing.code;
    $('#sub-name').value = existing.name;
    $('#sub-main').value = existing.mainCode;
    $('#sub-code-preview').textContent = existing.code;
  } else {
    $('#sub-modal-title').textContent = 'Add Sub Mapping';
    $('#sub-submit-btn').textContent = 'Add Sub Mapping';
    $('#sub-edit-code').value = '';
    $('#sub-code-preview').textContent = nextSubCode();
  }
  openModal('sub-modal');
}

$('#btn-add-sub').addEventListener('click', () => openSubModal(null));

$('#sub-form').addEventListener('submit', e => {
  e.preventDefault();
  const editCode = $('#sub-edit-code').value;
  const name = $('#sub-name').value.trim();
  const mainCode = Number($('#sub-main').value);

  if (editCode){
    const code = Number(editCode);
    const s = subByCode(code);
    s.name = name; s.mainCode = mainCode;
    accounts.filter(a => a.subCode === code).forEach(a => a.sub = name);
    sbUpdate('sub_mappings', { code }, { name, main_code: mainCode });
    toast(`Sub mapping "${name}" updated.`);
  } else {
    const code = nextSubCode();
    subMappings.push({ code, name, mainCode });
    sbInsert('sub_mappings', { code, name, main_code: mainCode });
    toast(`Sub mapping "${name}" added as code ${code}.`);
  }
  closeModal('sub-modal');
  renderSubTable(); renderDefineTable(); renderCoaTable();
});

$('#sub-search').addEventListener('input', renderSubTable);
