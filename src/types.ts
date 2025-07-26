import type { Rule } from '@/components/rule-editor';
import type { Timestamp } from 'firebase/firestore';

export type MonetizationPeriod = {
  status: 'active' | 'suspended';
  cpm: number;
  from: Timestamp | any; // Allow serverTimestamp
  to: Timestamp | null | any; // Allow serverTimestamp
};

export type LinkData = {
  id: string;
  original: string;
  shortId: string;
  rules: Rule[];
  title: string;
  description?: string;
  userId: string;
  clicks: number;
  generatedEarnings: number;
  monetizationHistory: MonetizationPeriod[];
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
