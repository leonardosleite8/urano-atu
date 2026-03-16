// Classificação do cliente (checkboxes)
export const CLASSIFICACAO_OPCOES = [
  'Centro de distribuição',
  'Cliente final',
  'Credenciada',
  'Distribuidor',
  'Linha automação',
  'Urano Lab',
  'Linha comercial',
  'Linha gastronômica',
  'Linha industrial',
  'Linha médico-hospitalar',
  'Linha personal',
  'Linha Rodoviária',
  'Revenda',
  'Software House',
] as const;

export type Classificacao = (typeof CLASSIFICACAO_OPCOES)[number];

export interface HistoricoEmpresa {
  id: string;
  texto: string;
  data: string;
  imagens?: string[];
}

export interface Cliente {
  id: string;
  nomeEmpresa: string;
  razaoSocial: string;
  cnpj: string;
  uf: string;
  cidade: string;
  endereco: string;
  telefone: string;
  celular: string;
  nomeContato: string;
  email: string;
  classificacao: Classificacao[];
  historicoEmpresa?: HistoricoEmpresa[];
}

// Kanban - Colunas dinâmicas e Múltiplos quadros
export interface KanbanColumn {
  id: string;
  title: string;
  order: number;
}

export interface KanbanBoard {
  id: string;
  name: string;
  columns: KanbanColumn[];
}

// Opções Inmetro e Credenciada
export const INMETRO_OPCOES = ['Aguarda', 'OK'] as const;
export const CREDENCIADA_OPCOES = ['Sim', 'Não'] as const;
export type Inmetro = (typeof INMETRO_OPCOES)[number];
export type Credenciada = (typeof CREDENCIADA_OPCOES)[number];

// Kanban - modelos de balança (multi-seleção, opções restritas)
export const MODELOS_BALANCA = [
  'BA37',
  'B35',
  'Urano Lab',
  'UR 10.000',
  'SM 300',
] as const;

export const LINHAS_OPCOES = [
  'Comercial', 'Industrial', 'Urano Lab', 'Médico Hospitalar', 'Automação Comercial', 'Gastronomia', 'Personal',
] as const;

export const CANAIS_OPCOES = [
  'Comercial', 'Site', 'Solicitação Própria', 'Prospecção ATU',
] as const;

export type ModeloBalanca = (typeof MODELOS_BALANCA)[number];
export type Linha = (typeof LINHAS_OPCOES)[number];
export type Canal = (typeof CANAIS_OPCOES)[number];

export interface KanbanCard {
  id: string;
  boardId: string;
  columnId: string;
  cnpj: string;
  empresa?: string;
  razaoSocial: string;
  uf?: string;
  valorCompra: string;
  inicioProcesso: string;
  modeloBalanca: ModeloBalanca[]; // múltiplos modelos
  linha: Linha;
  canal: Canal;
  inmetro?: Inmetro;
  credenciada?: Credenciada;
  finalizado?: boolean;
  comentarios: ComentarioCard[];
  anexos: AnexoCard[];
  createdAt: string;
  updatedAt: string;
}

export interface AnexoCard {
  id: string;
  nome: string;
  tipo: string;
  base64?: string;
  url?: string;
  data: string;
}

export interface ComentarioCard {
  id: string;
  texto: string;
  autor: string;
  data: string;
  imagens?: string[]; // base64 data URLs (mock local)
}
