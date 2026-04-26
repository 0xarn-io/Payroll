function renderExportar() {
  const el = document.getElementById('view-exportar');
  const count = STATE.payslips.length;
  el.innerHTML = `
    <h1 class="page-title">Exportar datos</h1>
    ${!count?'<div class="alert alert-warning">No tienes nóminas guardadas todavía.</div>':''}
    <div class="export-grid">
      <div class="export-card">
        <div class="export-icon">📊</div>
        <div class="export-title">Excel (.xlsx)</div>
        <div class="export-desc">Todas tus nóminas en un Excel con hoja de datos y resumen anual.</div>
        <button class="btn btn-primary" onclick="exportExcel()" ${!count?'disabled':''}>Descargar Excel</button>
      </div>
      <div class="export-card">
        <div class="export-icon">📄</div>
        <div class="export-title">Informe PDF</div>
        <div class="export-desc">Informe en PDF con resumen de nóminas, totales anuales y métricas clave.</div>
        <button class="btn btn-primary" onclick="exportPDF()" ${!count?'disabled':''}>Descargar PDF</button>
      </div>
    </div>
    <div class="card mt-4">
      <div class="section-title">Copia de seguridad</div>
      <p class="text-muted mb-4">Tus nóminas se guardan en tu navegador (localStorage). Solo los PDFs que importas se envían a la API de Claude para extracción.</p>
      <div class="flex gap-2">
        <button class="btn btn-secondary" onclick="exportJSON()">Exportar backup (.json)</button>
        <button class="btn btn-secondary" onclick="document.getElementById('import-input').click()">Importar backup</button>
        <input type="file" id="import-input" accept=".json" style="display:none" onchange="importJSON(this)">
      </div>
    </div>
    <div class="card mt-4">
      <div class="section-title">Extracción con Claude</div>
      <p class="text-muted mb-4">
        ${localStorage.getItem('anthropic_api_key')
          ? 'API key configurada. Las nóminas en PDF se extraen con Claude.'
          : 'Sin API key. Los PDFs se procesan con el parser local (menos preciso).'}
      </p>
      <div class="flex gap-2">
        <button class="btn btn-secondary" onclick="setApiKey()">${localStorage.getItem('anthropic_api_key') ? 'Cambiar' : 'Añadir'} API key</button>
        ${localStorage.getItem('anthropic_api_key') ? '<button class="btn btn-secondary" onclick="removeApiKey()">Eliminar API key</button>' : ''}
      </div>
    </div>`;
}

function setApiKey() {
  const k = prompt('Anthropic API key:');
  if (k && k.trim()) {
    localStorage.setItem('anthropic_api_key', k.trim());
    navigate('exportar');
  }
}

function removeApiKey() {
  if (confirm('¿Eliminar la API key guardada?')) {
    localStorage.removeItem('anthropic_api_key');
    navigate('exportar');
  }
}

function exportExcel() {
  if (!window.XLSX) { alert('Librería XLSX no disponible. Recarga la página.'); return; }
  const list = sorted();
  const wb = XLSX.utils.book_new();
  const rows = [
    ['Período','Empresa','Contrato','Salario base','Complementos','H.Extra','Paga extra','Otros dev.','Total bruto','SS CC','SS Desempleo','SS FP','SS total','IRPF %','IRPF €','Otras ded.','Total ded.','Neto','Retención %','€/h neto','Notas'],
    ...list.map(p => {
      const ss=(p.ss_contingencias||0)+(p.ss_desempleo||0)+(p.ss_fp||0);
      const ret=p.total_devengos>0?(1-p.neto/p.total_devengos)*100:0;
      return [p.fecha,p.empresa,p.tipo_contrato,p.salario_base||'',p.complementos||'',p.horas_extra||'',p.paga_extra||'',p.otros_devengos||'',p.total_devengos,p.ss_contingencias||'',p.ss_desempleo||'',p.ss_fp||'',ss||'',p.irpf_porcentaje||'',p.irpf||'',p.otras_deducciones||'',p.total_deducciones||'',p.neto,+ret.toFixed(2),+(p.neto/HOURS_PER_MONTH).toFixed(2),p.notas||''];
    })
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Nominas');
  const byd = byYear();
  const yrows = [['Año','Nominas','Bruto','Neto','SS total','IRPF total','Retencion %','€/h neto'],
    ...Object.entries(byd).sort().map(([y,ys])=>{
      const b=ys.reduce((s,p)=>s+(p.total_devengos||0),0), n=ys.reduce((s,p)=>s+p.neto,0);
      const ss=ys.reduce((s,p)=>s+((p.ss_contingencias||0)+(p.ss_desempleo||0)+(p.ss_fp||0)),0);
      const ir=ys.reduce((s,p)=>s+(p.irpf||0),0), ret=b>0?(1-n/b)*100:0;
      return [y,ys.length,+b.toFixed(2),+n.toFixed(2),+ss.toFixed(2),+ir.toFixed(2),+ret.toFixed(2),+(n/(ys.length*HOURS_PER_MONTH)).toFixed(2)];
    })
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(yrows), 'Resumen anual');
  XLSX.writeFile(wb, 'nominas.xlsx');
}

function exportPDF() {
  if (!window.jspdf) { alert('Librería jsPDF no disponible. Recarga la página.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF(), list = sorted();
  doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.text('Informe de Nominas', 14, 20);
  doc.setFont('helvetica','normal'); doc.setFontSize(10);
  doc.text(`Generado el ${new Date().toLocaleDateString('es-ES')} - ${list.length} nominas`, 14, 28);
  let y = 40;
  for (const [yr, ys] of Object.entries(byYear()).sort()) {
    if (y > 250) { doc.addPage(); y = 20; }
    const b=ys.reduce((s,p)=>s+(p.total_devengos||0),0), n=ys.reduce((s,p)=>s+p.neto,0);
    doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.text(`Ano ${yr}`, 14, y); y+=7;
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    doc.text(`Bruto: ${b.toFixed(2)} EUR  Neto: ${n.toFixed(2)} EUR  Retencion: ${(b>0?(1-n/b)*100:0).toFixed(1)}%`, 14, y); y+=8;
    const cols=['Periodo','Bruto','Neto','SS','IRPF','Ret%'], cw=[28,28,28,25,25,18];
    doc.setFont('helvetica','bold'); doc.setFontSize(8);
    let x=14; cols.forEach((h,i)=>{ doc.text(h,x,y); x+=cw[i]; }); y+=5;
    doc.setFont('helvetica','normal');
    for (const p of ys) {
      if (y > 270) { doc.addPage(); y=20; }
      const ss=(p.ss_contingencias||0)+(p.ss_desempleo||0)+(p.ss_fp||0);
      const r=p.total_devengos>0?(1-p.neto/p.total_devengos)*100:0;
      const vals=[monthLabel(p.fecha).slice(0,8),(p.total_devengos||0).toFixed(0),p.neto.toFixed(0),ss.toFixed(0),(p.irpf||0).toFixed(0),r.toFixed(1)+'%'];
      x=14; vals.forEach((c,i)=>{ doc.text(String(c),x,y); x+=cw[i]; }); y+=5;
    }
    y+=6;
  }
  doc.save('informe-nominas.pdf');
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(STATE.payslips,null,2)],{type:'application/json'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='nominas-backup.json'; a.click();
}

function importJSON(input) {
  const f = input.files[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error('Formato incorrecto');
      if (confirm(`Importar ${data.length} nominas? Se añadiran a las existentes.`)) {
        const ids = new Set(STATE.payslips.map(p=>p.id));
        STATE.payslips.push(...data.filter(p=>!ids.has(p.id)));
        save(); navigate('nominas');
      }
    } catch(err) { alert('Error al importar: '+err.message); }
  };
  reader.readAsText(f);
}

document.addEventListener('DOMContentLoaded', () => {
  load();
  document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => navigate(b.dataset.tab)));
  document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target===e.currentTarget) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key==='Escape') closeModal(); });
  navigate('nominas');
});