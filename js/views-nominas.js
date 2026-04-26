function renderNominas() {
    const el = document.getElementById('view-nominas');
    const list = sorted();
    if (!list.length) {
      el.innerHTML=`<div class="empty-state"><div class="empty-icon">📄</div><h3>Todavía no tienes nóminas</h3><p class="mb-4">Sube un PDF o introdúcela manualmente</p><button class="btn btn-primary btn-lg" onclick="navigate('anadir')">+ Añadir nómina</button></div>`;
      return;
    }
    const yr=new Date().getFullYear().toString();
    const yrList=list.filter(p=>p.fecha.startsWith(yr));
    const brutoYr=yrList.reduce((s,p)=>s+(p.total_devengos||0),0);
    const netoYr=yrList.reduce((s,p)=>s+(p.neto||0),0);
    const retPct=brutoYr>0?(1-netoYr/brutoYr)*100:0;
    el.innerHTML=`
      <div class="flex-between mb-6">
        <h1 class="page-title" style="margin:0">Mis Nóminas</h1>
        <button class="btn btn-primary" onclick="navigate('anadir')">+ Añadir nómina</button>
      </div>
      <div class="stats-grid mb-6">
        <div class="stat-card"><div class="stat-label">Registradas</div><div class="stat-value">${list.length}</div><div class="stat-sub">${yrList.length} en ${yr}</div></div>
        <div class="stat-card blue"><div class="stat-label">Bruto ${yr}</div><div class="stat-value">${formatEur(brutoYr)}</div><div class="stat-sub">total devengado</div></div>
        <div class="stat-card green"><div class="stat-label">Neto ${yr}</div><div class="stat-value">${formatEur(netoYr)}</div><div class="stat-sub">líquido percibido</div></div>
        <div class="stat-card amber"><div class="stat-label">Retención media ${yr}</div><div class="stat-value">${yrList.length?formatNum(retPct)+'%':'—'}</div><div class="stat-sub">sobre bruto</div></div>
      </div>
      <div class="nominas-grid">${list.map(nominalCard).join('')}</div>`;
  }
  
  function nominalCard(p) {
    const pct=p.total_devengos>0?Math.round(p.neto/p.total_devengos*100):0;
    return `
      <div class="nomina-card" onclick="openDetail('${p.id}')">
        <div class="nomina-card-header">
          <span class="nomina-card-date">${monthLabel(p.fecha)}</span>
          ${p.tipo_contrato==='temporal'?'<span class="deduction-tag tag-ss">Temporal</span>':''}
        </div>
        <div class="nomina-card-empresa">${p.empresa||'Sin empresa'}</div>
        <div class="nomina-card-bar"><div class="nomina-card-bar-fill" style="width:${pct}%"></div></div>
        <div class="nomina-card-amounts">
          <div><div class="nomina-card-neto">${formatEur(p.neto)}</div>
          <div class="nomina-card-bruto">de ${formatEur(p.total_devengos)} brutos (${pct}%)</div></div>
        </div>
        <div class="nomina-card-actions" onclick="event.stopPropagation()">
          <button class="btn btn-secondary btn-sm" onclick="navigate('anadir',{id:'${p.id}'})">Editar</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDelete('${p.id}')">Eliminar</button>
        </div>
      </div>`;
  }
  
  function confirmDelete(id) {
    const p=getById(id);
    if (p&&confirm(`¿Eliminar la nómina de ${monthLabel(p.fecha)}?`)) {
      deletePayslip(id); closeModal(); navigate('nominas');
    }
  }
  
  function openDetail(id) {
    const p=getById(id); if (!p) return;
    const bruto=p.total_devengos||0;
    const ss=(p.ss_contingencias||0)+(p.ss_desempleo||0)+(p.ss_fp||0);
    const irpf=p.irpf||0, otras=p.otras_deducciones||0, neto=p.neto||0;
    const w=v=>bruto>0?(v/bruto*100).toFixed(1):0;
    const hNeto=neto/HOURS_PER_MONTH, hBruto=bruto/HOURS_PER_MONTH;
    document.getElementById('modal-body').innerHTML=`
      <div class="breakdown-header">
        <div><div class="breakdown-empresa">${p.empresa||'Sin empresa'}</div>
        <div class="text-muted" style="font-size:.82rem">${p.tipo_contrato==='temporal'?'Contrato temporal':'Contrato indefinido'}</div></div>
        <span class="breakdown-periodo">${monthLabel(p.fecha)}</span>
      </div>
      <div class="salary-bar">
        <div class="salary-bar-neto" style="width:${w(neto)}%"><span class="salary-bar-label">Neto ${w(neto)}%</span></div>
        <div class="salary-bar-ss" style="width:${w(ss)}%"></div>
        <div class="salary-bar-irpf" style="width:${w(irpf)}%"></div>
        <div class="salary-bar-otros" style="width:${w(otras)}%"></div>
      </div>
      <div class="bar-legend">
        <span class="legend-item"><span class="legend-dot" style="background:var(--green-600)"></span>Neto ${formatEur(neto)}</span>
        <span class="legend-item"><span class="legend-dot" style="background:var(--amber-600)"></span>SS ${formatEur(ss)}</span>
        <span class="legend-item"><span class="legend-dot" style="background:var(--red-600)"></span>IRPF ${formatEur(irpf)}</span>
        ${otras>0?`<span class="legend-item"><span class="legend-dot" style="background:var(--gray-400)"></span>Otras ${formatEur(otras)}</span>`:''}
      </div>
      <table class="breakdown-table">
        <thead><tr><th>Concepto</th><th class="pct-cell">% Bruto</th><th class="amount-cell">Importe</th></tr></thead>
        <tbody>
          <tr><td colspan="3" style="padding:.4rem .75rem;font-size:.78rem;font-weight:700;color:var(--gray-500);background:var(--gray-50)">DEVENGOS</td></tr>
          ${p.salario_base?`<tr><td>Salario base</td><td class="pct-cell">${formatPct(p.salario_base/bruto*100)}</td><td class="amount-cell">${formatEur(p.salario_base)}</td></tr>`:''}
          ${p.complementos?`<tr><td>Complementos</td><td class="pct-cell">${formatPct(p.complementos/bruto*100)}</td><td class="amount-cell">${formatEur(p.complementos)}</td></tr>`:''}
          ${p.horas_extra?`<tr><td>Horas extraordinarias</td><td class="pct-cell">${formatPct(p.horas_extra/bruto*100)}</td><td class="amount-cell">${formatEur(p.horas_extra)}</td></tr>`:''}
          ${p.paga_extra?`<tr><td>Paga extra (prorrateada)</td><td class="pct-cell">${formatPct(p.paga_extra/bruto*100)}</td><td class="amount-cell">${formatEur(p.paga_extra)}</td></tr>`:''}
          ${p.otros_devengos?`<tr><td>Otros devengos</td><td class="pct-cell">${formatPct(p.otros_devengos/bruto*100)}</td><td class="amount-cell">${formatEur(p.otros_devengos)}</td></tr>`:''}
          <tr class="total-row"><td>TOTAL DEVENGOS (Bruto)</td><td></td><td class="amount-cell">${formatEur(bruto)}</td></tr>
          <tr><td colspan="3" style="padding:.4rem .75rem;font-size:.78rem;font-weight:700;color:var(--gray-500);background:var(--gray-50)">DEDUCCIONES</td></tr>
          ${p.ss_contingencias?`<tr><td>SS - Contingencias comunes <span class="deduction-tag tag-ss">SS</span><button class="info-toggle" onclick="toggleInfo('i-cc')">?</button><div class="info-box" id="i-cc">Cubre bajas por enfermedad, maternidad, incapacidad y jubilación. El trabajador aporta el 4,70%.</div></td><td class="pct-cell">${formatPct(p.ss_contingencias/bruto*100)}</td><td class="amount-cell">-${formatEur(p.ss_contingencias)}</td></tr>`:''}
          ${p.ss_desempleo?`<tr><td>SS - Desempleo <span class="deduction-tag tag-ss">SS</span><button class="info-toggle" onclick="toggleInfo('i-de')">?</button><div class="info-box" id="i-de">Financia el seguro de desempleo. 1,55% indefinido / 1,60% temporal.</div></td><td class="pct-cell">${formatPct(p.ss_desempleo/bruto*100)}</td><td class="amount-cell">-${formatEur(p.ss_desempleo)}</td></tr>`:''}
          ${p.ss_fp?`<tr><td>SS - Formación profesional <span class="deduction-tag tag-ss">SS</span></td><td class="pct-cell">${formatPct(p.ss_fp/bruto*100)}</td><td class="amount-cell">-${formatEur(p.ss_fp)}</td></tr>`:''}
          ${irpf?`<tr><td>IRPF${p.irpf_porcentaje?` (${formatNum(p.irpf_porcentaje,2)}%)`:''}  <span class="deduction-tag tag-irpf">IRPF</span><button class="info-toggle" onclick="toggleInfo('i-irpf')">?</button><div class="info-box" id="i-irpf">Tu empresa retiene este % y lo ingresa a Hacienda. Al hacer la renta, si retuvieron de más te devuelven; si fue poco, pagas la diferencia.</div></td><td class="pct-cell">${formatPct(irpf/bruto*100)}</td><td class="amount-cell">-${formatEur(irpf)}</td></tr>`:''}
          ${otras?`<tr><td>Otras deducciones</td><td class="pct-cell">${formatPct(otras/bruto*100)}</td><td class="amount-cell">-${formatEur(otras)}</td></tr>`:''}
          <tr class="total-row"><td>TOTAL DEDUCCIONES</td><td class="pct-cell">${formatPct((bruto-neto)/bruto*100)}</td><td class="amount-cell">-${formatEur(bruto-neto)}</td></tr>
          <tr class="neto-row"><td>LÍQUIDO A PERCIBIR <span class="deduction-tag tag-neto">NETO</span></td><td class="pct-cell">${formatPct(neto/bruto*100)}</td><td class="amount-cell">${formatEur(neto)}</td></tr>
        </tbody>
      </table>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-top:1.25rem">
        <div class="stat-card" style="padding:.85rem 1rem"><div class="stat-label">€/hora neto</div><div class="stat-value" style="font-size:1.2rem">${formatEur(hNeto)}</div><div class="stat-sub">base ${Math.round(HOURS_PER_MONTH)}h/mes</div></div>
        <div class="stat-card" style="padding:.85rem 1rem"><div class="stat-label">€/hora bruto</div><div class="stat-value" style="font-size:1.2rem">${formatEur(hBruto)}</div><div class="stat-sub">jornada legal 1.826h/año</div></div>
      </div>
      ${p.notas?`<div class="alert alert-info" style="margin-top:1rem"><span>Nota:</span><span>${p.notas}</span></div>`:''}
      <div class="flex gap-2" style="margin-top:1.25rem">
        <button class="btn btn-secondary" onclick="navigate('anadir',{id:'${p.id}'});closeModal()">Editar</button>
        <button class="btn btn-danger" onclick="confirmDelete('${p.id}')">Eliminar</button>
      </div>`;
    document.getElementById('modal-overlay').classList.add('open');
    document.body.style.overflow='hidden';
  }
  
  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
    document.body.style.overflow='';
  }
  
  function toggleInfo(id) {
    const el=document.getElementById(id); if(el) el.classList.toggle('open');
  }