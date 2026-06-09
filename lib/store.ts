'use client';

import { create } from 'zustand';
import { Artisan, JobDiagnosis } from '@/lib/types';

export interface ChatMessage {
  id: string;
  senderType: 'user' | 'artisan';
  text: string;
  timestamp: string;
}

interface FixMateState {
  diagnosis: JobDiagnosis | null;
  setDiagnosis: (d: JobDiagnosis) => void;
  selectedArtisan: Artisan | null;
  setSelectedArtisan: (a: Artisan) => void;
  activeJobId: string | null;
  setActiveJobId: (jobId: string | null) => void;
  escrowStatus: 'IDLE' | 'FUNDED' | 'RELEASED';
  setEscrowStatus: (status: 'IDLE' | 'FUNDED' | 'RELEASED') => void;
  userBalance: number;
  deductBalance: (amount: number) => void;
  chatMessages: Record<string, ChatMessage[]>;
  addChatMessage: (jobId: string, message: ChatMessage) => void;
}

export const useiSabiStore = create<FixMateState>((set) => ({
  diagnosis: null,
  setDiagnosis: (d) => set({ diagnosis: d }),
  selectedArtisan: null,
  setSelectedArtisan: (a) => set({ selectedArtisan: a }),
  activeJobId: null,
  setActiveJobId: (jobId) => set({ activeJobId: jobId }),
  escrowStatus: 'IDLE',
  setEscrowStatus: (s) => set({ escrowStatus: s }),
  userBalance: 250000,
  deductBalance: (amount) => set((state) => ({ userBalance: state.userBalance - amount })),
  chatMessages: {},
  addChatMessage: (jobId, message) => set((state) => {
    const jobMessages = state.chatMessages[jobId] || [];
    return {
      chatMessages: {
        ...state.chatMessages,
        [jobId]: [...jobMessages, message]
      }
    };
  })
}));
