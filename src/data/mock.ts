import type { Cliente, KanbanCard, KanbanBoard, ModeloBalanca } from '../types';

export const mockClientes: Cliente[] = [
  {
    id: '1',
    nomeEmpresa: 'Supermercado São Paulo',
    razaoSocial: 'Supermercado São Paulo Ltda',
    cnpj: '12345678000199',
    uf: 'SP',
    cidade: 'São Paulo',
    endereco: 'Rua das Flores, 100',
    telefone: '1133334444',
    celular: '11999887766',
    nomeContato: 'João Silva',
    email: 'joao@supermercado.com',
    classificacao: ['Cliente final', 'Linha comercial'],
  },
  {
    id: '2',
    nomeEmpresa: 'Distribuidora Norte',
    razaoSocial: 'Distribuidora Norte S.A.',
    cnpj: '98765432000111',
    uf: 'MG',
    cidade: 'Belo Horizonte',
    endereco: 'Av. Brasil, 500',
    telefone: '3133335555',
    celular: '31988776655',
    nomeContato: 'Maria Santos',
    email: 'maria@distribuidora.com',
    classificacao: ['Distribuidor', 'Linha industrial'],
  },
  {
    id: '3',
    nomeEmpresa: 'Hospital Central',
    razaoSocial: 'Hospital Central de Campinas',
    cnpj: '11222333000144',
    uf: 'SP',
    cidade: 'Campinas',
    endereco: 'Rua Saúde, 200',
    telefone: '1933336666',
    celular: '19977665544',
    nomeContato: 'Dr. Carlos Lima',
    email: 'carlos@hospital.com',
    classificacao: ['Linha médico-hospitalar', 'Cliente final'],
  },
];

export async function getClientes(): Promise<Cliente[]> {
  return Promise.resolve(mockClientes);
}

export async function getClientePorCnpj(cnpj: string): Promise<Cliente | null> {
  const limpo = cnpj.replace(/\D/g, '');
  return Promise.resolve(mockClientes.find((c) => c.cnpj.replace(/\D/g, '') === limpo) ?? null);
}

// Boards e colunas padrão
const defaultColumns = [
  { id: 'col-prospeccao', title: 'Prospecção', order: 0 },
  { id: 'col-qualificacao', title: 'Qualificação', order: 1 },
  { id: 'col-proposta', title: 'Proposta', order: 2 },
  { id: 'col-fechado', title: 'Fechado', order: 3 },
];

export const mockBoards: KanbanBoard[] = [
  { id: 'board-1', name: 'CRM Treinamentos', columns: defaultColumns.map((c) => ({ ...c })) },
  {
    id: 'board-2',
    name: 'CRM Vendas',
    columns: [
      { id: 'board-2-col-0', title: 'Prospecção', order: 0 },
      { id: 'board-2-col-1', title: 'Qualificação', order: 1 },
      { id: 'board-2-col-2', title: 'Proposta', order: 2 },
      { id: 'board-2-col-3', title: 'Fechado', order: 3 },
    ],
  },
];

export const mockCards: KanbanCard[] = [
  {
    id: 'c1',
    boardId: 'board-1',
    columnId: 'col-proposta',
    cnpj: '12345678000199',
    razaoSocial: 'Supermercado São Paulo Ltda',
    uf: 'SP',
    valorCompra: 'R$ 15.000,00',
    inicioProcesso: '2025-03-01',
    modeloBalanca: ['BA37' satisfies ModeloBalanca],
    linha: 'Comercial',
    canal: 'Comercial',
    inmetro: 'OK',
    credenciada: 'Não',
    comentarios: [
      { id: 'co1', texto: 'Cliente aprovou proposta. Aguardando assinatura.', autor: 'Vendas', data: '2025-03-05T10:00:00' },
      { id: 'co2', texto: 'Enviada proposta comercial.', autor: 'Sistema', data: '2025-03-03T14:30:00' },
    ],
    anexos: [],
    createdAt: '2025-03-01T09:00:00',
    updatedAt: '2025-03-05T10:00:00',
  },
  {
    id: 'c2',
    boardId: 'board-1',
    columnId: 'col-qualificacao',
    cnpj: '98765432000111',
    razaoSocial: 'Distribuidora Norte S.A.',
    uf: 'MG',
    valorCompra: 'R$ 45.000,00',
    inicioProcesso: '2025-02-15',
    modeloBalanca: ['UR 10.000' satisfies ModeloBalanca],
    linha: 'Industrial',
    canal: 'Prospecção ATU',
    inmetro: 'Aguarda',
    credenciada: 'Sim',
    comentarios: [
      { id: 'co3', texto: 'Visita técnica agendada para próxima semana.', autor: 'ATU', data: '2025-03-04T11:00:00' },
    ],
    anexos: [],
    createdAt: '2025-02-15T08:00:00',
    updatedAt: '2025-03-04T11:00:00',
  },
  {
    id: 'c3',
    boardId: 'board-1',
    columnId: 'col-prospeccao',
    cnpj: '11222333000144',
    razaoSocial: 'Hospital Central de Campinas',
    uf: 'SP',
    valorCompra: 'R$ 28.000,00',
    inicioProcesso: '2025-03-08',
    modeloBalanca: ['SM 300' satisfies ModeloBalanca],
    linha: 'Médico Hospitalar',
    canal: 'Site',
    inmetro: 'Aguarda',
    credenciada: 'Não',
    comentarios: [],
    anexos: [],
    createdAt: '2025-03-08T09:00:00',
    updatedAt: '2025-03-08T09:00:00',
  },
];
