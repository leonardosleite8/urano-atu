import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Plus, MessageSquare, X, FileDown, Paperclip, Trash2, GripVertical, CheckCircle } from 'lucide-react';
import { formatarCNPJ } from '../utils/cnpj';
import {
  type KanbanColumn,
  type KanbanBoard,
  LINHAS_OPCOES,
  CANAIS_OPCOES,
  INMETRO_OPCOES,
  CREDENCIADA_OPCOES,
} from '../types';
import {
  getBoardsStorage,
  setBoardsStorage,
  getCardsStorage,
  setCardsStorage,
  getClientePorCnpjStorage,
  getClientesStorage,
  setClientesStorage,
} from '../data/storage';
import { downloadCsv } from '../utils/exportCsv';
import { useAuth } from '@/contexts/AuthContext';
import { useAudit } from '@/hooks/useAudit';

const BOARD_COLUMNS_DROPPABLE = 'board-columns';
const OPCOES_BALANCAS = ['BA37', 'B35', 'Urano Lab', 'UR 10.000', 'SM 300'];

export function CrmKanban() {
  const { user, permissions, viewScope, isMasterAdmin } = useAuth();
  const { logAction } = useAudit();
  const [boards, setBoards] = useState<KanbanBoard[]>(() => getBoardsStorage());
  const [currentBoardId, setCurrentBoardId] = useState<string>(() => getBoardsStorage()[0]?.id ?? '');
  const [cards, setCards] = useState<any[]>(() => getCardsStorage());
  const [modalAberto, setModalAberto] = useState(false);
  const [cardEditando, setCardEditando] = useState<any | null>(null);
  const [cnpjBusca, setCnpjBusca] = useState('');
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [modalNovoClienteAberto, setModalNovoClienteAberto] = useState(false);
  const [clienteForm, setClienteForm] = useState<any>({
    nomeEmpresa: '',
    razaoSocial: '',
    cnpj: '',
    uf: '',
    cidade: '',
    telefone: '',
    nomeContato: '',
    email: '',
  });
  const [form, setForm] = useState<any>({
    cnpj: '',
    razaoSocial: '',
    valorCompra: '',
    inicioProcesso: '',
    modeloBalanca: '',
    linha: 'Comercial',
    canal: 'Comercial',
    inmetro: 'Aguarda',
    credenciada: 'Não',
    comentarios: [],
    anexos: [],
    finalizado: false,
  });
  const [novoComentario, setNovoComentario] = useState('');
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState('');
  const comentarioTextareaRef = useRef<HTMLTextAreaElement>(null);

  const currentBoard = boards.find((b) => b.id === currentBoardId) ?? boards[0];
  const columns = currentBoard?.columns ?? [];

  useEffect(() => {
    setBoardsStorage(boards);
  }, [boards]);

  useEffect(() => {
    setCardsStorage(cards);
  }, [cards]);

  const canAdd = isMasterAdmin || !!permissions?.canAdd;
  const canEdit = isMasterAdmin || !!permissions?.canEdit;
  const canDelete = isMasterAdmin || !!permissions?.canDelete;

  const abrirNovo = (columnId: string) => {
    setCardEditando(null);
    setForm({
      boardId: currentBoardId,
      columnId,
      cnpj: '',
      razaoSocial: '',
      valorCompra: '',
      inicioProcesso: '',
      modeloBalanca: '',
      linha: 'Comercial',
      canal: 'Comercial',
      inmetro: 'Aguarda',
      credenciada: 'Não',
      comentarios: [],
      anexos: [],
      finalizado: false,
    });
    setCnpjBusca('');
    setNovoComentario('');
    setModalAberto(true);
  };

  const abrirEditar = (card: any) => {
    setCardEditando(card);
    setForm({
      ...card,
      comentarios: card.comentarios ?? [],
      anexos: card.anexos ?? [],
    });
    setCnpjBusca(card.cnpj);
    setNovoComentario('');
    setModalAberto(true);
  };

  const buscarCnpj = useCallback(() => {
    const limpo = cnpjBusca.replace(/\D/g, '');
    if (limpo.length < 14) return;
    setBuscandoCnpj(true);
    const cliente = getClientePorCnpjStorage(cnpjBusca);
    setBuscandoCnpj(false);
    if (cliente) {
      setForm((f: any) => ({
        ...f,
        cnpj: cliente.cnpj,
        razaoSocial: cliente.razaoSocial.toUpperCase(),
        uf: cliente.uf?.toUpperCase(),
      }));
    }
  }, [cnpjBusca]);

  useEffect(() => {
    if (cnpjBusca.replace(/\D/g, '').length === 14) buscarCnpj();
  }, [cnpjBusca, buscarCnpj]);

  const handleValorCompraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valor = e.target.value.replace(/\D/g, '');
    if (!valor) {
      setForm((f: any) => ({ ...f, valorCompra: '' }));
      return;
    }
    const formatado = (Number(valor) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setForm((f: any) => ({ ...f, valorCompra: formatado }));
  };

  const adicionarComentario = (imagens?: string[], textoAutomatico?: string, autorOverride?: string) => {
    const texto = textoAutomatico || novoComentario.trim();
    if (!texto && (!imagens || imagens.length === 0)) return;
    const comentario = {
      id: `com-${Date.now()}`,
      texto: texto || '(imagem anexada)',
      autor: autorOverride ?? 'Usuário',
      data: new Date().toISOString(),
      imagens: imagens ?? [],
    };
    setForm((f: any) => ({
      ...f,
      comentarios: [...(f.comentarios ?? []), comentario],
    }));
    if (!textoAutomatico) setNovoComentario('');
    
    if (cardEditando) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardEditando.id
            ? { ...c, comentarios: [...(c.comentarios ?? []), comentario] }
            : c
        )
      );
    }
  };

  const handlePasteComentario = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            adicionarComentario([dataUrl]);
          };
          reader.readAsDataURL(file);
        }
        return;
      }
    }
  };

  const adicionarAnexo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const anexo = {
        id: `anex-${Date.now()}`,
        nome: file.name,
        tipo: file.type,
        base64: reader.result as string,
        data: new Date().toISOString(),
      };
      setForm((f: any) => ({ ...f, anexos: [...(f.anexos ?? []), anexo] }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removerAnexo = (id: string) => {
    setForm((f: any) => ({ ...f, anexos: (f.anexos ?? []).filter((a: any) => a.id !== id) }));
  };

  const salvarCard = () => {
    if (!canAdd && !cardEditando) return;
    if (!canEdit && cardEditando) return;
    const payload: any = {
      id: (cardEditando?.id ?? `card-${Date.now()}`),
      boardId: (form.boardId ?? currentBoardId),
      columnId: (form.columnId ?? columns[0]?.id ?? ''),
      cnpj: (form.cnpj ?? ''),
      razaoSocial: (form.razaoSocial ?? '').toUpperCase(),
      uf: (form.uf ?? '').toUpperCase(),
      valorCompra: (form.valorCompra ?? ''),
      inicioProcesso: (form.inicioProcesso ?? ''),
      modeloBalanca: (form.modeloBalanca ?? ''),
      linha: (form.linha ?? 'Comercial'),
      canal: (form.canal ?? 'Comercial'),
      inmetro: form.inmetro,
      credenciada: form.credenciada,
      comentarios: (form.comentarios ?? []),
      anexos: (form.anexos ?? []),
      finalizado: form.finalizado,
      createdAt: (cardEditando?.createdAt ?? new Date().toISOString()),
      updatedAt: new Date().toISOString(),
    };
    if (cardEditando) {
      setCards((prev) => prev.map((c) => (c.id === cardEditando.id ? payload : c)));
      void logAction(
        'UPDATE',
        `Atualizou card ${payload.id} - CNPJ ${payload.cnpj || '-'}`,
        'kanban',
      );
    } else {
      setCards((prev) => [...prev, payload]);
      void logAction(
        'CREATE',
        `Criou card ${payload.id} - CNPJ ${payload.cnpj || '-'}`,
        'kanban',
      );
    }
    setModalAberto(false);
  };

  const excluirCard = () => {
    if (!canDelete) return;
    if (!cardEditando) return;
    if (confirm('Tem certeza que deseja excluir este card? Esta ação não pode ser desfeita.')) {
      setCards((prev) => prev.filter((c) => c.id !== cardEditando.id));
      void logAction(
        'DELETE',
        `Excluiu card ${cardEditando.id} - CNPJ ${cardEditando.cnpj || '-'}`,
        'kanban',
      );
      setModalAberto(false);
    }
  };

  const cardsComEscopo = useMemo(() => {
    if (viewScope === 'all' || !user) return cards;
    const email = user.email?.toLowerCase() ?? '';
    if (!email) return cards;
    return cards.filter((c) => c.emailResponsavel?.toLowerCase?.() === email);
  }, [cards, viewScope, user]);

  const cardsPorColuna = (columnId: string) =>
    cardsComEscopo.filter((c) => c.boardId === currentBoardId && c.columnId === columnId);

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    if (source.droppableId === BOARD_COLUMNS_DROPPABLE) {
      const newColumns = [...columns];
      const [removed] = newColumns.splice(source.index, 1);
      newColumns.splice(destination.index, 0, removed);
      const reordered = newColumns.map((c, i) => ({ ...c, order: i }));
      setBoards((prev) =>
        prev.map((b) =>
          b.id === currentBoardId ? { ...b, columns: reordered } : b
        )
      );
      return;
    }

    const card = cards.find((c) => c.id === draggableId);
    if (!card || card.boardId !== currentBoardId) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const destinoColuna = columns.find(c => c.id === destination.droppableId)?.title || 'Nova Coluna';
    
    setCards((prev) =>
      prev.map((c) => {
        if (c.id === draggableId) {
          const novoComentarioHistorico = {
            id: `com-${Date.now()}`,
            texto: `Movido para a etapa: ${destinoColuna}`,
            autor: 'Sistema',
            data: new Date().toISOString(),
            imagens: [],
          };
          return { 
            ...c, 
            columnId: destination.droppableId as string, 
            updatedAt: new Date().toISOString(),
            comentarios: [...(c.comentarios || []), novoComentarioHistorico]
          };
        }
        return c;
      })
    );
  };

  const adicionarColuna = () => {
    const id = `col-${Date.now()}`;
    const newCol: KanbanColumn = { id, title: 'Nova coluna', order: columns.length };
    setBoards((prev) =>
      prev.map((b) =>
        b.id === currentBoardId
          ? { ...b, columns: [...b.columns, newCol].sort((a, b) => a.order - b.order) }
          : b
      )
    );
    setEditingColumnId(id);
    setEditingColumnTitle('Nova coluna');
  };

  const excluirColuna = (columnId: string) => {
    const firstCol = columns[0];
    if (!firstCol || firstCol.id === columnId) return;
    setBoards((prev) =>
      prev.map((b) =>
        b.id === currentBoardId
          ? { ...b, columns: b.columns.filter((c) => c.id !== columnId).map((c, i) => ({ ...c, order: i })) }
          : b
      )
    );
    setCards((prev) =>
      prev.map((c) => (c.boardId === currentBoardId && c.columnId === columnId ? { ...c, columnId: firstCol.id } : c))
    );
  };

  const iniciarEdicaoColuna = (col: KanbanColumn) => {
    setEditingColumnId(col.id);
    setEditingColumnTitle(col.title);
  };

  const salvarEdicaoColuna = () => {
    if (editingColumnId && editingColumnTitle.trim()) {
      setBoards((prev) =>
        prev.map((b) =>
          b.id === currentBoardId
            ? {
                ...b,
                columns: b.columns.map((c) =>
                  c.id === editingColumnId ? { ...c, title: editingColumnTitle.trim().toUpperCase() } : c
                ),
              }
            : b
        )
      );
    }
    setEditingColumnId(null);
  };

  const adicionarQuadro = () => {
    const id = `board-${Date.now()}`;
    const newBoard: KanbanBoard = {
      id,
      name: `NOVO QUADRO ${boards.length + 1}`,
      columns: [
        { id: `${id}-col-0`, title: 'PROSPECÇÃO', order: 0 },
        { id: `${id}-col-1`, title: 'QUALIFICAÇÃO', order: 1 },
        { id: `${id}-col-2`, title: 'PROPOSTA', order: 2 },
        { id: `${id}-col-3`, title: 'FECHADO', order: 3 },
      ],
    };
    setBoards((prev) => [...prev, newBoard]);
    setCurrentBoardId(id);
  };

  const exportarCsv = () => {
    const cardsDoBoard = cards.filter((c) => c.boardId === currentBoardId);
    const headers = [
      'Razão Social', 'CNPJ', 'UF', 'Valor Compra', 'Início Processo', 'Modelo Balança', 'Linha', 'Canal',
      'Inmetro', 'Credenciada', 'Coluna', 'Status'
    ];
    const colTitles: Record<string, string> = {};
    columns.forEach((c) => { colTitles[c.id] = c.title; });
    const rows = cardsDoBoard.map((c) => [
      c.razaoSocial,
      formatarCNPJ(c.cnpj),
      c.uf ?? '',
      c.valorCompra,
      c.inicioProcesso,
      c.modeloBalanca,
      c.linha,
      c.canal,
      c.inmetro ?? '',
      c.credenciada ?? '',
      colTitles[c.columnId] ?? c.columnId,
      c.finalizado ? 'FINALIZADO' : 'EM ANDAMENTO'
    ]);
    downloadCsv(headers, rows, `crm-${currentBoard?.name ?? 'kanban'}.csv`);
  };

  const modelosArray = form.modeloBalanca ? form.modeloBalanca.split(', ') : [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-urano-gray-dark">CRM</h1>
          <p className="mt-1 text-sm text-urano-gray">Quadro Kanban de acompanhamento</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={currentBoardId}
            onChange={(e) => setCurrentBoardId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-urano-gray-dark focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red uppercase"
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>{b.name.toUpperCase()}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={adicionarQuadro}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 uppercase"
          >
            + Novo quadro
          </button>
          <button
            type="button"
            onClick={exportarCsv}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 uppercase"
          >
            <FileDown className="h-4 w-4" />
            Exportar Excel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!currentBoardId) return;
              const boardAtual = boards.find((b) => b.id === currentBoardId);
              if (!boardAtual) return;
              if (!window.confirm(`Excluir o quadro "${boardAtual.name}" e todos os cards vinculados?`)) return;
              setBoards((prev) => prev.filter((b) => b.id !== currentBoardId));
              setCards((prev) => prev.filter((c) => c.boardId !== currentBoardId));
              const restante = boards.filter((b) => b.id !== currentBoardId);
              setCurrentBoardId(restante[0]?.id ?? '');
            }}
            className="flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 uppercase"
          >
            <Trash2 className="h-4 w-4" />
            Excluir quadro
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          <Droppable droppableId={BOARD_COLUMNS_DROPPABLE} direction="horizontal" type="column">
            {(providedCols) => (
              <div
                ref={providedCols.innerRef}
                {...providedCols.droppableProps}
                className="flex gap-4 overflow-x-auto pb-4"
              >
                {columns.map((col, colIndex) => (
                  <Draggable key={col.id} draggableId={col.id} index={colIndex}>
                    {(providedCol, snapshotCol) => (
                      <div
                        ref={providedCol.innerRef}
                        {...providedCol.draggableProps}
                        className={`flex h-full min-w-[280px] flex-1 flex-col rounded-xl border border-gray-200 bg-gray-100/50 ${snapshotCol.isDragging ? 'opacity-90 shadow-lg' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-3">
                          <div className="flex flex-1 items-center gap-1" {...providedCol.dragHandleProps}>
                            <GripVertical className="h-4 w-4 shrink-0 text-urano-gray" />
                            {editingColumnId === col.id ? (
                              <input
                                value={editingColumnTitle}
                                onChange={(e) => setEditingColumnTitle(e.target.value.toUpperCase())}
                                onBlur={salvarEdicaoColuna}
                                onKeyDown={(e) => e.key === 'Enter' && salvarEdicaoColuna()}
                                className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm font-semibold focus:border-urano-red focus:outline-none uppercase"
                                autoFocus
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => iniciarEdicaoColuna(col)}
                                className="flex-1 text-left font-semibold text-urano-gray-dark hover:underline uppercase"
                              >
                                {col.title}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => abrirNovo(col.id)}
                              className="rounded p-1.5 text-urano-gray hover:bg-urano-red hover:text-white"
                              title="Adicionar card"
                            >
                              <Plus className="h-5 w-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => excluirColuna(col.id)}
                              className="rounded p-1.5 text-urano-gray hover:bg-red-100 hover:text-red-600"
                              title="Excluir coluna"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <Droppable droppableId={col.id} type="card">
                          {(providedCards) => (
                            <div
                              ref={providedCards.innerRef}
                              {...providedCards.droppableProps}
                              className="flex-1 space-y-2 overflow-y-auto p-3 min-h-[80px]"
                            >
                              {cardsPorColuna(col.id).map((card, cardIndex) => (
                                <Draggable key={card.id} draggableId={card.id} index={cardIndex}>
                                  {(providedCard, snapshotCard) => (
                                    <div
                                      ref={providedCard.innerRef}
                                      {...providedCard.draggableProps}
                                      {...providedCard.dragHandleProps}
                                      onClick={() => abrirEditar(card)}
                                      className={`cursor-grab active:cursor-grabbing rounded-lg border border-gray-200 p-3 text-left shadow-sm transition-shadow hover:shadow-md ${snapshotCard.isDragging ? 'shadow-md ring-2 ring-urano-red' : ''} ${card.finalizado ? 'bg-green-100 border-green-300' : 'bg-white'}`}
                                    >
                                      <div className="flex justify-between items-start">
                                        <p className="font-bold text-urano-gray-dark uppercase">{card.razaoSocial}</p>
                                        {card.finalizado && <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />}
                                      </div>
                                      <p className="mt-1 text-xs text-urano-gray uppercase">UF: {(card.uf ?? '—')}</p>
                                      <p className="mt-0.5 text-xs text-urano-gray uppercase">Modelos: {card.modeloBalanca || 'Nenhum'}</p>
                                      {card.valorCompra && (
                                        <p className="mt-2 text-sm font-semibold text-urano-red">R$ {card.valorCompra}</p>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {providedCards.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    )}
                  </Draggable>
                ))}
                {providedCols.placeholder}
              </div>
            )}
          </Droppable>
          <button
            type="button"
            onClick={adicionarColuna}
            className="flex min-w-[120px] flex-shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-6 text-sm font-medium text-urano-gray hover:border-urano-red hover:text-urano-red uppercase"
          >
            <Plus className="h-5 w-5" />
            Nova coluna
          </button>
        </div>
      </DragDropContext>

      {modalNovoClienteAberto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <h2 className="text-lg font-semibold text-urano-gray-dark uppercase">
                Novo Cliente - Agenda
              </h2>
              <button
                type="button"
                onClick={() => setModalNovoClienteAberto(false)}
                className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-urano-red"
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
                    value={clienteForm.nomeEmpresa ?? ''}
                    onChange={(e) =>
                      setClienteForm((f: any) => ({ ...f, nomeEmpresa: e.target.value.toUpperCase() }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Razão Social</span>
                  <input
                    type="text"
                    value={clienteForm.razaoSocial ?? ''}
                    onChange={(e) =>
                      setClienteForm((f: any) => ({ ...f, razaoSocial: e.target.value.toUpperCase() }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">CNPJ</span>
                <input
                  type="text"
                  value={formatarCNPJ(clienteForm.cnpj ?? '')}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 14);
                    setClienteForm((f: any) => ({ ...f, cnpj: digits }));
                  }}
                  placeholder="00.000.000/0000-00"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                />
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">UF</span>
                  <input
                    type="text"
                    value={clienteForm.uf ?? ''}
                    onChange={(e) =>
                      setClienteForm((f: any) => ({ ...f, uf: e.target.value.toUpperCase() }))
                    }
                    maxLength={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Cidade</span>
                  <input
                    type="text"
                    value={clienteForm.cidade ?? ''}
                    onChange={(e) =>
                      setClienteForm((f: any) => ({ ...f, cidade: e.target.value.toUpperCase() }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Telefone</span>
                  <input
                    type="text"
                    value={clienteForm.telefone ?? ''}
                    onChange={(e) =>
                      setClienteForm((f: any) => ({ ...f, telefone: e.target.value.toUpperCase() }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Nome Contato</span>
                  <input
                    type="text"
                    value={clienteForm.nomeContato ?? ''}
                    onChange={(e) =>
                      setClienteForm((f: any) => ({ ...f, nomeContato: e.target.value.toUpperCase() }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">E-mail</span>
                <input
                  type="email"
                  value={clienteForm.email ?? ''}
                  onChange={(e) =>
                    setClienteForm((f: any) => ({ ...f, email: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setModalNovoClienteAberto(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!clienteForm.cnpj || String(clienteForm.cnpj).length < 14) return;
                  const existentes = getClientesStorage();
                  const limpo = String(clienteForm.cnpj).replace(/\D/g, '');
                  const existenteIndex = existentes.findIndex(
                    (c: any) => c.cnpj.replace(/\D/g, '') === limpo
                  );
                  const existente = existenteIndex >= 0 ? existentes[existenteIndex] : undefined;
                  const payload = {
                    id: existente?.id ?? `id-${Date.now()}`,
                    nomeEmpresa: clienteForm.nomeEmpresa ?? '',
                    razaoSocial: clienteForm.razaoSocial ?? '',
                    cnpj: limpo,
                    uf: (clienteForm.uf ?? '').toUpperCase(),
                    cidade: clienteForm.cidade ?? '',
                    endereco: existente?.endereco ?? '',
                    telefone: clienteForm.telefone ?? '',
                    celular: existente?.celular ?? '',
                    nomeContato: clienteForm.nomeContato ?? '',
                    email: clienteForm.email ?? '',
                    classificacao: existente?.classificacao ?? [],
                    historicoEmpresa: existente?.historicoEmpresa ?? [],
                  };
                  const novos =
                    existenteIndex >= 0
                      ? existentes.map((c: any, idx: number) => (idx === existenteIndex ? payload : c))
                      : [...existentes, payload];

                  setClientesStorage(novos);

                  setForm((f: any) => ({
                    ...f,
                    cnpj: payload.cnpj,
                    razaoSocial: payload.razaoSocial.toUpperCase(),
                    uf: payload.uf.toUpperCase(),
                  }));
                  setCnpjBusca(formatarCNPJ(payload.cnpj));
                  setModalNovoClienteAberto(false);
                }}
                className="rounded-lg bg-urano-red px-4 py-2 text-sm font-medium text-white hover:bg-urano-red-dark"
              >
                Salvar e vincular ao card
              </button>
            </div>
          </div>
        </div>
      )}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative flex h-[90vh] w-full max-w-6xl overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex w-[55%] flex-col border-r border-gray-200">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <h2 className="text-xl font-bold text-urano-gray-dark uppercase">
                  {cardEditando ? 'EDITAR CARD' : 'NOVO CARD'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setForm((f: any) => {
                      const novoFinalizado = !f.finalizado;
                      if (novoFinalizado) {
                        const agora = new Date();
                        const dia = String(agora.getDate()).padStart(2, '0');
                        const mes = String(agora.getMonth() + 1).padStart(2, '0');
                        const ano = agora.getFullYear();
                        const texto = `FINALIZADO NA DATA ${dia}/${mes}/${ano}`;
                        adicionarComentario(undefined, texto, 'Sistema');
                      }
                      return { ...f, finalizado: novoFinalizado };
                    });
                  }}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 font-bold uppercase transition-colors ${form.finalizado ? 'bg-green-100 border-green-500 text-green-700 hover:bg-green-200' : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'}`}
                >
                  <CheckCircle className="h-5 w-5" />
                  {form.finalizado ? 'FINALIZADO' : 'MARCAR FINALIZADO'}
                </button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto p-6">
                <div className="grid grid-cols-2 gap-4">
                  <label className="block col-span-2">
                    <span className="mb-1 block text-sm font-medium text-gray-700 uppercase">CNPJ</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formatarCNPJ((form.cnpj ?? ''))}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 14);
                          setForm((f: any) => ({ ...f, cnpj: v }));
                          setCnpjBusca(e.target.value);
                        }}
                        placeholder="00.000.000/0000-00"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setClienteForm({
                            nomeEmpresa: form.razaoSocial ?? '',
                            razaoSocial: form.razaoSocial ?? '',
                            cnpj: form.cnpj ?? '',
                            uf: form.uf ?? '',
                            cidade: '',
                            telefone: '',
                            nomeContato: '',
                            email: '',
                          });
                          setModalNovoClienteAberto(true);
                        }}
                        className="flex items-center justify-center rounded-lg bg-urano-red px-3 py-2 text-sm font-bold text-white hover:bg-urano-red-dark uppercase"
                        title="Novo cliente na Agenda"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {buscandoCnpj && <p className="mt-1 text-xs font-bold text-urano-red">Buscando na Agenda...</p>}
                  </label>
                  <label className="block col-span-2">
                    <span className="mb-1 block text-sm font-medium text-gray-700 uppercase">Razão Social</span>
                    <input
                      type="text"
                      value={(form.razaoSocial ?? '')}
                      onChange={(e) => setForm((f: any) => ({ ...f, razaoSocial: e.target.value.toUpperCase() }))}
                      placeholder="RAZÃO SOCIAL DA EMPRESA"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 uppercase">UF</span>
                    <input
                      type="text"
                      value={(form.uf ?? '')}
                      onChange={(e) => setForm((f: any) => ({ ...f, uf: e.target.value.toUpperCase() }))}
                      maxLength={2}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 uppercase">Valor da Compra (R$)</span>
                    <input
                      type="text"
                      value={(form.valorCompra ?? '')}
                      onChange={handleValorCompraChange}
                      placeholder="0,00"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono font-bold text-urano-red focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                    />
                  </label>
                  <label className="block col-span-2">
                    <span className="mb-2 block text-sm font-medium text-gray-700 uppercase">Modelos de Balança (Múltipla Escolha)</span>
                    <div className="flex flex-wrap gap-3 rounded-lg border border-gray-300 p-3">
                      {OPCOES_BALANCAS.map((opcao) => (
                        <label key={opcao} className="flex cursor-pointer items-center gap-2 rounded bg-gray-50 px-2 py-1 border hover:bg-gray-100">
                          <input
                            type="checkbox"
                            checked={modelosArray.includes(opcao)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setForm((f: any) => ({ ...f, modeloBalanca: [...modelosArray, opcao].join(', ') }));
                              } else {
                                setForm((f: any) => ({ ...f, modeloBalanca: modelosArray.filter((m: string) => m !== opcao).join(', ') }));
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-urano-red focus:ring-urano-red"
                          />
                          <span className="text-sm font-semibold text-gray-800 uppercase">{opcao}</span>
                        </label>
                      ))}
                    </div>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 uppercase">Linha</span>
                    <select
                      value={(form.linha ?? '')}
                      onChange={(e) => setForm((f: any) => ({ ...f, linha: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                    >
                      {LINHAS_OPCOES.map((l) => (
                        <option key={l} value={l} className="uppercase">{l}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 uppercase">Canal</span>
                    <select
                      value={(form.canal ?? '')}
                      onChange={(e) => setForm((f: any) => ({ ...f, canal: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                    >
                      {CANAIS_OPCOES.map((c) => (
                        <option key={c} value={c} className="uppercase">{c}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 uppercase">Inmetro</span>
                    <select
                      value={(form.inmetro ?? '')}
                      onChange={(e) => setForm((f: any) => ({ ...f, inmetro: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                    >
                      {INMETRO_OPCOES.map((o) => (
                        <option key={o} value={o} className="uppercase">{o}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 uppercase">Credenciada</span>
                    <select
                      value={(form.credenciada ?? '')}
                      onChange={(e) => setForm((f: any) => ({ ...f, credenciada: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                    >
                      {CREDENCIADA_OPCOES.map((o) => (
                        <option key={o} value={o} className="uppercase">{o}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 uppercase">Coluna Atual</span>
                    <select
                      value={(form.columnId ?? '')}
                      onChange={(e) => setForm((f: any) => ({ ...f, columnId: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                    >
                      {columns.map((col) => (
                        <option key={col.id} value={col.id} className="uppercase">{col.title}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 uppercase">Início do Processo</span>
                    <input
                      type="date"
                      value={(form.inicioProcesso ?? '')}
                      onChange={(e) => setForm((f: any) => ({ ...f, inicioProcesso: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                    />
                  </label>
                </div>
                
                <div className="mt-4 border-t pt-4">
                  <span className="mb-2 block text-sm font-medium text-gray-700 uppercase">Anexos</span>
                  <div className="flex flex-wrap gap-2">
                    {(form.anexos ?? []).map((a: any) => (
                      <span
                        key={a.id}
                        className="flex items-center gap-2 rounded bg-gray-100 px-3 py-1.5 text-xs font-semibold"
                      >
                        {a.nome}
                        <button type="button" onClick={() => removerAnexo(a.id)} className="text-red-600 hover:text-red-800 text-lg">
                          ×
                        </button>
                      </span>
                    ))}
                    <label className="flex cursor-pointer items-center gap-1 rounded border-2 border-dashed border-gray-300 px-4 py-1.5 text-sm font-bold text-urano-gray hover:border-urano-red hover:text-urano-red uppercase">
                      <Paperclip className="h-4 w-4" />
                      ANEXAR
                      <input type="file" className="hidden" onChange={adicionarAnexo} />
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
                {cardEditando ? (
                  <button
                    type="button"
                    onClick={excluirCard}
                    className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 uppercase"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir Card
                  </button>
                ) : (
                  <div></div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModalAberto(false)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100 uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={salvarCard}
                    className="rounded-lg bg-urano-red px-6 py-2 text-sm font-bold text-white hover:bg-urano-red-dark uppercase shadow-md"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>

            <div className="flex w-[45%] flex-col bg-gray-50">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-urano-red" />
                  <h2 className="text-lg font-bold text-urano-gray-dark uppercase">Histórico</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="rounded p-2 text-gray-500 hover:bg-gray-200 hover:text-urano-red"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {((form.comentarios ?? []).length === 0) ? (
                    <p className="text-sm font-medium text-urano-gray text-center mt-10">Nenhum evento registrado. Use Ctrl+V para colar imagens aqui.</p>
                  ) : (
                    (form.comentarios ?? []).map((com: any) => (
                      <div key={com.id} className={`rounded-lg border p-3 ${com.autor === 'Sistema' ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <p className="text-sm font-medium text-gray-800 uppercase">{com.texto}</p>
                        {com.imagens && com.imagens.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {com.imagens.map((src: string, i: number) => (
                              <img key={i} src={src} alt="" className="h-24 w-24 rounded border object-cover cursor-pointer hover:opacity-80" />
                            ))}
                          </div>
                        )}
                        <p className="mt-2 text-xs font-bold text-urano-gray">
                          {com.autor} · {new Date(com.data).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <textarea
                    ref={comentarioTextareaRef}
                    value={novoComentario}
                    onChange={(e) => setNovoComentario(e.target.value.toUpperCase())}
                    onPaste={handlePasteComentario}
                    placeholder="DIGITE UM COMENTÁRIO OU USE CTRL+V PARA COLAR UM PRINT..."
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-urano-red focus:outline-none focus:ring-1 focus:ring-urano-red"
                  />
                  <button
                    type="button"
                    onClick={() => adicionarComentario()}
                    className="mt-2 w-full rounded-lg bg-gray-800 px-4 py-2 text-sm font-bold text-white hover:bg-gray-900 uppercase"
                  >
                    Adicionar Comentário
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}