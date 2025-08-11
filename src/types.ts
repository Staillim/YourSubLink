
import type { Rule } from '@/components/rule-editor';

export type LinkData = {
  id: string;
  original: string;
  shortId: string;
  rules: Rule[];
  title: string;
  description?: string;
  userId: string;
  monetizable: boolean;
  clicks: number;
  monetizationStatus: 'active' | 'suspended';
  generatedEarnings: number;
};

export type Notification = {
    id: string;
    userId: string;
    type: 'payout_requested' | 'payout_completed' | 'payout_rejected' | 'link_suspension' | 'link_deleted' | 'milestone' | 'ticket_answered' | 'ticket_completed' | 'custom_cpm_set';
    message: string;
    createdAt: any; // Firestore Timestamp
    isRead: boolean;
    linkId?: string; // Optional, for link-related notifications
    href?: string; // Optional, for dynamic linking
    ticketId?: string; // Optional, for ticket-related notifications
};


export type SupportTicket = {
  id: string; // The document ID from Firestore
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  lastMessage: string;
  lastMessageTimestamp: any; // Firestore Timestamp
  isReadByAdmin: boolean;
  isReadByUser: boolean;
  status: 'pending' | 'answered' | 'completed';
}

export type ChatMessage = {
  id: string;
  text: string;
  senderId: string; // userId or 'support'
  timestamp: any;
  isPredefined?: boolean;
}

// ===== SISTEMA DE MONETIZACIÓN SPONSOR =====

export interface SponsorRule {
  id: string;
  linkId: string;           // ID del enlace al que se aplica
  title: string;           // "Visita nuestra tienda"
  sponsorUrl: string;      // URL del patrocinador
  isActive: boolean;       // true/false para activar/desactivar
  createdBy: string;       // ID del admin que lo creó
  createdAt: any;          // Firestore Timestamp
  expiresAt?: any;         // Firestore Timestamp - Fecha de expiración opcional
}

export interface SponsorStats {
  sponsorId: string;
  views: number;           // Cuántas veces se vio
  completions: number;     // Cuántas veces se completó
  conversionRate: number;  // % de conversión
  lastSeen: any;          // Firestore Timestamp
}

// Actualizar ClickData existente con campos de sponsor
export interface ClickData {
  id: string;
  linkId: string;
  userId: string;
  timestamp: any;          // Firestore Timestamp
  // Campos existentes...
  
  // NUEVOS CAMPOS SPONSOR
  sponsorViews?: number;              // Cuántos sponsors vio
  sponsorCompleted?: number;          // Cuántos sponsors completó
  sponsorsData?: {                    // Detalle por sponsor
    sponsorId: string;
    sponsorTitle: string;
    viewedAt: any;                    // Firestore Timestamp
    completedAt?: any;                // Firestore Timestamp (si lo completó)
  }[];
}

// Helper functions para expiración de sponsors
export const isSponsorExpired = (sponsor: SponsorRule): boolean => {
  if (!sponsor.expiresAt) return false; // Sin expiración = no expira
  
  // Convertir Firestore Timestamp a Date si es necesario
  const expirationDate = sponsor.expiresAt.toDate ? 
    sponsor.expiresAt.toDate() : 
    new Date(sponsor.expiresAt);
    
  return expirationDate < new Date();
};

export const getActiveSponsors = (sponsors: SponsorRule[]): SponsorRule[] => {
  return sponsors.filter(sponsor => 
    sponsor.isActive && !isSponsorExpired(sponsor)
  );
};
