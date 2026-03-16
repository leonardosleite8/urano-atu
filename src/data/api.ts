/**
 * Camada de dados preparada para Supabase.
 * Substitua as implementações abaixo por chamadas ao Supabase quando integrar.
 */

import type { Cliente, KanbanCard } from '../types';
import { getClientes, getClientePorCnpj, mockCards } from './mock';

// --- Clientes (trocar por Supabase quando integrar) ---

export async function apiGetClientes(): Promise<Cliente[]> {
  return getClientes();
}

export async function apiGetClientePorCnpj(cnpj: string): Promise<Cliente | null> {
  return getClientePorCnpj(cnpj);
}

export async function apiSalvarCliente(cliente: Cliente): Promise<Cliente> {
  // TODO: Supabase .upsert('clientes', cliente)
  return cliente;
}

export async function apiExcluirCliente(): Promise<void> {
  // TODO: Supabase .delete('clientes').eq('id', id)
}

// --- Kanban / Cards (trocar por Supabase quando integrar) ---

export async function apiGetCards(): Promise<KanbanCard[]> {
  // TODO: Supabase .from('kanban_cards').select('*')
  return Promise.resolve(mockCards);
}

export async function apiSalvarCard(card: KanbanCard): Promise<KanbanCard> {
  // TODO: Supabase .upsert('kanban_cards', card)
  return card;
}

export async function apiExcluirCard(): Promise<void> {
  // TODO: Supabase .delete('kanban_cards').eq('id', id)
}
