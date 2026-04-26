// Spanish Social Security employee contribution rates (2024)
const SS_RATES = {
    contingencias_comunes: 0.047,
    desempleo_indefinido: 0.0155,
    desempleo_temporal: 0.0160,
    formacion_profesional: 0.001,
  };
  
  // Monthly CPI YoY % change – Spain IPC General (INE)
  const CPI_YOY = {
    "2021-01": 0.5,  "2021-02": 0.0,  "2021-03": 1.3,  "2021-04": 2.2,
    "2021-05": 2.7,  "2021-06": 2.5,  "2021-07": 2.9,  "2021-08": 3.3,
    "2021-09": 4.0,  "2021-10": 5.4,  "2021-11": 5.5,  "2021-12": 6.5,
    "2022-01": 6.1,  "2022-02": 7.6,  "2022-03": 9.8,  "2022-04": 8.3,
    "2022-05": 8.7,  "2022-06": 10.2, "2022-07": 10.8, "2022-08": 10.5,
    "2022-09": 9.0,  "2022-10": 7.3,  "2022-11": 6.8,  "2022-12": 5.7,
    "2023-01": 5.9,  "2023-02": 6.0,  "2023-03": 3.3,  "2023-04": 4.1,
    "2023-05": 3.2,  "2023-06": 1.9,  "2023-07": 2.3,  "2023-08": 2.4,
    "2023-09": 3.5,  "2023-10": 3.5,  "2023-11": 3.2,  "2023-12": 3.1,
    "2024-01": 3.4,  "2024-02": 2.8,  "2024-03": 3.2,  "2024-04": 3.3,
    "2024-05": 3.6,  "2024-06": 3.4,  "2024-07": 2.8,  "2024-08": 2.2,
    "2024-09": 1.5,  "2024-10": 1.8,  "2024-11": 2.4,  "2024-12": 2.8,
    "2025-01": 3.0,  "2025-02": 3.0,  "2025-03": 2.3,  "2025-04": 2.2,
  };
  
  function buildCPIIndex() {
    const months = Object.keys(CPI_YOY).sort();
    const idx = {};
    idx[months[0]] = 100;
    for (let i = 1; i < months.length; i++) {
      const prev = months[i - 1];
      const curr = months[i];
      const monthlyRate = CPI_YOY[curr] / 1200;
      idx[curr] = idx[prev] * (1 + monthlyRate);
    }
    return idx;
  }
  const CPI_INDEX = buildCPIIndex();
  
  function getCPIIndex(yearMonth) {
    if (CPI_INDEX[yearMonth]) return CPI_INDEX[yearMonth];
    const months = Object.keys(CPI_INDEX).sort();
    if (yearMonth >= months[months.length - 1]) return CPI_INDEX[months[months.length - 1]];
    if (yearMonth <= months[0]) return CPI_INDEX[months[0]];
    for (let i = 0; i < months.length - 1; i++) {
      if (yearMonth > months[i] && yearMonth < months[i + 1])
        return (CPI_INDEX[months[i]] + CPI_INDEX[months[i + 1]]) / 2;
    }
    return 100;
  }
  
  const HOURS_PER_YEAR = 1826;
  const HOURS_PER_MONTH = HOURS_PER_YEAR / 12;
  
  function formatEur(amount) {
    if (amount == null || isNaN(amount)) return '—';
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  }
  function formatPct(value, decimals = 1) {
    if (value == null || isNaN(value)) return '—';
    return new Intl.NumberFormat('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value) + ' %';
  }
  function formatNum(value, decimals = 2) {
    if (value == null || isNaN(value)) return '—';
    return new Intl.NumberFormat('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
  }
  function monthLabel(yearMonth) {
    if (!yearMonth) return '';
    const [year, month] = yearMonth.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
  }
  function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function currentYearMonth() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }