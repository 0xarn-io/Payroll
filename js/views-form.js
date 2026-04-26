function renderAnadir(id = null) {
    STATE.editingId = id;
    const p = id ? getById(id) : null;
    const el = document.getElementById('view-anadir');
    el.innerHTML = `
      <div class="flex-between mb-6">
        <h1 class="page-title" style="margin:0">${p?'Editar nómina':'Añadir nómina'}</h1>
        <button class="btn btn-secondary" onclick="navigate('nominas')">← Volver</button>
      </div>
      ${!p?`<div class="card mb-4">
        <div class="section-title">Importar desde PDF</div>
        <div class="drop-zone" id="drop-zone" onclick="document.getElementById('pdf-input').click()">
          <div class="drop-zone-icon">📄</div>
          <p>Arrastra tu nómina PDF aquí o <strong>haz clic para seleccionarla</strong></p>
          <p style="font-size:.8rem;color:var(--gray-400);margin-top:.4rem">Se intentará extraer los datos automáticamente</p>
        </div>
        <input type="file" id="pdf-input" accept=".pdf" style="display:none" onchange="handleFileSelect(this)">
        <div id="parse-status" style="display:none" class="parse-status"></div>
      </div>`:''}
      <form id="payslip-form" onsubmit="handleFormSubmit(event)">
        <div class="card">
          <div class="section-title">Identificación</div>
          <div class="form-grid">
            <div class="form-group"><label>Período *</label><input type="month" id="f-fecha" value="${p?.fecha||currentYearMonth()}" required></div>
            <div class="form-group"><label>Empresa</label><input type="text" id="f-empresa" placeholder="Nombre empresa" value="${p?.empresa||''}"></div>
            <div class="form-group"><label>Tipo de contrato</label>
              <select id="f-contrato">
                <option value="indefinido" ${(p?.tipo_contrato||'indefinido')==='indefinido'?'selected':''}>Indefinido</option>
                <option value="temporal" ${p?.tipo_contrato==='temporal'?'selected':''}>Temporal</option>
              </select>
            </div>
          </div>
        </div>
        <div class="form-section devengos mt-4">
          <div class="form-section-title">Devengos (ingresos)</div>
          <div class="form-grid triple">
            <div class="form-group"><label>Salario base</label><input type="number" id="f-salario-base" step="0.01" min="0" placeholder="0,00" value="${p?.salario_base||''}" oninput="autoCalc()"></div>
            <div class="form-group"><label>Complementos</label><input type="number" id="f-complementos" step="0.01" min="0" placeholder="0,00" value="${p?.complementos||''}" oninput="autoCalc()"><span class="field-hint">Plus transporte, antigüedad…</span></div>
            <div class="form-group"><label>Horas extraordinarias</label><input type="number" id="f-horas-extra" step="0.01" min="0" placeholder="0,00" value="${p?.horas_extra||''}" oninput="autoCalc()"></div>
            <div class="form-group"><label>Paga extra (prorrateada)</label><input type="number" id="f-paga-extra" step="0.01" min="0" placeholder="0,00" value="${p?.paga_extra||''}" oninput="autoCalc()"></div>
            <div class="form-group"><label>Otros devengos</label><input type="number" id="f-otros-devengos" step="0.01" min="0" placeholder="0,00" value="${p?.otros_devengos||''}" oninput="autoCalc()"></div>
            <div class="form-group"><label>Total devengos (bruto) *</label><input type="number" id="f-total-devengos" step="0.01" min="0" placeholder="0,00" value="${p?.total_devengos||''}" required oninput="autoCalc()"><span class="field-hint">Campo obligatorio</span></div>
          </div>
        </div>
        <div class="form-section deducciones mt-4">
          <div class="form-section-title">Deducciones</div>
          <div style="margin-bottom:.75rem">
            <button type="button" class="btn btn-secondary btn-sm" onclick="estimateDeductions()">Estimar SS automáticamente</button>
            <span class="field-hint" style="display:inline;margin-left:.5rem">Calcula cotizaciones según el bruto</span>
          </div>
          <div class="form-grid triple">
            <div class="form-group"><label>SS Contingencias comunes</label><input type="number" id="f-ss-cc" step="0.01" min="0" placeholder="4,70%" value="${p?.ss_contingencias||''}" oninput="autoCalc()"></div>
            <div class="form-group"><label>SS Desempleo</label><input type="number" id="f-ss-de" step="0.01" min="0" placeholder="1,55%" value="${p?.ss_desempleo||''}" oninput="autoCalc()"></div>
            <div class="form-group"><label>SS Formación profesional</label><input type="number" id="f-ss-fp" step="0.01" min="0" placeholder="0,10%" value="${p?.ss_fp||''}" oninput="autoCalc()"></div>
            <div class="form-group"><label>% IRPF</label><input type="number" id="f-irpf-pct" step="0.01" min="0" max="50" placeholder="15,00" value="${p?.irpf_porcentaje||''}" oninput="autoCalc()"></div>
            <div class="form-group"><label>IRPF (importe €)</label><input type="number" id="f-irpf" step="0.01" min="0" placeholder="0,00" value="${p?.irpf||''}" oninput="autoCalc()"></div>
            <div class="form-group"><label>Otras deducciones</label><input type="number" id="f-otras-ded" step="0.01" min="0" placeholder="0,00" value="${p?.otras_deducciones||''}" oninput="autoCalc()"><span class="field-hint">Anticipos, embargos…</span></div>
          </div>
        </div>
        <div class="form-section resultado mt-4">
          <div class="form-section-title">Resultado</div>
          <div class="form-grid">
            <div class="form-group"><label>Total deducciones</label><input type="number" id="f-total-ded" step="0.01" placeholder="0,00" value="${p?.total_deducciones||''}" readonly style="background:var(--gray-50);color:var(--gray-500)"></div>
            <div class="form-group"><label>Líquido a percibir (neto) *</label><input type="number" id="f-neto" step="0.01" min="0" placeholder="0,00" value="${p?.neto||''}" required oninput="autoCalc()" style="font-weight:700;font-size:1.05rem"><span class="field-hint">Campo obligatorio</span></div>
          </div>
        </div>
        <div class="card mt-4">
          <div class="form-group"><label>Notas (opcional)</label><textarea id="f-notas" rows="2" placeholder="Ej: bonus trimestral, revisión salarial…">${p?.notas||''}</textarea></div>
        </div>
        <div class="flex gap-2 mt-4">
          <button type="submit" class="btn btn-primary btn-lg">${p?'Guardar cambios':'Guardar nómina'}</button>
          <button type="button" class="btn btn-secondary" onclick="navigate('nominas')">Cancelar</button>
        </div>
      </form>`;
    setupDropZone();
  }
  
  function setupDropZone() {
    const zone = document.getElementById('drop-zone'); if (!zone) return;
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag-over'); const f=e.dataTransfer.files[0]; if(f?.type==='application/pdf') handlePDFFile(f); });
  }
  
  function handleFileSelect(input) { const f=input.files[0]; if(f) handlePDFFile(f); }
  
  async function handlePDFFile(file) {
    const st = document.getElementById('parse-status');
    if (st) { st.style.display='flex'; st.innerHTML='<div class="spinner"></div><span>Analizando PDF…</span>'; }
    try {
      const data = await parsePDF(file);
      const fields = Object.keys(data).filter(k=>data[k]!=null).length;
      const set = (id,v) => { const el=document.getElementById(id); if(el&&v!=null&&v!=='') el.value=v; };
      set('f-fecha', data.fecha);
      set('f-total-devengos', data.total_devengos?.toFixed(2));
      set('f-neto', data.neto?.toFixed(2));
      set('f-ss-cc', data.contingencias?.toFixed(2));
      set('f-ss-de', data.desempleo?.toFixed(2));
      set('f-ss-fp', data.fp?.toFixed(2));
      set('f-irpf', data.irpf?.toFixed(2));
      set('f-irpf-pct', data.irpf_porcentaje?.toFixed(2));
      set('f-salario-base', data.salario_base?.toFixed(2));
      set('f-horas-extra', data.horas_extra?.toFixed(2));
      autoCalc();
      if (st) st.innerHTML = fields>0
        ? `<span style="color:var(--green-600)">✓ ${fields} campos encontrados. Revisa y corrige si es necesario.</span>`
        : `<span style="color:var(--amber-600)">⚠ Formato no reconocido. Introduce los datos manualmente.</span>`;
    } catch(e) {
      if (st) st.innerHTML='<span style="color:var(--red-600)">Error al leer el PDF. Introduce los datos manualmente.</span>';
    }
  }
  
  function autoCalc() {
    const v = id => parseFloat(document.getElementById(id)?.value)||0;
    const parts = v('f-salario-base')+v('f-complementos')+v('f-horas-extra')+v('f-paga-extra')+v('f-otros-devengos');
    const totalDev = document.getElementById('f-total-devengos');
    if (parts>0 && totalDev && !totalDev.value) totalDev.value=parts.toFixed(2);
    const bruto = v('f-total-devengos');
    const irpfPct=v('f-irpf-pct'), irpfEl=document.getElementById('f-irpf');
    if (irpfPct>0 && bruto>0 && irpfEl && !irpfEl.value) irpfEl.value=(bruto*irpfPct/100).toFixed(2);
    const totalDed=v('f-ss-cc')+v('f-ss-de')+v('f-ss-fp')+v('f-irpf')+v('f-otras-ded');
    const tdEl=document.getElementById('f-total-ded'); if(tdEl&&totalDed>0) tdEl.value=totalDed.toFixed(2);
    const netoEl=document.getElementById('f-neto');
    if (bruto>0 && totalDed>0 && netoEl && !netoEl.value) netoEl.value=(bruto-totalDed).toFixed(2);
  }
  
  function estimateDeductions() {
    const bruto=parseFloat(document.getElementById('f-total-devengos')?.value)||0;
    if (!bruto) { alert('Introduce primero el total devengos (bruto).'); return; }
    const temporal=document.getElementById('f-contrato')?.value==='temporal';
    const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.value=v.toFixed(2); };
    set('f-ss-cc', bruto*SS_RATES.contingencias_comunes);
    set('f-ss-de', bruto*(temporal?SS_RATES.desempleo_temporal:SS_RATES.desempleo_indefinido));
    set('f-ss-fp', bruto*SS_RATES.formacion_profesional);
    const irpfPct=parseFloat(document.getElementById('f-irpf-pct')?.value)||0;
    if (irpfPct>0) set('f-irpf', bruto*irpfPct/100);
    autoCalc();
  }
  
  function handleFormSubmit(e) {
    e.preventDefault();
    const v=id=>parseFloat(document.getElementById(id)?.value)||0;
    const s=id=>document.getElementById(id)?.value?.trim()||'';
    const p={id:STATE.editingId||generateId(),fecha:s('f-fecha'),empresa:s('f-empresa'),tipo_contrato:s('f-contrato'),
      salario_base:v('f-salario-base')||null,complementos:v('f-complementos')||null,horas_extra:v('f-horas-extra')||null,
      paga_extra:v('f-paga-extra')||null,otros_devengos:v('f-otros-devengos')||null,total_devengos:v('f-total-devengos'),
      ss_contingencias:v('f-ss-cc')||null,ss_desempleo:v('f-ss-de')||null,ss_fp:v('f-ss-fp')||null,
      irpf_porcentaje:v('f-irpf-pct')||null,irpf:v('f-irpf')||null,otras_deducciones:v('f-otras-ded')||null,
      total_deducciones:v('f-total-ded')||null,neto:v('f-neto'),notas:s('f-notas')};
    if (!p.fecha) { alert('Introduce el período.'); return; }
    if (!p.total_devengos) { alert('Introduce el total devengos (bruto).'); return; }
    if (!p.neto) { alert('Introduce el líquido a percibir (neto).'); return; }
    savePayslip(p); navigate('nominas');
  }