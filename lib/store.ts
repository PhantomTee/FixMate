'use client';

import { create } from 'zustand';
import { JobDiagnosis, ArtisanData } from '@/lib/types';
import { MOCK_USER } from '@/lib/mock-db';

export interface ChatMessage {
  id: string;
  senderType: 'user' | 'artisan';
  text: string;
  timestamp: string;
}

interface FixMateState {
  diagnosis: JobDiagnosis | null;
  setDiagnosis: (d: JobDiagnosis) => void;
  selectedArtisan: any | null;
  setSelectedArtisan: (a: any) => void;
  escrowStatus: 'IDLE' | 'FUNDED' | 'RELEASED';
  setEscrowStatus: (status: 'IDLE' | 'FUNDED' | 'RELEASED') => void;
  userBalance: number;
  deductBalance: (amount: number) => void;
  chatMessages: Record<string, ChatMessage[]>;
  addChatMessage: (jobId: string, message: ChatMessage) => void;
}

export const useFixMateStore = create<FixMateState>((set) => ({
  diagnosis: null,
  setDiagnosis: (d) => set({ diagnosis: d }),
  selectedArtisan: null,
  setSelectedArtisan: (a) => set({ selectedArtisan: a }),
  escrowStatus: 'IDLE',
  setEscrowStatus: (s) => set({ escrowStatus: s }),
  userBalance: MOCK_USER.walletBalance,
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
