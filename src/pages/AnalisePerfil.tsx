import { useMemo, useState } from 'react';
// @ts-ignore - tipos de xlsx podem não estar instalados
import * as XLSX from 'xlsx';
// @ts-ignore - tipos de recharts podem não estar instalados
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  FileUp,
  SlidersHorizontal,
  Activity,
  Building2,
  Globe,
  Truck,
  LayoutGrid,
} from 'lucide-react';

type RegistroBruto = Record<string, any>;
type TipoGrafico = 'bar' | 'pie';

const CORES_URANO = ['#CC0000', '#FF4444', '#0055A4', '#3b82f6', '#4b5563', '#9ca3af'];

const SIGLAS_UF = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
  'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
]);

interface Filtros {
  atividade: string;
  uf: string;
}

const FILTROS_INICIAIS: Filtros = {
  atividade: '',
  uf: '',
};

function normalizarTexto(valor: any): string {
  if (valor == null) return '';
  return String(valor).trim();
}

function lerSimNao(valor: any): 'SIM' | 'NÃO' {
  if (valor == null) return 'NÃO';
  const s = String(valor).trim().toLowerCase();
  return s.includes('sim') ? 'SIM' : 'NÃO';
}

/** Extrai a sigla de 2 letras do estado no final da string de Endereço. */
function extrairUF(enderecoCompleto: string): string {
  const texto = normalizarTexto(enderecoCompleto).toUpperCase();
  if (!texto) return '';
  const ultimasDuas = texto.slice(-2);
  if (SIGLAS_UF.has(ultimasDuas)) return ultimasDuas;
  const matchSigla = texto.match(
    /\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MG|MS|MT|PA|PB|PE|PI|PR|RJ|RN|RO|RR|RS|SC|SE|SP|TO)\b/,
  );
  if (matchSigla) return matchSigla[0];
  return texto.length >= 2 ? ultimasDuas : '';
}

function presencaDigital(site: any, instagram: any): 'SIM' | 'NÃO' {
  const temSite = normalizarTexto(site);
  const temInsta = normalizarTexto(instagram);
  return temSite || temInsta ? 'SIM' : 'NÃO';
}

function explodirCampo(campo: any): string[] {
  const texto = normalizarTexto(campo);
  if (!texto) return [];
  return texto
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function parseBancadas(valor: any): number {
  if (valor == null) return 0;
  const n = parseInt(String(valor).replace(/\D/g, ''), 10);
  return Number.isNaN(n) ? 0 : n;
}

type AreaConhecimento = 'MECÂNICA' | 'ELETRÔNICA' | 'TCP-IP';

interface ConhecimentoPorArea {
  Basico: number;
  Medio: number;
  Elevado: number;
}

interface AnaliseConhecimento {
  totalTecnicos: number;
  porArea: Record<AreaConhecimento, ConhecimentoPorArea>;
}

function bucketizarNivel(valor: string): keyof ConhecimentoPorArea {
  const up = valor.toUpperCase();
  if (up.includes('BÁSICO') || up.includes('BASICO')) return 'Basico';
  if (
    up.includes('MÉDIO') ||
    up.includes('MEDIO') ||
    up.includes('INTERMEDIÁRIO') ||
    up.includes('INTERMEDIARIO')
  )
    return 'Medio';
  if (up.includes('ALTO') || up.includes('AVANÇADO') || up.includes('AVANCADO') || up.includes('ELEVADO'))
    return 'Elevado';
  return 'Medio';
}

function detectarArea(chaveLower: string): AreaConhecimento | null {
  if (chaveLower.includes('mecanic')) return 'MECÂNICA';
  if (chaveLower.includes('eletr')) return 'ELETRÔNICA';
  if (chaveLower.includes('tcp-ip') || chaveLower.includes('tcpip')) return 'TCP-IP';
  return null;
}

function analisarConhecimentoTecnico(registros: any[]): AnaliseConhecimento {
  const porArea: Record<AreaConhecimento, ConhecimentoPorArea> = {
    'MECÂNICA': { Basico: 0, Medio: 0, Elevado: 0 },
    'ELETRÔNICA': { Basico: 0, Medio: 0, Elevado: 0 },
    'TCP-IP': { Basico: 0, Medio: 0, Elevado: 0 },
  };
  const tecnicosSet = new Set<string>();
  registros.forEach((r, idx) => {
    const baseId = (r.ID as string) ?? (r.id as string) ?? String(idx);
    Object.keys(r).forEach((chave) => {
      const chaveLower = chave.toLowerCase();
      if (!chaveLower.includes('nível de conhecimento') && !chaveLower.includes('nivel de conhecimento')) return;
      const area = detectarArea(chaveLower);
      if (!area) return;
      const valorBruto = (r as any)[chave];
      const texto = normalizarTexto(valorBruto);
      if (!texto) return;
      const matchNum = chave.match(/(\d+)/);
      const indiceTecnico = matchNum ? matchNum[1] : '1';
      const tecnicoKey = `${baseId}-${area}-${indiceTecnico}`;
      tecnicosSet.add(tecnicoKey);
      const bucket = bucketizarNivel(texto);
      porArea[area][bucket] += 1;
    });
  });
  return { totalTecnicos: tecnicosSet.size, porArea };
}

export function AnalisePerfil() {
  const [registrosBrutos, setRegistrosBrutos] = useState<RegistroBruto[]>([]);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);
  const [mostrarDashboard, setMostrarDashboard] = useState(false);
  const [tipoGraficoMapas, setTipoGraficoMapas] = useState<TipoGrafico>('bar');

  const registrosEnriquecidos = useMemo<any[]>(() => {
    return registrosBrutos.map((r) => {
      const endereco = normalizarTexto(
        r['Endereço Completo (Incluir Rua, CEP, Cidade, Bairro, UF)'] ?? '',
      );
      const ufExtraida = extrairUF(endereco);
      const ufColuna = normalizarTexto(r['UF'] ?? '');
      const atividade = normalizarTexto(r['Qual tipo de atividade sua empresa faz?'] ?? '');
      const tempoAtividade = normalizarTexto(r['Tempo de atividade da empresa'] ?? '');
      const ipem = lerSimNao(r['Possui registro vigente no IPEM/INMETRO?']);
      const sede = lerSimNao(r['Tem sede própria?']);
      const caminhao = lerSimNao(r['Possui caminhão de peso?']);
      const bancadas = parseBancadas(r['Quantidade de bancadas:  ']);
      const linhasAtuacao = explodirCampo(r['Com quais capacidades você trabalha?'] ?? '');
      const rbc = lerSimNao(r['Possui certificação RBC?  ']);
      const segmentos = explodirCampo(r['Sua assistência técnica atende quais segmentos? '] ?? '');

      const site = normalizarTexto(r['Site'] ?? r['Site:'] ?? r['SITE'] ?? '');
      const instagram = normalizarTexto(r['Instagram'] ?? r['INSTAGRAM'] ?? '');
      const presenca = presencaDigital(site, instagram);

      const marcas = explodirCampo(
        r['A empresa que você trabalha realiza serviços de manutenção em outras marcas?'] ?? '',
      );
      const modelosUrano = explodirCampo(
        r['Quais destes modelos da Urano você conhece ou já teve contato:'] ?? '',
      );

      return {
        ...r,
        ATIVIDADE_URANO: atividade,
        UF_URANO: ufColuna || ufExtraida,
        TEMPO_ATIVIDADE_URANO: tempoAtividade,
        IPEM_URANO: ipem,
        SEDE_PROPRIA_URANO: sede,
        CAMINHAO_URANO: caminhao,
        BANCADAS_URANO: bancadas,
        LINHAS_ATUACAO_URANO: linhasAtuacao,
        RBC_URANO: rbc,
        SEGMENTOS_URANO: segmentos,
        PRESENCA_DIGITAL_URANO: presenca,
        MARCAS_URANO: marcas,
        MODELOS_URANO: modelosUrano,
      };
    });
  }, [registrosBrutos]);

  const registrosFiltrados = useMemo<any[]>(() => {
    return registrosEnriquecidos.filter((r) => {
      if (filtros.atividade && r.ATIVIDADE_URANO !== filtros.atividade) return false;
      if (filtros.uf && r.UF_URANO !== filtros.uf) return false;
      return true;
    });
  }, [registrosEnriquecidos, filtros]);

  const opcoesAtividade = useMemo(() => {
    const set = new Set<string>();
    registrosEnriquecidos.forEach((r) => {
      const v = r.ATIVIDADE_URANO;
      if (v) set.add(v);
    });
    return Array.from(set).sort();
  }, [registrosEnriquecidos]);

  const opcoesUF = useMemo(() => {
    const set = new Set<string>();
    registrosEnriquecidos.forEach((r) => {
      const v = r.UF_URANO;
      if (v) set.add(v);
    });
    return Array.from(set).sort();
  }, [registrosEnriquecidos]);
  function parseTempoAtividadeMeses(texto: string): number {
    const t = normalizarTexto(texto).toLowerCase();
    if (!t) return 0;
    let anos = 0;
    let meses = 0;

    const matchAnos = t.match(/(\d+)\s*ano/);
    if (matchAnos) {
      anos = Number.parseInt(matchAnos[1], 10) || 0;
    }

    const matchMeses = t.match(/(\d+)\s*m[eê]s/);
    if (matchMeses) {
      meses = Number.parseInt(matchMeses[1], 10) || 0;
    }

    if (!matchAnos && !matchMeses) {
      const numeroBruto = Number.parseInt(t.replace(/\D/g, ''), 10);
      if (!Number.isNaN(numeroBruto)) {
        anos = numeroBruto;
      }
    }

    return anos * 12 + meses;
  }

  function formatarMediaTempo(mediaMeses: number): string {
    const total = Math.round(mediaMeses);
    const anos = Math.floor(total / 12);
    const meses = total % 12;
    const partes: string[] = [];
    if (anos > 0) partes.push(`${anos} ano${anos > 1 ? 's' : ''}`);
    if (meses > 0) partes.push(`${meses} mês${meses > 1 ? 'es' : ''}`);
    if (partes.length === 0) return '0 meses';
    return partes.join(' e ');
  }

  const mediaTempoAtividadeMeses = useMemo(() => {
    if (registrosEnriquecidos.length === 0) return 0;
    let soma = 0;
    let cont = 0;
    registrosEnriquecidos.forEach((r) => {
      const m = parseTempoAtividadeMeses(r.TEMPO_ATIVIDADE_URANO);
      if (m > 0) {
        soma += m;
        cont += 1;
      }
    });
    return cont > 0 ? soma / cont : 0;
  }, [registrosEnriquecidos]);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dados = ev.target?.result;
      if (!dados) return;
      const workbook = XLSX.read(dados, { type: 'array' });
      const primeiraAba = workbook.SheetNames[0];
      const sheet = workbook.Sheets[primeiraAba];
      const json: RegistroBruto[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      setRegistrosBrutos(json);
      setFiltros(FILTROS_INICIAIS);
      setMostrarDashboard(false);
    };
    reader.readAsArrayBuffer(file);
  }

  const totalEmpresas = registrosEnriquecidos.length;
  const totalPresencaDigital = useMemo(
    () => registrosEnriquecidos.filter((r) => r.PRESENCA_DIGITAL_URANO === 'SIM').length,
    [registrosEnriquecidos],
  );
  const totalCaminhao = useMemo(
    () => registrosEnriquecidos.filter((r) => r.CAMINHAO_URANO === 'SIM').length,
    [registrosEnriquecidos],
  );
  const totalBancadas = useMemo(
    () => registrosEnriquecidos.reduce((acc, r) => acc + (r.BANCADAS_URANO ?? 0), 0),
    [registrosEnriquecidos],
  );
  const totalIpeM = useMemo(
    () => registrosEnriquecidos.filter((r) => r.IPEM_URANO === 'SIM').length,
    [registrosEnriquecidos],
  );
  const totalRbc = useMemo(
    () => registrosEnriquecidos.filter((r) => r.RBC_URANO === 'SIM').length,
    [registrosEnriquecidos],
  );
  const { porArea } = useMemo(
    () => analisarConhecimentoTecnico(registrosFiltrados),
    [registrosFiltrados],
  );

  const percPresencaDigital = totalEmpresas ? (totalPresencaDigital / totalEmpresas) * 100 : 0;
  const percCaminhao = totalEmpresas ? (totalCaminhao / totalEmpresas) * 100 : 0;

  const ufData = useMemo(() => {
    const mapa: Record<string, number> = {};
    registrosFiltrados.forEach((r) => {
      const uf = r.UF_URANO || '(sem UF)';
      mapa[uf] = (mapa[uf] ?? 0) + 1;
    });
    return Object.entries(mapa)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [registrosFiltrados]);

  const tiposEmpresaData = useMemo(() => {
    const mapa: Record<string, number> = {};
    registrosFiltrados.forEach((r) => {
      const a = r.ATIVIDADE_URANO || '(não informado)';
      mapa[a] = (mapa[a] ?? 0) + 1;
    });
    return Object.entries(mapa)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [registrosFiltrados]);

  const linhasAtuacaoData = useMemo(() => {
    const mapa: Record<string, number> = {};
    registrosFiltrados.forEach((r) => {
      const arr: string[] = r.LINHAS_ATUACAO_URANO ?? [];
      arr.forEach((item) => {
        const key = normalizarTexto(item) || '(vazio)';
        if (key) mapa[key] = (mapa[key] ?? 0) + 1;
      });
    });
    return Object.entries(mapa)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [registrosFiltrados]);

  const pizzaIpeMData = useMemo(
    () => [
      { name: 'SIM', value: totalIpeM },
      { name: 'NÃO', value: totalEmpresas - totalIpeM },
    ],
    [totalIpeM, totalEmpresas],
  );

  const pizzaRbcData = useMemo(
    () => [
      { name: 'SIM', value: totalRbc },
      { name: 'NÃO', value: totalEmpresas - totalRbc },
    ],
    [totalRbc, totalEmpresas],
  );

  const pizzaSedeData = useMemo(() => {
    let sim = 0;
    let nao = 0;
    registrosEnriquecidos.forEach((r) => {
      if (r.SEDE_PROPRIA_URANO === 'SIM') sim += 1;
      else nao += 1;
    });
    return [
      { name: 'SIM', value: sim },
      { name: 'NÃO', value: nao },
    ];
  }, [registrosEnriquecidos]);

  function montarFrequenciaArray(campo: 'SEGMENTOS_URANO' | 'MARCAS_URANO' | 'MODELOS_URANO') {
    const mapa: Record<string, number> = {};
    registrosFiltrados.forEach((r) => {
      const arr: string[] = (r as any)[campo] ?? [];
      arr.forEach((item) => {
        const key = normalizarTexto(item).toUpperCase() || '(vazio)';
        if (key) mapa[key] = (mapa[key] ?? 0) + 1;
      });
    });
    return Object.entries(mapa)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }

  const modelosData = useMemo(
    () => montarFrequenciaArray('MODELOS_URANO').slice(0, 10),
    [registrosFiltrados],
  );
  const marcasData = useMemo(
    () => montarFrequenciaArray('MARCAS_URANO').slice(0, 10),
    [registrosFiltrados],
  );
  const segmentosData = useMemo(
    () => montarFrequenciaArray('SEGMENTOS_URANO').slice(0, 10),
    [registrosFiltrados],
  );

  const conhecimentoData = useMemo(
    () => [
      {
        area: 'MECÂNICA',
        Basico: porArea['MECÂNICA'].Basico,
        Medio: porArea['MECÂNICA'].Medio,
        Elevado: porArea['MECÂNICA'].Elevado,
      },
      {
        area: 'ELETRÔNICA',
        Basico: porArea['ELETRÔNICA'].Basico,
        Medio: porArea['ELETRÔNICA'].Medio,
        Elevado: porArea['ELETRÔNICA'].Elevado,
      },
      {
        area: 'TCP-IP',
        Basico: porArea['TCP-IP'].Basico,
        Medio: porArea['TCP-IP'].Medio,
        Elevado: porArea['TCP-IP'].Elevado,
      },
    ],
    [porArea],
  );

  return (
    <div className="min-h-screen -m-6 bg-gray-100 p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#CC0000]/10 text-[#CC0000]">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-urano-gray-dark">
              Análise de Perfil dos Credenciados
            </h1>
            <p className="mt-1 text-sm text-urano-gray">
              Business Intelligence sobre credenciados, presença digital e capacidade técnica
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
              <p className="text-sm font-semibold text-urano-gray-dark">
                Upload de planilha de credenciamento
              </p>
              <p className="text-xs text-urano-gray">
                Aceita arquivos .xlsx, .xls ou .csv com os campos padrão do formulário Urano.
              </p>
            </div>
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-urano-gray-dark shadow-sm hover:bg-gray-50">
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

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow">
        <div className="mb-4 flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[#CC0000]" />
          <h2 className="text-sm font-semibold uppercase text-urano-gray-dark">
            Filtros do perfil
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 uppercase">
              Atividade
            </label>
            <select
              value={filtros.atividade}
              onChange={(e) => setFiltros((f) => ({ ...f, atividade: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]"
            >
              <option value="">Todas</option>
              {opcoesAtividade.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 uppercase">UF</label>
            <select
              value={filtros.uf}
              onChange={(e) => setFiltros((f) => ({ ...f, uf: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]"
            >
              <option value="">Todas</option>
              {opcoesUF.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={registrosEnriquecidos.length === 0}
            onClick={() => setMostrarDashboard(true)}
            className="rounded-lg bg-[#CC0000] px-6 py-2 text-sm font-bold uppercase text-white shadow-md hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
          >
            Gerar dashboard
          </button>
        </div>
      </div>

      {mostrarDashboard && (
        <div className="space-y-6">
          {/* KPIs no topo: Empresas Lidas, Presença Digital %, Caminhão %, Total Bancadas, Tempo médio de atividade */}
          <div className="grid gap-4 md:grid-cols-5">
            <div className="flex items-center gap-3 rounded-lg bg-white p-4 shadow">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#CC0000]/10 text-[#CC0000]">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Empresas lidas</p>
                <p className="text-xl font-bold text-urano-gray-dark">{totalEmpresas}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-white p-4 shadow">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0055A4]/10 text-[#0055A4]">
                <Globe className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Presença Digital</p>
                <p className="text-xl font-bold text-urano-gray-dark">
                  {percPresencaDigital.toFixed(0)}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-white p-4 shadow">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3b82f6]/10 text-[#3b82f6]">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Caminhão de Peso</p>
                <p className="text-xl font-bold text-urano-gray-dark">
                  {percCaminhao.toFixed(0)}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-white p-4 shadow">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4b5563]/10 text-[#4b5563]">
                <LayoutGrid className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Total de Bancadas</p>
                <p className="text-xl font-bold text-urano-gray-dark">{totalBancadas}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-white p-4 shadow">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0055A4]/10 text-[#0055A4]">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Tempo médio de atividade
                </p>
                <p className="text-sm font-bold text-urano-gray-dark">
                  {formatarMediaTempo(mediaTempoAtividadeMeses)}
                </p>
              </div>
            </div>
          </div>

          {/* Novos gráficos: UF, Tipos de Empresa, Linhas de Atuação */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-white p-4 shadow">
              <h3 className="mb-3 text-sm font-semibold uppercase text-urano-gray-dark">
                Empresas por UF
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ufData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      angle={-25}
                      textAnchor="end"
                      height={70}
                      tick={{ fontSize: 10, fill: '#444444' }}
                    />
                    <YAxis allowDecimals={false} tick={{ fill: '#444444' }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Quantidade" fill="#0055A4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow">
              <h3 className="mb-3 text-sm font-semibold uppercase text-urano-gray-dark">
                Tipos de Empresa (Atividade)
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tiposEmpresaData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name.length > 15 ? name.slice(0, 15) + '…' : name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {tiposEmpresaData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CORES_URANO[i % CORES_URANO.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow">
              <h3 className="mb-3 text-sm font-semibold uppercase text-urano-gray-dark">
                Linhas de Atuação (Top 10)
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={linhasAtuacaoData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      angle={-25}
                      textAnchor="end"
                      height={70}
                      tick={{ fontSize: 10, fill: '#444444' }}
                    />
                    <YAxis allowDecimals={false} tick={{ fill: '#444444' }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Quantidade" fill="#CC0000" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-white p-4 shadow">
              <h3 className="mb-3 text-sm font-semibold uppercase text-urano-gray-dark">
                Certificações IPEM (SIM x NÃO)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pizzaIpeMData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {pizzaIpeMData.map((entry, i) => (
                        <Cell
                          key={entry.name}
                          fill={CORES_URANO[i % CORES_URANO.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow">
              <h3 className="mb-3 text-sm font-semibold uppercase text-urano-gray-dark">
                Certificações RBC (SIM x NÃO)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pizzaRbcData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {pizzaRbcData.map((entry, i) => (
                        <Cell
                          key={entry.name}
                          fill={CORES_URANO[i % CORES_URANO.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow">
              <h3 className="mb-3 text-sm font-semibold uppercase text-urano-gray-dark">
                Sede própria (SIM x NÃO)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pizzaSedeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {pizzaSedeData.map((entry, i) => (
                        <Cell
                          key={entry.name}
                          fill={CORES_URANO[i % CORES_URANO.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-white p-4 shadow">
              <h3 className="mb-3 text-sm font-semibold uppercase text-urano-gray-dark">
                Segmentos atendidos (Top 10)
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={segmentosData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      angle={-25}
                      textAnchor="end"
                      height={70}
                      tick={{ fontSize: 10, fill: '#444444' }}
                    />
                    <YAxis allowDecimals={false} tick={{ fill: '#444444' }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Quantidade" fill="#CC0000" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow">
              <h3 className="mb-3 text-sm font-semibold uppercase text-urano-gray-dark">
                Marcas de terceiros (Top 10)
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={marcasData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      angle={-25}
                      textAnchor="end"
                      height={70}
                      tick={{ fontSize: 10, fill: '#444444' }}
                    />
                    <YAxis allowDecimals={false} tick={{ fill: '#444444' }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Quantidade" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow">
              <h3 className="mb-3 text-sm font-semibold uppercase text-urano-gray-dark">
                Modelos Urano dominados (Top 10)
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modelosData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      angle={-25}
                      textAnchor="end"
                      height={70}
                      tick={{ fontSize: 10, fill: '#444444' }}
                    />
                    <YAxis allowDecimals={false} tick={{ fill: '#444444' }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Quantidade" fill="#0055A4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-4 shadow">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase text-urano-gray-dark">
                Mapa de conhecimento técnico (Mecânica / Eletrônica / TCP-IP)
              </h3>
              <div className="flex gap-2 text-[11px] text-gray-600">
                <span className="mr-1 inline-flex h-3 w-3 rounded-full bg-gray-400" /> Básico
                <span className="ml-4 mr-1 inline-flex h-3 w-3 rounded-full bg-[#CC0000]" /> Médio
                <span className="ml-4 mr-1 inline-flex h-3 w-3 rounded-full bg-[#FF4444]" /> Elevado
              </div>
            </div>
            <div className="mb-2 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setTipoGraficoMapas('bar')}
                className={`rounded-md px-3 py-1 font-semibold uppercase ${
                  tipoGraficoMapas === 'bar'
                    ? 'bg-[#CC0000] text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Torre
              </button>
              <button
                type="button"
                onClick={() => setTipoGraficoMapas('pie')}
                className={`rounded-md px-3 py-1 font-semibold uppercase ${
                  tipoGraficoMapas === 'pie'
                    ? 'bg-[#CC0000] text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Pizza (por área)
              </button>
            </div>
            <div className="h-80">
              {tipoGraficoMapas === 'bar' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={conhecimentoData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="area" tick={{ fill: '#444444' }} />
                    <YAxis allowDecimals={false} tick={{ fill: '#444444' }} />
                    <Tooltip />
                    <Bar dataKey="Basico" name="Básico" fill="#9ca3af" />
                    <Bar dataKey="Medio" name="Médio" fill="#CC0000" />
                    <Bar dataKey="Elevado" name="Elevado" fill="#FF4444" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: 'MECÂNICA',
                          value:
                            porArea['MECÂNICA'].Basico +
                            porArea['MECÂNICA'].Medio +
                            porArea['MECÂNICA'].Elevado,
                        },
                        {
                          name: 'ELETRÔNICA',
                          value:
                            porArea['ELETRÔNICA'].Basico +
                            porArea['ELETRÔNICA'].Medio +
                            porArea['ELETRÔNICA'].Elevado,
                        },
                        {
                          name: 'TCP-IP',
                          value:
                            porArea['TCP-IP'].Basico +
                            porArea['TCP-IP'].Medio +
                            porArea['TCP-IP'].Elevado,
                        },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      <Cell fill="#CC0000" />
                      <Cell fill="#FF4444" />
                      <Cell fill="#0055A4" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
