import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/services/firebase';
import type { AuditAction } from '@/types/rbac';

export function useAudit() {
  const { user } = useAuth();

  async function logAction(action: AuditAction, details: string, context?: string) {
    if (!user) return;
    try {
      await addDoc(collection(db, 'audit_logs'), {
        timestamp: serverTimestamp(),
        userEmail: user.email ?? '',
        userId: user.uid,
        action,
        details,
        context,
      });
    } catch (e) {
      // Não devemos quebrar a UX se o log falhar; apenas registra no console.
      console.error('Falha ao registrar auditoria:', e);
    }
  }

  return { logAction };
}

