

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

export type Chat = {
  id: string; // Same as userId
  userId: string;
  userName: string;
  userEmail: string;
  lastMessage: string;
  lastMessageTimestamp: any;
  isReadByAdmin: boolean;
}

export type ChatMessage = {
  id: string;
  text: string;
  senderId: string; // userId or 'support'
  timestamp: any;
  isPredefined?: boolean;
}
