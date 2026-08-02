/* =========================================================================
   supabase-config.js — connects this app to a Supabase project.

   What this file does:
   1. Lets the user paste a Supabase Project URL + anon key on the
      "Database" screen (view-settings) and stores them in localStorage
      so the app reconnects automatically next time it's opened.
   2. On connect, pulls every table (accounts, main_mappings, sub_mappings,
      customers, suppliers, vouchers, voucher_lines) into the same
      in-memory arrays state.js already uses, then re-renders every view.
   3. Adds small sbInsert / sbUpdate / sbDelete / sbSaveVoucher /
      sbDeleteVoucher helpers that the view modules (coa-define.js,
      main-define.js, sub-define.js, customer-define.js,
      supplier-define.js, general-entry.js) call right after they mutate
      their local array, so every add/edit/delete is written straight to
      the database.
   4. Subscribes to Postgres realtime changes on all 7 tables, so if data
      changes in Supabase itself (dashboard, another tab, another user)
      this tab reloads and re-renders automatically — no refresh needed.

   Run schema.sql in the Supabase SQL editor once before connecting; it
   creates the tables this file expects and opens them up to the anon key.
   Load order matters: this file must come after state.js (needs $, toast,
   the array names) and after the supabase-js CDN script (needs `supabase`).
   ========================================================================= */

let sb = null;
let sbConnected = false;

// ---- credential storage (localStorage — client-only demo/personal use) ----
function sbCreds(){
  return {
    url: localStorage.getItem('sb_url') || '',
    key: localStorage.getItem('sb_key') || ''
  };
}
function sbSaveCreds(url, key){
  localStorage.setItem('sb_url', url);
  localStorage.setItem('sb_key', key);
}
function sbClearCreds(){
  localStorage.removeItem('sb_url');
  localStorage.removeItem('sb_key');
}

// ---- status UI on the Database screen + sidebar ----------------------------
function updateSbStatusUI(){
  const dot = $('#sb-status-dot');
  if (!dot) return;
  dot.classList.toggle('sb-on', sbConnected);
  dot.classList.toggle('sb-off', !sbConnected);
  $('#sb-status-label').textContent = sbConnected ? 'Connected' : 'Not connected';

  const form = $('#sb-connect-form');
  const box = $('#sb-connected-box');
  if (form) form.style.display = sbConnected ? 'none' : 'flex';
  if (box) box.style.display = sbConnected ? 'flex' : 'none';
}

// ---- connect / disconnect ---------------------------------------------------
async function sbConnect(url, key){
  try{
    sb = supabase.createClient(url, key);
    const { error } = await sb.from('main_mappings').select('code').limit(1);
    if (error) throw error;

    sbSaveCreds(url, key);
    sbConnected = true;
    updateSbStatusUI();
    toast('Connected to Supabase — loading data…');
    await sbLoadAll();
    sbSubscribeRealtime();
  } catch(err){
    sbConnected = false;
    sb = null;
    updateSbStatusUI();
    toast('Connection failed: ' + (err.message || err));
  }
}

function sbDisconnect(){
  sbClearCreds();
  sbConnected = false;
  if (sb) { try { sb.removeAllChannels(); } catch(e){} }
  sb = null;
  updateSbStatusUI();
  toast('Disconnected from Supabase. Reload the page to reset to demo data.');
}

// ---- load every table into the shared in-memory arrays --------------------
async function sbLoadAll(){
  try{
    const [accRes, mainRes, subRes, custRes, suppRes, vchRes, lineRes] = await Promise.all([
      sb.from('accounts').select('*'),
      sb.from('main_mappings').select('*'),
      sb.from('sub_mappings').select('*'),
      sb.from('customers').select('*'),
      sb.from('suppliers').select('*'),
      sb.from('vouchers').select('*'),
      sb.from('voucher_lines').select('*')
    ]);
    [accRes, mainRes, subRes, custRes, suppRes, vchRes, lineRes].forEach(r => { if (r.error) throw r.error; });

    accounts = accRes.data.map(r => ({
      code: r.code, title: r.title, pl: r.pl || '', bs: r.bs || '',
      natureCode: r.nature_code, nature: r.nature,
      mainCode: r.main_code, main: r.main,
      subCode: r.sub_code, sub: r.sub
    }));
    mainMappings = mainRes.data.map(r => ({ code: r.code, name: r.name, natureCode: r.nature_code }));
    subMappings = subRes.data.map(r => ({ code: r.code, name: r.name, mainCode: r.main_code }));
    customers = custRes.data.map(r => ({ code: r.code, name: r.name, accountCode: r.account_code }));
    suppliers = suppRes.data.map(r => ({ code: r.code, name: r.name, accountCode: r.account_code }));

    const linesByVoucher = {};
    lineRes.data.forEach(l => {
      (linesByVoucher[l.voucher_id] = linesByVoucher[l.voucher_id] || []).push(l);
    });
    vouchers = vchRes.data
      .map(v => ({
        id: v.id, date: v.date, narration: v.narration || '',
        lines: (linesByVoucher[v.id] || [])
          .sort((a, b) => (a.line_order || 0) - (b.line_order || 0))
          .map(l => ({
            accountCode: l.account_code, accountTitle: l.account_title,
            description: l.description || '', debit: Number(l.debit) || 0, credit: Number(l.credit) || 0
          }))
      }))
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

    renderAllViews();
  } catch(err){
    toast('Failed to load data from Supabase: ' + (err.message || err));
  }
}

function renderAllViews(){
  renderCoaTable(); renderDefineTable(); renderMainTable(); renderSubTable();
  renderCustomerTable(); renderSupplierTable(); renderVoucherFilters(); renderVoucherTable();
  refreshSidebarCount();
}

// ---- realtime: any remote change triggers a debounced full reload ---------
let _sbReloadTimer = null;
function sbScheduleReload(){
  clearTimeout(_sbReloadTimer);
  _sbReloadTimer = setTimeout(() => { if (sbConnected) sbLoadAll(); }, 400);
}

function sbSubscribeRealtime(){
  if (!sb) return;
  const tables = ['accounts', 'main_mappings', 'sub_mappings', 'customers', 'suppliers', 'vouchers', 'voucher_lines'];
  let channel = sb.channel('ledger-sync');
  tables.forEach(table => {
    channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, sbScheduleReload);
  });
  channel.subscribe();
}

// ---- generic write helpers, called by the view modules after each local
//      mutation. All are no-ops (return immediately) when not connected,
//      so the app still works purely locally if the user never connects. --
async function sbInsert(table, row){
  if (!sbConnected) return;
  const { error } = await sb.from(table).insert(row);
  if (error) toast(`Supabase save failed (${table}): ${error.message}`);
}
async function sbUpdate(table, match, patch){
  if (!sbConnected) return;
  let q = sb.from(table).update(patch);
  Object.entries(match).forEach(([k, v]) => { q = q.eq(k, v); });
  const { error } = await q;
  if (error) toast(`Supabase update failed (${table}): ${error.message}`);
}
async function sbDelete(table, match){
  if (!sbConnected) return;
  let q = sb.from(table).delete();
  Object.entries(match).forEach(([k, v]) => { q = q.eq(k, v); });
  const { error } = await q;
  if (error) toast(`Supabase delete failed (${table}): ${error.message}`);
}

// vouchers have a header + child lines, so they get dedicated helpers
async function sbSaveVoucher(voucher, isEdit){
  if (!sbConnected) return;
  const { error: vErr } = await sb.from('vouchers')
    .upsert({ id: voucher.id, date: voucher.date, narration: voucher.narration });
  if (vErr) { toast('Supabase voucher save failed: ' + vErr.message); return; }

  if (isEdit){
    const { error: delErr } = await sb.from('voucher_lines').delete().eq('voucher_id', voucher.id);
    if (delErr) { toast('Supabase line clear failed: ' + delErr.message); return; }
  }
  const rows = voucher.lines.map((l, i) => ({
    voucher_id: voucher.id, account_code: l.accountCode, account_title: l.accountTitle,
    description: l.description, debit: l.debit, credit: l.credit, line_order: i
  }));
  if (rows.length){
    const { error: lErr } = await sb.from('voucher_lines').insert(rows);
    if (lErr) toast('Supabase line save failed: ' + lErr.message);
  }
}
async function sbDeleteVoucher(id){
  if (!sbConnected) return;
  const { error } = await sb.from('vouchers').delete().eq('id', id); // voucher_lines cascade
  if (error) toast('Supabase voucher delete failed: ' + error.message);
}

// ---- wire the Database screen ----------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const form = $('#sb-connect-form');
  if (!form) return;

  const { url, key } = sbCreds();
  if (url) $('#sb-url').value = url;
  if (key) $('#sb-key').value = key;
  updateSbStatusUI();

  form.addEventListener('submit', e => {
    e.preventDefault();
    const u = $('#sb-url').value.trim();
    const k = $('#sb-key').value.trim();
    if (!u || !k) return;
    sbConnect(u, k);
  });

  $('#sb-disconnect-btn').addEventListener('click', sbDisconnect);

  if (url && key) sbConnect(url, key); // auto-reconnect on page load
});
