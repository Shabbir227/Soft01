/* =========================================================================
   nav.js — sidebar navigation between the 7 screens.
   ========================================================================= */

$$('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $$('.view').forEach(v => v.classList.remove('active'));
    $('#' + btn.dataset.view).classList.add('active');
  });
});

function refreshSidebarCount(){
  $('#record-count').textContent = `${accounts.length} accounts`;
}
