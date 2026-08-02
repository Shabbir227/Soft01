/* =========================================================================
   coa.js — View 1: Chart of Accounts (read-only)
   Shows every account with internal numeric keys (Nature Code, Main
   Mapping Code, Sub Mapping Code) hidden — only human-readable names show.
   ========================================================================= */

function populateNatureFilter(selectEl){
  selectEl.innerHTML = '<option value="">All natures</option>' +
    natures.map(n => `<option value="${n.code}">${n.name}</option>`).join('');
}

function renderCoaTable(){
  const q = $('#coa-search').value.trim().toLowerCase();
  const natureFilter = $('#coa-filter-nature').value;

  const rows = accounts.filter(a => {
    const matchesQ = !q || a.title.toLowerCase().includes(q) || a.code.toLowerCase().includes(q);
    const matchesNature = !natureFilter || String(a.natureCode) === natureFilter;
    return matchesQ && matchesNature;
  });

  const tbody = $('#coa-table tbody');
  if (!rows.length){
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6">No accounts match your search.</td></tr>`;
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
    </tr>
  `).join('');
}

populateNatureFilter($('#coa-filter-nature'));
$('#coa-search').addEventListener('input', renderCoaTable);
$('#coa-filter-nature').addEventListener('change', renderCoaTable);
