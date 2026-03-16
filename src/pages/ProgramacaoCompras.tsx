import { useMemo, useState } from 'react';
// @ts-ignore - tipos xlsx podem não estar instalados
import * as XLSX from 'xlsx';
import { FileUp, Package, AlertTriangle, ShoppingCart, MinusCircle, CheckCircle, ArrowUp, ArrowDown } from 'lucide-react';

/** Chaves exatas da planilha (com possíveis espaços). */
const COLS = {
  CODIGO: 'CÓD. PEÇA',
  DESCRICAO: 'DESCRIÇÃO',
  PRODUTO: 'PRODUTO',
  FORNECEDOR: 'FORNECEDOR',
  ESTOQUE: 'TOTAL ESTOQUES (11 e 25)',
  MEDIA_MENSAL: 'MÉDIA  (ÚLTIMOS 6 MESES)',
  MESES_ESTOQUE: 'Meses de estoque',
  QTD_COMPRAR: 'Qtd a Comprar',
  STATUS: 'Status',
} as const;

type RegistroBruto = Record<string, unknown>;

export interface ItemEstoque {
  codigo: string;
  descricao: string;
  produto: string;
  fornecedor: string;
  estoque: number;
  mediaMensal: number;
  mesesEstoque: number;
  qtdComprar: number;
  status: string;
}

function normalizarTexto(valor: unknown): string {
  if (valor == null) return '';
  return String(valor).trim();
}

/** Converte valor da planilha para número: mesma lógica de limpeza (milhar BR, vírgula decimal). */
function parseNum(valor: unknown): number {
  if (valor == null || valor === '') return 0;
  let numStr = typeof valor === 'number' ? valor.toString() : String(valor);
  numStr = numStr.trim();
  if (numStr.includes(',') && numStr.includes('.')) {
    numStr = numStr.replace(/\./g, '').replace(',', '.');
  } else if (numStr.includes(',')) {
    numStr = numStr.replace(',', '.');
  } else if ((numStr.match(/\./g) || []).length > 1) {
    numStr = numStr.replace(/\./g, '');
  }
  const num = parseFloat(numStr);
  return Number.isNaN(num) ? 0 : num;
}

function getCol(row: RegistroBruto, key: string, fallback = ''): string {
  const v = row[key] ?? row[key.trim()];
  return normalizarTexto(v ?? fallback);
}

function getColAny(row: RegistroBruto, keys: string[], fallback = ''): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return normalizarTexto(v);
  }
  return fallback;
}

function getColNum(row: RegistroBruto, key: string): number {
  const v = row[key] ?? row[key.trim()];
  return parseNum(v);
}

function getColNumAny(row: RegistroBruto, keys: string[]): number {
  for (const k of keys) {
    const v = row[k];
    if (v != null && v !== '') return parseNum(v);
  }
  return 0;
}

function mapearLinha(row: RegistroBruto): ItemEstoque {
  return {
    codigo: getCol(row, COLS.CODIGO),
    descricao: getCol(row, COLS.DESCRICAO),
    produto: getColAny(row, [COLS.PRODUTO, 'PRODUTO ', 'PRODUTO']),
    fornecedor: getCol(row, COLS.FORNECEDOR),
    estoque: getColNum(row, COLS.ESTOQUE),
    mediaMensal: getColNumAny(row, [COLS.MEDIA_MENSAL, 'MÉDIA (ÚLTIMOS 6 MESES)', 'MÉDIA  (ÚLTIMOS 6 MESES)']),
    mesesEstoque: getColNum(row, COLS.MESES_ESTOQUE),
    qtdComprar: getColNum(row, COLS.QTD_COMPRAR),
    status: getCol(row, COLS.STATUS),
  };
}

function statusNormalizado(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === 'crítico' || s === 'critico') return 'Crítico';
  if (s === 'ok') return 'OK';
  if (s === 'sem giro') return 'Sem giro';
  return status.trim() || '';
}

/** Limpeza numérica agressiva: remove pontuação de milhar antes de converter para float. Não usar na exportação. */
const formatarNumero = (valor: any, apenasInteiro: boolean = false): string => {
  if (valor === null || valor === undefined || valor === '') return '0';

  let numStr = String(valor);
  if (typeof valor === 'number') {
    numStr = valor.toString();
  }
  numStr = numStr.trim();

  if (numStr.includes(',') && numStr.includes('.')) {
    numStr = numStr.replace(/\./g, '');
    numStr = numStr.replace(',', '.');
  } else if (numStr.includes(',')) {
    numStr = numStr.replace(',', '.');
  } else if ((numStr.match(/\./g) || []).length > 1) {
    numStr = numStr.replace(/\./g, '');
  }

  const num = parseFloat(numStr);
  if (isNaN(num)) return String(valor);

  if (apenasInteiro) {
    return Math.round(num).toLocaleString('pt-BR');
  }
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
};

/** Retorna lista de produtos individuais a partir do valor da coluna (ex: "POP S; POP Z; UDC"). */
function listarProdutos(produtoRaw: string): string[] {
  if (!produtoRaw || !String(produtoRaw).trim()) return [];
  return String(produtoRaw)
    .split(';')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** Verifica se a peça contém o produto selecionado (lista da coluna PRODUTO). */
function pecaContemProduto(produtoRaw: string, produtoSelecionado: string): boolean {
  const lista = listarProdutos(produtoRaw);
  const sel = produtoSelecionado.trim().toLowerCase();
  if (!sel) return true;
  return lista.some((p) => p.trim().toLowerCase() === sel);
}

export function ProgramacaoCompras() {
  const [itens, setItens] = useState<ItemEstoque[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroProduto, setFiltroProduto] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [ordenacao, setOrdenacao] = useState<{ coluna: string; direcao: 'asc' | 'desc' } | null>(null);

  const itensFiltrados = useMemo(() => {
    let list = itens;
    const b = normalizarTexto(busca).toLowerCase();
    if (b) {
      list = list.filter(
        (i) =>
          i.codigo.toLowerCase().includes(b) || i.descricao.toLowerCase().includes(b),
      );
    }
    if (filtroProduto) {
      list = list.filter((i) => pecaContemProduto(i.produto, filtroProduto));
    }
    if (filtroStatus) {
      list = list.filter((i) => statusNormalizado(i.status) === filtroStatus);
    }
    const resultado = [...list];
    if (ordenacao) {
      resultado.sort((a, b) => {
        const valA = (a as unknown as Record<string, unknown>)[ordenacao.coluna];
        const valB = (b as unknown as Record<string, unknown>)[ordenacao.coluna];
        const numA = typeof valA === 'number' ? valA : parseFloat(String(valA ?? '').replace(',', '.'));
        const numB = typeof valB === 'number' ? valB : parseFloat(String(valB ?? '').replace(',', '.'));
        if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
          return ordenacao.direcao === 'asc' ? numA - numB : numB - numA;
        }
        return ordenacao.direcao === 'asc'
          ? String(valA ?? '').localeCompare(String(valB ?? ''))
          : String(valB ?? '').localeCompare(String(valA ?? ''));
      });
    }
    return resultado;
  }, [itens, busca, filtroProduto, filtroStatus, ordenacao]);

  const totalAComprar = useMemo(() => {
    return itensFiltrados.reduce((acc, item) => {
      const val = item.qtdComprar;
      const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
      return acc + (Number.isNaN(num) ? 0 : num);
    }, 0);
  }, [itensFiltrados]);

  const handleSort = (coluna: string) => {
    if (ordenacao?.coluna === coluna) {
      setOrdenacao({ coluna, direcao: ordenacao.direcao === 'asc' ? 'desc' : 'asc' });
    } else {
      setOrdenacao({ coluna, direcao: 'desc' });
    }
  };

  const opcoesProduto = useMemo(() => {
    const set = new Set<string>();
    itens.forEach((i) => {
      listarProdutos(i.produto).forEach((p) => set.add(p));
    });
    return Array.from(set).sort();
  }, [itens]);

  const kpis = useMemo(() => {
    const criticos = itens.filter((i) => statusNormalizado(i.status) === 'Crítico').length;
    const totalComprar = itens.reduce((acc, i) => acc + i.qtdComprar, 0);
    const semGiro = itens.filter((i) => statusNormalizado(i.status) === 'Sem giro').length;
    const saudavel = itens.filter((i) => statusNormalizado(i.status) === 'OK').length;
    return { criticos, totalComprar, semGiro, saudavel };
  }, [itens]);

  /** Lista para exportação: números brutos (sem formatação) para o Excel conseguir somar. */
  const itensParaExportar = useMemo(() => {
    return itensFiltrados
      .filter((i) => i.qtdComprar > 0)
      .map((i) => ({
        'Código': i.codigo,
        'Descrição': i.descricao,
        'Fornecedor': i.fornecedor,
        'Quantidade': Number(i.qtdComprar),
      }));
  }, [itensFiltrados]);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result;
      if (!data) return;
      const wb = XLSX.read(data, { type: 'array' });
      const first = wb.SheetNames[0];
      const sheet = wb.Sheets[first];
      const raw: RegistroBruto[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      setItens(raw.map((r) => mapearLinha(r)));
      setBusca('');
      setFiltroProduto('');
      setFiltroStatus('');
    };
    reader.readAsArrayBuffer(file);
  }

  function handleExportar() {
    if (itensParaExportar.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(itensParaExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pedido');
    XLSX.writeFile(wb, 'pedido_compras_atu.xlsx');
  }

  function tagStatus(status: string) {
    const s = statusNormalizado(status);
    if (s === 'Crítico')
      return (
        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
          Crítico
        </span>
      );
    if (s === 'OK')
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
          OK
        </span>
      );
    if (s === 'Sem giro')
      return (
        <span className="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-700">
          Sem giro
        </span>
      );
    return <span className="text-gray-600">{status || '—'}</span>;
  }

  const temDados = itens.length > 0;

  return (
    <div className="min-h-screen -m-6 bg-gray-100 p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#CC0000]/10 text-[#CC0000]">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Programação de Compras
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Gestão de estoque e sugestão de compras da Assistência Técnica
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#CC0000]/10 text-[#CC0000]">
              <FileUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Upload da planilha</p>
              <p className="text-xs text-gray-600">
                Arquivo Excel ou CSV com colunas: Cód. Peça, Descrição, Produto, Fornecedor, Total Estoques, Média 6 meses, Meses de estoque, Qtd a Comprar, Status.
              </p>
            </div>
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-[#CC0000]">
            Selecionar arquivo
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {temDados && (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-3 rounded-lg bg-white p-4 shadow">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-700">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Itens Críticos</p>
                <p className="text-xl font-bold text-gray-800">{kpis.criticos}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-white p-4 shadow">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#CC0000]/10 text-[#CC0000]">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Total a Comprar (Peças)</p>
                <p className="text-xl font-bold text-urano-gray-dark">{formatarNumero(totalAComprar, true)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-white p-4 shadow">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-gray-700">
                <MinusCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Itens Sem Giro</p>
                <p className="text-xl font-bold text-gray-800">{kpis.semGiro}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-white p-4 shadow">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-700">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Estoque Saudável</p>
                <p className="text-xl font-bold text-gray-800">{kpis.saudavel}</p>
              </div>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                Busca (Código ou Descrição)
              </label>
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Digite para filtrar..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]"
              />
            </div>
            <div className="w-48">
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">Produto</label>
              <select
                value={filtroProduto}
                onChange={(e) => setFiltroProduto(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]"
              >
                <option value="">Todos</option>
                {opcoesProduto.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="w-40">
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">Status</label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]"
              >
                <option value="">Todos</option>
                <option value="Crítico">Crítico</option>
                <option value="OK">OK</option>
                <option value="Sem giro">Sem giro</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleExportar}
                disabled={itensParaExportar.length === 0}
                className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
              >
                Exportar Pedido de Compra
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
            <div className="w-full overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Código
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Descrição
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Fornecedor
                    </th>
                    <th
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSort('estoque')}
                      onKeyDown={(e) => e.key === 'Enter' && handleSort('estoque')}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 cursor-pointer transition-colors hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <span>Estoque</span>
                        {ordenacao?.coluna === 'estoque' && (
                          ordenacao.direcao === 'asc' ? <ArrowUp className="h-4 w-4 text-gray-400" /> : <ArrowDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </th>
                    <th
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSort('mediaMensal')}
                      onKeyDown={(e) => e.key === 'Enter' && handleSort('mediaMensal')}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 cursor-pointer transition-colors hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <span>Giro Mensal</span>
                        {ordenacao?.coluna === 'mediaMensal' && (
                          ordenacao.direcao === 'asc' ? <ArrowUp className="h-4 w-4 text-gray-400" /> : <ArrowDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </th>
                    <th
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSort('mesesEstoque')}
                      onKeyDown={(e) => e.key === 'Enter' && handleSort('mesesEstoque')}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 cursor-pointer transition-colors hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <span>Meses Estoque</span>
                        {ordenacao?.coluna === 'mesesEstoque' && (
                          ordenacao.direcao === 'asc' ? <ArrowUp className="h-4 w-4 text-gray-400" /> : <ArrowDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </th>
                    <th
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSort('qtdComprar')}
                      onKeyDown={(e) => e.key === 'Enter' && handleSort('qtdComprar')}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 cursor-pointer transition-colors hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <span>Qtd a Comprar</span>
                        {ordenacao?.coluna === 'qtdComprar' && (
                          ordenacao.direcao === 'asc' ? <ArrowUp className="h-4 w-4 text-gray-400" /> : <ArrowDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {itensFiltrados.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-800">{row.codigo || '—'}</td>
                      <td className="max-w-xs truncate px-4 py-2 text-gray-700" title={row.descricao}>{row.descricao || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-700">{row.fornecedor || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-700">{formatarNumero(row.estoque, true)}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-700">{formatarNumero(row.mediaMensal, false)}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-700">{formatarNumero(row.mesesEstoque, false)}</td>
                      <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-800">{formatarNumero(row.qtdComprar, true)}</td>
                      <td className="whitespace-nowrap px-4 py-2">{tagStatus(row.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {itensFiltrados.length === 0 && (
              <div className="py-12 text-center text-gray-500">Nenhum item encontrado com os filtros aplicados.</div>
            )}
          </div>
        </>
      )}

      {!temDados && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-600">Faça o upload de uma planilha para ver os KPIs e a tabela de análise.</p>
        </div>
      )}
    </div>
  );
}
