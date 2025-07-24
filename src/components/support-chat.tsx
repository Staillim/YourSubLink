
'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@/hooks/use-user';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types';

const PREDEFINED_QUESTIONS = [
  'Why was my account suspended?',
  'I want to appeal my account suspension.',
  'What did I do wrong?',
  'I have a question about my payments.',
];

export default function SupportChat() {
  const { user, profile } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isSuspended = profile?.accountStatus === 'suspended';

  useEffect(() => {
    if (!isOpen || !user) return;

    setLoading(true);
    const messagesQuery = query(
      collection(db, 'chats', user.uid, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatMessage[];
      setMessages(messagesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, user]);

  useEffect(() => {
    if(isOpen) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (text: string, isPredefined = false) => {
    if (!text.trim() || !user || !profile) return;

    const chatRef = doc(db, 'chats', user.uid);
    const messagesRef = collection(chatRef, 'messages');

    await addDoc(messagesRef, {
      text,
      senderId: user.uid,
      timestamp: serverTimestamp(),
      isPredefined,
    });
    
    // Create or update the main chat document for admin view
    await setDoc(chatRef, {
        userId: user.uid,
        userName: profile.displayName,
        userEmail: profile.email,
        lastMessage: text,
        lastMessageTimestamp: serverTimestamp(),
        isReadByAdmin: false,
    }, { merge: true });

    setNewMessage('');
  };

  if (!user) return null;

  if (isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="w-80 h-[450px] bg-card border rounded-lg shadow-lg flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-semibold text-card-foreground">Support Chat</h3>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-3">
            {loading ? (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="space-y-3">
                    {messages.map((msg) => (
                        <div
                        key={msg.id}
                        className={cn(
                            'flex items-end gap-2 max-w-[90%]',
                            msg.senderId === user.uid ? 'ml-auto flex-row-reverse' : 'mr-auto'
                        )}
                        >
                            <div
                                className={cn(
                                'rounded-lg py-1.5 px-3',
                                msg.senderId === user.uid
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                )}
                            >
                                <p className="text-sm">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t">
            {isSuspended && messages.length === 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-center text-muted-foreground mb-2">Select a predefined question to send:</p>
                {PREDEFINED_QUESTIONS.map((q) => (
                  <Button
                    key={q}
                    variant="outline"
                    className="w-full text-left justify-start h-auto py-2"
                    onClick={() => handleSendMessage(q, true)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(newMessage);
                }}
                className="flex items-center gap-2"
              >
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  autoComplete="off"
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Button
      onClick={() => setIsOpen(true)}
      className="fixed bottom-4 right-4 z-50 rounded-full h-14 w-14 shadow-lg"
    >
      <MessageSquare />
    </Button>
  );
}
