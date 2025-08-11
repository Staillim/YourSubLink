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


export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'support' | 'root';
  profileImage?: string;
  isActive: boolean;
  joinedAt: any; // Firestore Timestamp
  lastLoginAt?: any; // Firestore Timestamp
  permissions: string[];
};

// NUEVAS INTERFACES PARA SPONSOR SYSTEM

export interface SponsorRule {
  id?: string;                        // Firestore auto-generated ID
  linkId: string;                     // ID del link al que pertenece
  userId: string;                     // ID del usuario propietario del link
  title: string;                      // Título del sponsor
  sponsorUrl: string;                 // URL a la que redirige
  isActive: boolean;                  // Si está activo o pausado
  createdAt: any;                     // Firestore Timestamp
  expiresAt?: any;                    // Firestore Timestamp opcional
  
  // Métricas y analytics
  views: number;                      // Veces mostrado
  clicks: number;                     // Veces clickeado
  lastShown?: any;                    // Firestore Timestamp
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  profileImage?: string;
  role: 'user' | 'admin' | 'support';
  isActive: boolean;
  joinedAt: any;          // Firestore Timestamp
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
