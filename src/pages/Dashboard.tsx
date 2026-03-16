import { useMemo, useState } from 'react';
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
import { TrendingUp } from 'lucide-react';
import { getBoardsStorage, getCardsStorage } from '../data/storage';
import type { KanbanBoard, KanbanCard } from '../types';

const CORES = ['#c41e3a', '#9e1830', '#e63950', '#6b7280', '#374151', '#9ca3af'];

function parseValorCompra(valor: string): number {
  if (!valor) return 0;
  let limpo = valor.replace(/R\$\s*/i, '').trim();
  limpo = limpo.replace(/\./g, '').replace(',', '.');
  const num = Number.parseFloat(limpo);
  return Number.isNaN(num) ? 0 : num;
}

export function Dashboard() {
  const boards: KanbanBoard[] = useMemo(() => getBoardsStorage(), []);
  const cards: KanbanCard[] = useMemo(() => getCardsStorage(), []);

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [boardsSelecionados, setBoardsSelecionados] = useState<string[]>(
    () => boards.map((b) => b.id),
  );
  const [dimensaoPizza, setDimensaoPizza] = useState<'linha' | 'modelo'>('linha');

  const mapaColunas = useMemo(() => {
    const map: Record<string, string> = {};
    boards.forEach((b) => {
      b.columns.forEach((c) => {
        map[c.id] = c.title.toUpperCase();
      });
    });
    return map;
  }, [boards]);

  const cardsFiltrados = useMemo(() => {
    const inicio = dataInicio ? new Date(dataInicio + 'T00:00:00') : null;
    const fim = dataFim ? new Date(dataFim + 'T23:59:59') : null;
    const setBoards = new Set(boardsSelecionados);

    return cards.filter((card) => {
      if (setBoards.size > 0 && !setBoards.has(card.boardId)) return false;
      const baseData = card.updatedAt || card.createdAt;
      const d = new Date(baseData);
      if (inicio && d < inicio) return false;
      if (fim && d > fim) return false;
      return true;
    });
  }, [cards, boardsSelecionados, dataInicio, dataFim]);

  const cardsFinalizados = useMemo(
    () => cardsFiltrados.filter((c) => c.finalizado === true),
    [cardsFiltrados],
  );

  const valorTotalNegociado = useMemo(
    () => cardsFinalizados.reduce((acc, c) => acc + parseValorCompra(c.valorCompra), 0),
    [cardsFinalizados],
  );

  const dadosBarrasEtapas = useMemo(() => {
    const map: Record<string, number> = {};
    cardsFiltrados.forEach((c) => {
      const etapa = mapaColunas[c.columnId] ?? c.columnId;
      map[etapa] = (map[etapa] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, quantidade]) => ({ name, quantidade }));
  }, [cardsFiltrados, mapaColunas]);

  const dadosPizza = useMemo(() => {
    const map: Record<string, number> = {};
    cardsFinalizados.forEach((c) => {
      const valor = parseValorCompra(c.valorCompra);
      if (!valor) return;

      if (dimensaoPizza === 'linha') {
        const chave = c.linha ?? 'SEM LINHA';
        map[chave] = (map[chave] ?? 0) + valor;
      } else {
        const modelos =
          Array.isArray(c.modeloBalanca) && c.modeloBalanca.length > 0
            ? c.modeloBalanca
            : ['SEM MODELO'];
        modelos.forEach((m) => {
          map[m] = (map[m] ?? 0) + valor;
        });
      }
    });
    return Object.entries(map).map(([name, value], index) => ({
      name,
      value,
      fill: CORES[index % CORES.length],
    }));
  }, [cardsFinalizados, dimensaoPizza]);

  const toggleBoardSelecionado = (id: string) => {
    setBoardsSelecionados((atual) =>
      atual.includes(id) ? atual.filter((b) => b !== id) : [...atual, id],
    );
  };

  const todosSelecionados = boardsSelecionados.length === boards.length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-urano-gray-dark">Dashboard Gerencial</h1>
          <p className="mt-1 text-sm text-urano-gray">
            Indicadores em tempo real dos quadros do CRM
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)] items-end">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600 uppercase">
                Data início
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-urano-gray-dark focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600 uppercase">
                Data fim
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-urano-gray-dark focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 uppercase">
              Quadros considerados
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setBoardsSelecionados(todosSelecionados ? [] : boards.map((b) => b.id))
                }
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase border ${
                  todosSelecionados
                    ? 'bg-urano-red text-white border-urano-red'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {todosSelecionados ? 'Todos selecionados' : 'Selecionar todos'}
              </button>
              {boards.map((b) => {
                const ativo = boardsSelecionados.includes(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggleBoardSelecionado(b.id)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase border ${
                      ativo
                        ? 'bg-urano-red text-white border-urano-red'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {b.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-urano-red/10 text-urano-red">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">Valor total negociado</p>
            <p className="mt-1 text-2xl font-bold text-urano-red">
              R$ {valorTotalNegociado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-0.5 text-[11px] text-urano-gray">
              Somente cards finalizados nos filtros selecionados
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Cards filtrados</p>
          <p className="mt-1 text-2xl font-bold text-urano-gray-dark">{cardsFiltrados.length}</p>
          <p className="mt-0.5 text-[11px] text-urano-gray">
            Em todos os quadros e etapas selecionados
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Cards finalizados</p>
          <p className="mt-1 text-2xl font-bold text-urano-gray-dark">
            {cardsFinalizados.length}
          </p>
          <p className="mt-0.5 text-[11px] text-urano-gray">
            Dentro do período e quadros filtrados
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-urano-gray-dark">
            Distribuição de cards por etapa
          </h2>
          <div className="h-80">
            {dadosBarrasEtapas.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosBarrasEtapas} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    angle={-25}
                    textAnchor="end"
                    height={70}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value: number) => [value, 'Quantidade de cards']}
                    labelFormatter={(label) => `Etapa: ${label}`}
                  />
                  <Bar dataKey="quantidade" name="Quantidade" radius={[4, 4, 0, 0]} fill="#c41e3a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-urano-gray">
                Nenhum card encontrado para os filtros atuais
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-urano-gray-dark">
              Volume de vendas por {dimensaoPizza === 'linha' ? 'linha' : 'modelo de balança'}
            </h2>
            <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => setDimensaoPizza('linha')}
                className={`rounded-md px-3 py-1 text-[11px] font-semibold uppercase ${
                  dimensaoPizza === 'linha'
                    ? 'bg-urano-red text-white'
                    : 'bg-transparent text-gray-700'
                }`}
              >
                Linha
              </button>
              <button
                type="button"
                onClick={() => setDimensaoPizza('modelo')}
                className={`rounded-md px-3 py-1 text-[11px] font-semibold uppercase ${
                  dimensaoPizza === 'modelo'
                    ? 'bg-urano-red text-white'
                    : 'bg-transparent text-gray-700'
                }`}
              >
                Modelo
              </button>
            </div>
          </div>
          <div className="h-80">
            {dadosPizza.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosPizza}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {dadosPizza.map((entry, i) => (
                      <Cell key={entry.name} fill={entry.fill ?? CORES[i % CORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [
                      `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                      'Valor negociado',
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-urano-gray">
                Nenhum valor finalizado para os filtros atuais
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
