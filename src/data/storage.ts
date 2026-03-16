import type { Cliente, KanbanCard, KanbanBoard } from '../types';
import { mockClientes, mockBoards, mockCards } from './mock';

const KEY_CLIENTES = 'urano-crm-clientes';
const KEY_BOARDS = 'urano-crm-boards';
const KEY_CARDS = 'urano-crm-cards';

function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null || raw === '') return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setItem(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('localStorage setItem failed', e);
  }
}

/** Carrega clientes do localStorage. Se vazio, inicializa com mock e salva. */
export function getClientesStorage(): Cliente[] {
  const data = getItem<Cliente[]>(KEY_CLIENTES, []);
  if (data.length === 0) {
    setItem(KEY_CLIENTES, mockClientes);
    return mockClientes;
  }
  return data;
}

/** Persiste clientes no localStorage. */
export function setClientesStorage(clientes: Cliente[]): void {
  setItem(KEY_CLIENTES, clientes);
}

/** Busca cliente por CNPJ na base persistida (Agenda). */
export function getClientePorCnpjStorage(cnpj: string): Cliente | null {
  const clientes = getClientesStorage();
  const limpo = cnpj.replace(/\D/g, '');
  return clientes.find((c) => c.cnpj.replace(/\D/g, '') === limpo) ?? null;
}

/** Carrega boards do localStorage. Se vazio, inicializa com mock e salva. */
export function getBoardsStorage(): KanbanBoard[] {
  const data = getItem<KanbanBoard[]>(KEY_BOARDS, []);
  if (data.length === 0) {
    setItem(KEY_BOARDS, mockBoards);
    return mockBoards;
  }
  return data;
}

/** Persiste boards no localStorage. */
export function setBoardsStorage(boards: KanbanBoard[]): void {
  setItem(KEY_BOARDS, boards);
}

/** Carrega cards do localStorage. Se vazio, inicializa com mock e salva. */
export function getCardsStorage(): KanbanCard[] {
  const data = getItem<KanbanCard[]>(KEY_CARDS, []);
  if (data.length === 0) {
    setItem(KEY_CARDS, mockCards);
    return mockCards;
  }
  return data;
}

/** Persiste cards no localStorage. */
export function setCardsStorage(cards: KanbanCard[]): void {
  setItem(KEY_CARDS, cards);
}
