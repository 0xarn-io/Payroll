'use strict';

const STORAGE_KEY = 'nomina_v1';
const STATE = { payslips: [], view: 'nominas', editingId: null, charts: {} };

function load() {
  try { STATE.payslips = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch(e) { STATE.payslips = []; }
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE.payslips)); }
function sorted() { return [...STATE.payslips].sort((a,b) => a.fecha.localeCompare(b.fecha)); }
function byYear() {
  const map = {};
  for (const p of sorted()) { const y = p.fecha.split('-')[0]; if (!map[y]) map[y]=[]; map[y].push(p); }
  return map;
}
function getById(id) { return STATE.payslips.find(p => p.id === id); }
function savePayslip(data) {
  const i = STATE.payslips.findIndex(p => p.id === data.id);
  if (i >= 0) STATE.payslips[i] = data; else STATE.payslips.push(data);
  save();
}
function deletePayslip(id) { STATE.payslips = STATE.payslips.filter(p => p.id !== id); save(); }
function destroyCharts() { Object.values(STATE.charts).forEach(c => { try { c.destroy(); } catch(e){} }); STATE.charts = {}; }
function navigate(view, params = {}) {
  STATE.view = view; STATE.params = params; destroyCharts();
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === view));
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.id === `view-${view}`));
  if (view === 'nominas')   renderNominas();
  if (view === 'anadir')    renderAnadir(params.id || null);
  if (view === 'analitica') renderAnalitica();
  if (view === 'exportar')  renderExportar();
}