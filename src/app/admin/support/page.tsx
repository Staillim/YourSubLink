
'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Send, MessageSquare, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { Chat, ChatMessage } from '@/types';
import { useUser } from '@/hooks/use-user';

export default function AdminSupportPage() {
  const { user, role } = useUser();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'chats'), orderBy('lastMessageTimestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Chat[];
      setChats(chatsData);
      setLoadingChats(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      setLoadingMessages(true);
      const messagesQuery = query(
        collection(db, 'chats', selectedChat.id, 'messages'),
        orderBy('timestamp', 'asc')
      );
      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messagesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ChatMessage[];
        setMessages(messagesData);
        setLoadingMessages(false);
      });
      return () => unsubscribe();
    }
  }, [selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectChat = async (chat: Chat) => {
    setSelectedChat(chat);
    if (!chat.isReadByAdmin) {
      await setDoc(doc(db, 'chats', chat.id), { isReadByAdmin: true }, { merge: true });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !user) return;

    const messageText = newMessage;
    setNewMessage('');

    const chatRef = doc(db, 'chats', selectedChat.id);
    const messagesRef = collection(chatRef, 'messages');

    await addDoc(messagesRef, {
      text: messageText,
      senderId: 'support',
      timestamp: serverTimestamp(),
    });

    await setDoc(chatRef, {
        lastMessage: messageText,
        lastMessageTimestamp: serverTimestamp(),
    }, { merge: true });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[350px_1fr] h-[calc(100vh-8rem)] gap-4">
      {/* Chat List */}
      <Card className="flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Conversations</h2>
        </div>
        <ScrollArea className="flex-1">
          {loadingChats ? (
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => handleSelectChat(chat)}
                className={cn(
                  'flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors border-b',
                  selectedChat?.id === chat.id && 'bg-muted',
                  !chat.isReadByAdmin && 'font-bold'
                )}
              >
                <div className="relative">
                    <Avatar>
                        <AvatarFallback>{chat.userName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    {!chat.isReadByAdmin && (
                        <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-background" />
                    )}
                </div>
                <div className="flex-1 truncate">
                  <p className="truncate">{chat.userName}</p>
                  <p className={cn('truncate text-sm', !chat.isReadByAdmin ? 'text-foreground' : 'text-muted-foreground')}>
                    {chat.lastMessage}
                  </p>
                </div>
              </button>
            ))
          )}
           {!loadingChats && chats.length === 0 && (
                <div className="text-center p-8 text-muted-foreground">
                    <MessageSquare className="mx-auto h-12 w-12 mb-4" />
                    <p>No active conversations.</p>
                </div>
            )}
        </ScrollArea>
      </Card>

      {/* Message View */}
      <Card className="flex flex-col h-full">
        {selectedChat ? (
          <>
            <div className="p-4 border-b flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{selectedChat.userName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{selectedChat.userName}</h3>
                <p className="text-sm text-muted-foreground">{selectedChat.userEmail}</p>
              </div>
            </div>
            <ScrollArea className="flex-1 p-4">
                {loadingMessages ? (
                    <div className="p-4 space-y-4">
                        <Skeleton className="h-12 w-3/4" />
                        <Skeleton className="h-12 w-3/4 ml-auto" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((msg) => (
                            <div
                            key={msg.id}
                            className={cn(
                                'flex items-end gap-2 max-w-[80%]',
                                msg.senderId === 'support' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                            )}
                            >
                            <div
                                className={cn(
                                'rounded-lg p-3',
                                msg.senderId === 'support'
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
            <div className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  autoComplete="off"
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-16 w-16 mb-4" />
            <p>Select a conversation to start chatting</p>
          </div>
        )}
      </Card>
    </div>
  );
}
