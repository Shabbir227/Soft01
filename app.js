/* =========================================================================
   app.js — boots the initial screen once every module has registered
   itself. Each view file renders its own table and wires its own
   listeners; this file just triggers the first paint and the one piece
   of shared UI (sidebar count) that depends on more than one module.
   ========================================================================= */

renderCoaTable();
renderDefineTable();
renderMainTable();
renderSubTable();
renderCustomerTable();
renderSupplierTable();
renderVoucherFilters();
renderVoucherTable();
refreshSidebarCount();
