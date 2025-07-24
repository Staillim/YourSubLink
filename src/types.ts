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
};

export type Notification = {
    id: string;
    userId: string;
    type: 'payout_requested' | 'payout_completed' | 'payout_rejected' | 'link_suspension' | 'link_deleted' | 'milestone';
    message: string;
    createdAt: any; // Firestore Timestamp
    isRead: boolean;
    linkId?: string; // Optional, for link-related notifications
    href?: string; // Optional, for dynamic linking
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
