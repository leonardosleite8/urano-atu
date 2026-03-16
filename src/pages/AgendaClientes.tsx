import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, X, FileDown, MessageSquare } from 'lucide-react';
import { formatarCNPJ } from '../utils/cnpj';
import { CLASSIFICACAO_OPCOES, type Cliente, type Classificacao, type HistoricoEmpresa } from '../types';
import { getClientesStorage, setClientesStorage, getCardsStorage } from '../data/storage';
import { downloadCsv } from '../utils/exportCsv';

export function AgendaClientes() {
  const [clientes, setClientes] = useState<Cliente[]>(() => getClientesStorage());
  const [loading, setLoading] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string | null>(() => {
    const inicial = getClientesStorage()[0]?.id;
    return inicial ?? null;
  });
  const [novoHistoricoTexto, setNovoHistoricoTexto] = useState('');
  const [form, setForm] = useState<Partial<Cliente>>({
    nomeEmpresa: '',
    razaoSocial: '',
    cnpj: '',
    uf: '',
    cidade: '',
    endereco: '',
    telefone: '',
    celular: '',
    nomeContato: '',
    email: '',
    classificacao: [],
  });

  useEffect(() => {
    setClientesStorage(clientes);
  }, [clientes]);

  useEffect(() => {
    if (!clienteSelecionadoId && clientes.length > 0) {
      setClienteSelecionadoId(clientes[0].id);
    }
  }, [clienteSelecionadoId, clientes]);

  const abrirNovo = () => {
    setEditandoId(null);
    setForm({
      nomeEmpresa: '',
      razaoSocial: '',
      cnpj: '',
      uf: '',
      cidade: '',
      endereco: '',
      telefone: '',
      celular: '',
      nomeContato: '',
      email: '',
      classificacao: [],
    });
    setModalAberto(true);
  };

  const abrirEditar = (c: Cliente) => {
    setEditandoId(c.id);
    setForm({
      ...c,
      classificacao: c.classificacao ?? [],
    });
    setModalAberto(true);
  };

  const handleCnpjChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    setForm((f) => ({ ...f, cnpj: digits }));
  };

  const toggleClassificacao = (op: Classificacao) => {
    const atuais = form.classificacao ?? [];
    const novo = atuais.includes(op) ? atuais.filter((x) => x !== op) : [...atuais, op];
    setForm((f) => ({ ...f, classificacao: novo }));
  };

  const salvar = () => {
    if (!form.cnpj || form.cnpj.length < 14) return;
    const payload: Cliente = {
      id: editandoId ?? `id-${Date.now()}`,
      nomeEmpresa: form.nomeEmpresa ?? '',
      razaoSocial: form.razaoSocial ?? '',
      cnpj: form.cnpj,
      uf: form.uf ?? '',
      cidade: form.cidade ?? '',
      endereco: form.endereco ?? '',
      telefone: form.telefone ?? '',
      celular: form.celular ?? '',
      nomeContato: form.nomeContato ?? '',
      email: form.email ?? '',
      classificacao: form.classificacao ?? [],
      historicoEmpresa: (form.historicoEmpresa as HistoricoEmpresa[] | undefined) ?? [],
    };
    if (editandoId) {
      setClientes((prev) => prev.map((c) => (c.id === editandoId ? payload : c)));
    } else {
      setClientes((prev) => [...prev, payload]);
    }
    setModalAberto(false);
  };

  const excluir = (id: string) => {
    if (window.confirm('Excluir este cliente?')) setClientes((prev) => prev.filter((c) => c.id !== id));
  };

  const exportarCsv = () => {
    const headers = [
      'Nome da empresa', 'Razão Social', 'CNPJ', 'UF', 'Cidade', 'Endereço', 'Telefone', 'Celular',
      'Nome Contato', 'E-mail', 'Classificação',
    ];
    const rows = clientes.map((c) => [
      c.nomeEmpresa,
      c.razaoSocial,
      formatarCNPJ(c.cnpj),
      c.uf,
      c.cidade,
      c.endereco,
      c.telefone,
      c.celular,
      c.nomeContato,
      c.email,
      (c.classificacao ?? []).join('; '),
    ]);
    downloadCsv(headers, rows, 'agenda-clientes.csv');
  };

  const clienteSelecionado = useMemo(
    () => clientes.find((c) => c.id === clienteSelecionadoId) ?? null,
    [clientes, clienteSelecionadoId]
  );

  const ticketsDoCliente = useMemo(() => {
    if (!clienteSelecionado) return [];
    const limpo = clienteSelecionado.cnpj.replace(/\D/g, '');
    const cards = getCardsStorage();
    return cards.filter((c) => c.cnpj && c.cnpj.replace(/\D/g, '') === limpo);
  }, [clienteSelecionado]);

  const adicionarHistoricoEmpresa = () => {
    const texto = novoHistoricoTexto.trim();
    if (!texto || !clienteSelecionado) return;
    const entrada: HistoricoEmpresa = {
      id: `hist-${Date.now()}`,
      texto: texto.toUpperCase(),
      data: new Date().toISOString(),
    };
    setClientes((prev) =>
      prev.map((c) =>
        c.id === clienteSelecionado.id
          ? { ...c, historicoEmpresa: [...(c.historicoEmpresa ?? []), entrada] }
          : c
      )
    );
    setNovoHistoricoTexto('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-urano-gray">Carregando...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-urano-gray-dark">Agenda de Clientes</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportarCsv}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FileDown className="h-4 w-4" />
            Exportar para Excel
          </button>
          <button
            type="button"
            onClick={abrirNovo}
            className="flex items-center gap-2 rounded-lg bg-urano-red px-4 py-2 text-sm font-medium text-white hover:bg-urano-red-dark"
          >
            <Plus className="h-4 w-4" />
            Novo cliente
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)]">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-urano-gray-dark">Nome da empresa</th>
                <th className="px-4 py-3 font-semibold text-urano-gray-dark">Razão Social</th>
                <th className="px-4 py-3 font-semibold text-urano-gray-dark">CNPJ</th>
                <th className="px-4 py-3 font-semibold text-urano-gray-dark">UF</th>
                <th className="px-4 py-3 font-semibold text-urano-gray-dark">Cidade</th>
                <th className="px-4 py-3 font-semibold text-urano-gray-dark">Contato</th>
                <th className="px-4 py-3 font-semibold text-urano-gray-dark w-24">Ações</th>
              </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr
                    key={c.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      clienteSelecionado?.id === c.id ? 'bg-gray-100' : ''
                    }`}
                    onClick={() => setClienteSelecionadoId(c.id)}
                  >
                    <td className="px-4 py-3">{c.nomeEmpresa}</td>
                    <td className="px-4 py-3">{c.razaoSocial}</td>
                    <td className="px-4 py-3 font-mono text-gray-700">{formatarCNPJ(c.cnpj)}</td>
                    <td className="px-4 py-3">{c.uf}</td>
                    <td className="px-4 py-3">{c.cidade}</td>
                    <td className="px-4 py-3">{c.nomeContato}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirEditar(c);
                          }}
                          className="rounded p-1.5 text-urano-gray hover:bg-gray-200 hover:text-urano-red"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            excluir(c.id);
                          }}
                          className="rounded p-1.5 text-urano-gray hover:bg-red-50 hover:text-red-600"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-lg font-semibold text-urano-gray-dark uppercase">Visão 360º</h2>
              {clienteSelecionado && (
                <p className="mt-1 text-xs text-urano-gray uppercase">
                  {clienteSelecionado.razaoSocial} · {formatarCNPJ(clienteSelecionado.cnpj)} · UF:{' '}
                  {clienteSelecionado.uf}
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-urano-red" />
              <h3 className="text-sm font-semibold text-urano-gray-dark uppercase">
                Tickets em aberto / histórico de atendimento
              </h3>
            </div>
            {clienteSelecionado ? (
              ticketsDoCliente.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {ticketsDoCliente.map((card: any) => (
                    <div
                      key={card.id}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-urano-gray-dark uppercase">
                          {card.razaoSocial}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            card.finalizado
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                          }`}
                        >
                          {card.finalizado ? 'FINALIZADO' : 'EM PROCESSO'}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-urano-gray uppercase">
                        Modelo de balança: {card.modeloBalanca || '—'}
                      </p>
                      {card.valorCompra && (
                        <p className="mt-0.5 text-[11px] font-semibold text-urano-red">
                          Valor: R$ {card.valorCompra}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-urano-gray">Nenhum ticket vinculado a este CNPJ.</p>
              )
            ) : (
              <p className="text-xs text-urano-gray">Selecione um cliente na lista para ver os tickets.</p>
            )}
          </div>

          <div className="border-t border-gray-100 pt-3">
            <h3 className="mb-2 text-sm font-semibold text-urano-gray-dark uppercase">
              Histórico da Empresa
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 mb-2">
              {clienteSelecionado && (clienteSelecionado.historicoEmpresa ?? []).length > 0 ? (
                (clienteSelecionado.historicoEmpresa ?? []).map((h) => (
                  <div
                    key={h.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs"
                  >
                    <p className="font-medium text-gray-800 uppercase">{h.texto}</p>
                    <p className="mt-1 text-[10px] font-semibold text-urano-gray">
                      {new Date(h.data).toLocaleString('pt-BR')}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-urano-gray">
                  Nenhum histórico registrado para esta empresa.
                </p>
              )}
            </div>
            <textarea
              value={novoHistoricoTexto}
              onChange={(e) => setNovoHistoricoTexto(e.target.value.toUpperCase())}
              rows={3}
              placeholder="REGISTRE UM HISTÓRICO DA EMPRESA (VISITAS, DEMANDAS, OBSERVAÇÕES...)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs uppercase focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
            />
            <button
              type="button"
              onClick={adicionarHistoricoEmpresa}
              className="mt-2 w-full rounded-lg bg-gray-800 px-4 py-2 text-xs font-bold text-white hover:bg-gray-900 uppercase"
            >
              Adicionar ao histórico
            </button>
          </div>
        </div>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <h2 className="text-lg font-semibold text-urano-gray-dark">
                {editandoId ? 'Editar cliente' : 'Novo cliente'}
              </h2>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-urano-red"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Nome da empresa</span>
                  <input
                    type="text"
                    value={form.nomeEmpresa ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nomeEmpresa: e.target.value.toUpperCase() }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Razão Social</span>
                  <input
                    type="text"
                    value={form.razaoSocial ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, razaoSocial: e.target.value.toUpperCase() }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">CNPJ</span>
                <input
                  type="text"
                  value={formatarCNPJ(form.cnpj ?? '')}
                  onChange={(e) => handleCnpjChange(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                />
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">UF</span>
                  <input
                    type="text"
                    value={form.uf ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value }))}
                    maxLength={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Cidade</span>
                  <input
                    type="text"
                    value={form.cidade ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cidade: e.target.value.toUpperCase() }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Endereço</span>
                  <input
                    type="text"
                    value={form.endereco ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, endereco: e.target.value.toUpperCase() }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                  />
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Telefone</span>
                  <input
                    type="text"
                    value={form.telefone ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, telefone: e.target.value.toUpperCase() }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Celular</span>
                  <input
                    type="text"
                    value={form.celular ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, celular: e.target.value.toUpperCase() }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Nome Contato</span>
                  <input
                    type="text"
                    value={form.nomeContato ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nomeContato: e.target.value.toUpperCase() }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">E-mail</span>
                  <input
                    type="email"
                    value={form.email ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                  />
                </label>
              </div>
              <div>
                <span className="mb-2 block text-sm font-medium text-gray-700">Classificação</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CLASSIFICACAO_OPCOES.map((op) => (
                    <label key={op} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(form.classificacao ?? []).includes(op)}
                        onChange={() => toggleClassificacao(op)}
                        className="h-4 w-4 rounded border-gray-300 text-urano-red focus:ring-urano-red"
                      />
                      <span className="text-sm text-gray-700">{op}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvar}
                className="rounded-lg bg-urano-red px-4 py-2 text-sm font-medium text-white hover:bg-urano-red-dark"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
