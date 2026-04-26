if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  
  async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const allLines = [];
  
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const lineMap = {};
      for (const item of content.items) {
        if (!item.str || !item.str.trim()) continue;
        const y = Math.round(item.transform[5]);
        if (!lineMap[y]) lineMap[y] = [];
        lineMap[y].push({ text: item.str.trim(), x: item.transform[4] });
      }
      const sortedYs = Object.keys(lineMap).map(Number).sort((a, b) => b - a);
      for (const y of sortedYs) {
        const sorted = lineMap[y].sort((a, b) => a.x - b.x);
        const lineText = sorted.map(i => i.text).join(' ').trim();
        if (lineText) allLines.push(lineText);
      }
    }
    return allLines;
  }
  
  function extractNumber(str) {
    const clean = str.replace(/[€$£%]/g, '').trim();
    let m = clean.match(/(\d{1,3}(?:\.\d{3})+),(\d{1,2})\b/);
    if (m) return parseFloat(m[1].replace(/\./g, '') + '.' + m[2]);
    m = clean.match(/\b(\d{1,6}),(\d{2})\b/);
    if (m) return parseFloat(m[1] + '.' + m[2]);
    m = clean.match(/(\d{1,3}(?:,\d{3})+)\.(\d{1,2})\b/);
    if (m) return parseFloat(m[1].replace(/,/g, '') + '.' + m[2]);
    m = clean.match(/\b(\d{1,6})\.(\d{2})\b/);
    if (m) return parseFloat(m[1] + '.' + m[2]);
    m = clean.match(/\b(\d{1,6})\b/);
    if (m) return parseFloat(m[1]);
    return null;
  }
  
  function findValue(lines, patterns) {
    for (const line of lines) {
      for (const pattern of patterns) {
        if (pattern.test(line)) {
          const remaining = line.replace(pattern, '').trim();
          const num = extractNumber(remaining);
          if (num !== null && num > 0) return num;
        }
      }
    }
    return null;
  }
  
  function parsePayslipText(lines) {
    const result = {};
    const PATTERNS = {
      total_devengos:    [/total\s*devengos/i, /total\s*bruto/i, /total\s*a\s*devengar/i],
      total_deducciones: [/total\s*deducciones/i, /total\s*a\s*deducir/i],
      neto:              [/l[ií]quido\s*a?\s*percibir/i, /l[ií]quido\s*neto/i, /importe\s*l[ií]quido/i, /\bneto\b/i],
      irpf:              [/\bi\.?r\.?p\.?f\.?\b/i, /retenci[oó]n\s*irpf/i],
      contingencias:     [/contingencias\s*comunes/i, /cot(?:izaci[oó]n)?\s*cc\b/i],
      desempleo:         [/\bdesempleo\b/i],
      fp:                [/formaci[oó]n\s*profesional/i, /\bf\.?\s*prof\b/i],
      salario_base:      [/salario\s*base/i, /sueldo\s*base/i],
      horas_extra:       [/horas?\s*extraordinarias/i, /horas?\s*extra\b/i],
    };
    for (const [field, patterns] of Object.entries(PATTERNS)) {
      const val = findValue(lines, patterns);
      if (val !== null) result[field] = val;
    }
    for (const line of lines) {
      if (/\bi\.?r\.?p\.?f\.?\b/i.test(line)) {
        const m = line.match(/(\d{1,2}[,.]?\d*)\s*%/);
        if (m) { result.irpf_porcentaje = parseFloat(m[1].replace(',', '.')); break; }
      }
    }
    for (const line of lines) {
      let m = line.match(/(?:periodo|per[ií]odo|mes)[:\s]*(\d{1,2})[/\-](\d{4})/i);
      if (m) { result.fecha = `${m[2]}-${String(parseInt(m[1])).padStart(2,'0')}`; break; }
      m = line.match(/\b(20\d{2})[-/](\d{2})\b/);
      if (m) { result.fecha = `${m[1]}-${m[2]}`; break; }
      m = line.match(/\b(\d{2})[-/](20\d{2})\b/);
      if (m) { result.fecha = `${m[2]}-${String(parseInt(m[1])).padStart(2,'0')}`; break; }
    }
    return result;
  }
  
  async function parsePDF(file) {
    try {
      const lines = await extractTextFromPDF(file);
      return parsePayslipText(lines);
    } catch (err) {
      console.warn('PDF parse error:', err);
      return {};
    }
  }