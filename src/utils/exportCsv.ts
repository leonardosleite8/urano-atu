/**
 * Gera e faz download de um arquivo CSV no padrão Excel PT-BR:
 * - BOM UTF-8 para acentuação correta
 * - Ponto e vírgula (;) como delimitador
 * - Células com ";", aspas ou quebras de linha envolvidas em aspas e aspas internas duplicadas
 */
export function downloadCsv(headers: string[], rows: (string | number)[][], filename: string) {
  const escape = (v: string | number): string => {
    const s = String(v);
    const needsQuotes = /[;"\r\n]/.test(s);
    if (needsQuotes) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const line = (arr: (string | number)[]) => arr.map(escape).join(';');
  const csv = [line(headers), ...rows.map((r) => line(r))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
