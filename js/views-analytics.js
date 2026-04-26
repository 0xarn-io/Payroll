function renderAnalitica() {
    const el = document.getElementById('view-analitica');
    const list = sorted();
    if (list.length < 2) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><h3>Necesitas al menos 2 nóminas</h3><p class="mb-4">Añade más nóminas para ver tu evolución salarial</p><button class="btn btn-primary" onclick="navigate('anadir')">+ Añadir nómina</button></div>`;
      return;
    }
    const first = list[0], last = list[list.length-1];
    const nomChange = first.total_devengos ? ((last.total_devengos/first.total_devengos)-1)*100 : null;
    const cpiFirst = getCPIIndex(first.fecha), cpiLast = getCPIIndex(last.fecha);
    const cpiChange = ((cpiLast/cpiFirst)-1)*100;
    const realChange = nomChange !== null ? nomChange - cpiChange : null;
    const byd = byYear(), years = Object.keys(byd).sort();
    const avgHr = list.reduce((s,p)=>s+(p.neto/HOURS_PER_MONTH),0)/list.length;
  
    el.innerHTML = `
      <h1 class="page-title">Analítica salarial</h1>
      <div class="stats-grid mb-6">
        <div class="stat-card ${realChange===null?'':realChange>=0?'green':'red'}">
          <div class="stat-label">Poder adquisitivo</div>
          <div class="stat-value">${realChange!==null?(realChange>=0?'+':'')+formatNum(realChange)+'%':'—'}</div>
          <div class="stat-sub">ganancia/pérdida real vs inflación</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-label">Subida nominal</div>
          <div class="stat-value">${nomChange!==null?(nomChange>=0?'+':'')+formatNum(nomChange)+'%':'—'}</div>
          <div class="stat-sub">${monthLabel(first.fecha)} → ${monthLabel(last.fecha)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Inflación acumulada (IPC)</div>
          <div class="stat-value">+${formatNum(cpiChange)}%</div>
          <div class="stat-sub">España ${monthLabel(first.fecha)} → ${monthLabel(last.fecha)}</div>
        </div>
        <div class="stat-card amber">
          <div class="stat-label">Neto/hora (media)</div>
          <div class="stat-value">${formatEur(avgHr)}/h</div>
          <div class="stat-sub">base ${Math.round(HOURS_PER_MONTH)}h/mes</div>
        </div>
      </div>
      ${realChange!==null?`<div class="card mb-4">
        <span class="insight-badge ${realChange>=0?'positive':'negative'}">${realChange>=0?'Tu salario creció '+formatNum(realChange)+'% por encima de la inflación':'Tu salario perdió '+formatNum(Math.abs(realChange))+'% de poder adquisitivo'} desde ${monthLabel(first.fecha)}</span>
        <span class="text-muted" style="margin-left:.75rem;font-size:.82rem">Subida nominal ${nomChange>=0?'+':''}${formatNum(nomChange)}% — IPC +${formatNum(cpiChange)}%</span>
      </div>`:''}
      <div class="charts-grid">
        <div class="card chart-full"><div class="chart-title">Evolución salarial bruto / neto</div><div class="chart-container" style="height:300px"><canvas id="ch-salary"></canvas></div></div>
        <div class="card"><div class="chart-title">Poder adquisitivo real vs nominal</div><div class="chart-container"><canvas id="ch-real"></canvas></div></div>
        <div class="card"><div class="chart-title">Desglose deducciones (media)</div><div class="chart-container"><canvas id="ch-ded"></canvas></div></div>
      </div>
      <div class="card mt-4">
        <div class="section-title">Resumen por año</div>
        <div style="overflow-x:auto"><table class="year-table">
          <thead><tr><th>Año</th><th>Nóminas</th><th>Bruto total</th><th>Neto total</th><th>SS media</th><th>IRPF medio</th><th>Retención</th><th>€/hora neto</th></tr></thead>
          <tbody>${years.map(y=>{
            const ys=byd[y];
            const b=ys.reduce((s,p)=>s+(p.total_devengos||0),0);
            const n=ys.reduce((s,p)=>s+p.neto,0);
            const ss=ys.reduce((s,p)=>s+((p.ss_contingencias||0)+(p.ss_desempleo||0)+(p.ss_fp||0)),0)/ys.length;
            const ir=ys.reduce((s,p)=>s+(p.irpf||0),0)/ys.length;
            const ret=b>0?(1-n/b)*100:0;
            return `<tr><td>${y}</td><td>${ys.length}</td><td>${formatEur(b)}</td><td>${formatEur(n)}</td><td>${formatEur(ss)}</td><td>${formatEur(ir)}</td><td>${formatNum(ret)}%</td><td>${formatEur(n/(ys.length*HOURS_PER_MONTH))}/h</td></tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>
      <div class="card mt-4">
        <div class="section-title">Detalle mensual — coste por hora</div>
        <div style="overflow-x:auto"><table class="year-table">
          <thead><tr><th>Período</th><th>Bruto</th><th>Neto</th><th>SS</th><th>IRPF</th><th>Retención</th><th>Bruto/h</th><th>Neto/h</th></tr></thead>
          <tbody>${list.map(p=>{
            const ss=(p.ss_contingencias||0)+(p.ss_desempleo||0)+(p.ss_fp||0);
            const ret=p.total_devengos>0?(1-p.neto/p.total_devengos)*100:0;
            return `<tr><td>${monthLabel(p.fecha)}</td><td>${formatEur(p.total_devengos)}</td><td>${formatEur(p.neto)}</td><td>${ss>0?formatEur(ss):'—'}</td><td>${p.irpf?formatEur(p.irpf):'—'}</td><td>${formatNum(ret)}%</td><td>${formatEur(p.total_devengos/HOURS_PER_MONTH)}/h</td><td>${formatEur(p.neto/HOURS_PER_MONTH)}/h</td></tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>`;
  
    requestAnimationFrame(() => {
      buildSalaryChart(list);
      buildRealChart(list, first, cpiFirst);
      buildDedChart(list);
    });
  }
  
  function buildSalaryChart(list) {
    const ctx = document.getElementById('ch-salary'); if (!ctx) return;
    STATE.charts.salary = new Chart(ctx, {
      type: 'line',
      data: { labels: list.map(p=>monthLabel(p.fecha)), datasets: [
        { label:'Bruto', data:list.map(p=>p.total_devengos), borderColor:'#2563eb', backgroundColor:'rgba(37,99,235,.08)', fill:true, tension:.3, pointRadius:4 },
        { label:'Neto',  data:list.map(p=>p.neto),           borderColor:'#16a34a', backgroundColor:'rgba(22,163,74,.08)',  fill:true, tension:.3, pointRadius:4 },
      ]},
      options: { responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{position:'top'}, tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${formatEur(c.parsed.y)}`}} },
        scales:{ y:{ ticks:{callback:v=>formatEur(v)} } } }
    });
  }
  
  function buildRealChart(list, first, cpiFirst) {
    const ctx = document.getElementById('ch-real'); if (!ctx || list.length < 2) return;
    STATE.charts.real = new Chart(ctx, {
      type: 'line',
      data: { labels: list.map(p=>monthLabel(p.fecha)), datasets: [
        { label:'Neto nominal', data:list.map(p=>p.neto), borderColor:'#2563eb', tension:.3, pointRadius:3 },
        { label:'Neto real (poder adquisitivo)', data:list.map(p=>+(p.neto*cpiFirst/getCPIIndex(p.fecha)).toFixed(2)), borderColor:'#7c3aed', borderDash:[5,3], tension:.3, pointRadius:3 },
      ]},
      options: { responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{position:'top'}, tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${formatEur(c.parsed.y)}`}} },
        scales:{ y:{ ticks:{callback:v=>formatEur(v)} } } }
    });
  }
  
  function buildDedChart(list) {
    const ctx = document.getElementById('ch-ded'); if (!ctx) return;
    const avg = fn => list.reduce((s,p)=>s+fn(p),0)/list.length;
    STATE.charts.ded = new Chart(ctx, {
      type: 'doughnut',
      data: { labels:['Neto','Seguridad Social','IRPF','Otras ded.'],
        datasets:[{ data:[avg(p=>p.neto), avg(p=>(p.ss_contingencias||0)+(p.ss_desempleo||0)+(p.ss_fp||0)), avg(p=>p.irpf||0), avg(p=>p.otras_deducciones||0)],
          backgroundColor:['#16a34a','#d97706','#dc2626','#9ca3af'], borderWidth:2, borderColor:'#fff' }] },
      options: { responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{position:'bottom'}, tooltip:{callbacks:{label:c=>`${c.label}: ${formatEur(c.parsed)}`}} } }
    });
  }