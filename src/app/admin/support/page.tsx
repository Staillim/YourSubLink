
'use client';

import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
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
  updateDoc,
  writeBatch,
  getDoc,
  where,
} from 'firebase/firestore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Send, MessageSquare, MoreVertical, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { SupportTicket, ChatMessage, Notification } from '@/types';
import { useUser } from '@/hooks/use-user';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';


const getStatusBadgeVariant = (status: SupportTicket['status']) => {
    switch (status) {
        case 'pending': return 'bg-yellow-500 hover:bg-yellow-500/80';
        case 'answered': return 'bg-blue-500 hover:bg-blue-500/80';
        case 'completed': return 'bg-green-600 hover:bg-green-600/80';
        default: return 'secondary';
    }
}

export default function AdminSupportPage() {
  const { user, role, loading: userLoading } = useUser();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This is the "double check". Do not proceed if user data is still loading
    // or if the user is not confirmed to be an admin. This prevents the race condition.
    if (userLoading || role !== 'admin') {
        if (!userLoading) setLoadingTickets(false);
        return;
    }
    
    setLoadingTickets(true);
    const q = query(collection(db, 'supportTickets'), orderBy('lastMessageTimestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SupportTicket[];
      setTickets(ticketsData);
      setLoadingTickets(false);
    }, (error) => {
        console.error("Error fetching tickets: ", error);
        setLoadingTickets(false);
    });

    return () => unsubscribe();
  }, [role, userLoading]);

  useEffect(() => {
    if (selectedTicket) {
      setLoadingMessages(true);
      const messagesQuery = query(
        collection(db, 'supportTickets', selectedTicket.id, 'messages'),
        orderBy('timestamp', 'asc')
      );
      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messagesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ChatMessage[];
        setMessages(messagesData);
        setLoadingMessages(false);
      }, (error) => {
        console.error("Error fetching messages: ", error);
        setLoadingMessages(false);
      });
      return () => unsubscribe();
    }
  }, [selectedTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    if (!ticket.isReadByAdmin) {
      await updateDoc(doc(db, 'supportTickets', ticket.id), { isReadByAdmin: true });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket || !user) return;
    
    // Prevent sending messages to a completed ticket
    if (selectedTicket.status === 'completed') return;

    const messageText = newMessage;
    setNewMessage('');

    try {
      const batch = writeBatch(db);
      const ticketRef = doc(db, 'supportTickets', selectedTicket.id);
      
      const messagesRef = doc(collection(ticketRef, 'messages'));
      batch.set(messagesRef, {
        text: messageText,
        senderId: 'support',
        timestamp: serverTimestamp(),
      });
      
      batch.update(ticketRef, {
          lastMessage: messageText,
          lastMessageTimestamp: serverTimestamp(),
          isReadByUser: false,
          status: 'answered',
      });
      
      const notificationRef = doc(collection(db, 'notifications'));
      const notif: Omit<Notification, 'id'> = {
        userId: selectedTicket.userId,
        type: 'ticket_answered',
        message: `Support has replied to your ticket: "${selectedTicket.subject}"`,
        createdAt: serverTimestamp(),
        isRead: false,
        ticketId: selectedTicket.id, // Associate notification with ticket
      }
      batch.set(notificationRef, notif);
      
      await batch.commit();
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error Sending Message',
        description: 'The message could not be sent. The ticket may be closed.',
        variant: 'destructive',
      })
    }
  };

  const handleChangeStatus = async (ticket: SupportTicket, status: SupportTicket['status']) => {
    const batch = writeBatch(db);
    const ticketRef = doc(db, 'supportTickets', ticket.id);
    
    batch.update(ticketRef, { status });

    if(status === 'completed') {
        const notificationRef = doc(collection(db, 'notifications'));
         const notif: Omit<Notification, 'id'> = {
            userId: ticket.userId,
            type: 'ticket_completed',
            message: `Your support ticket "${ticket.subject}" has been closed.`,
            createdAt: serverTimestamp(),
            isRead: false,
            ticketId: ticket.id,
        };
        batch.set(notificationRef, notif);
    }
    
    await batch.commit();

    toast({
        title: 'Ticket Status Updated',
        description: `The ticket has been marked as ${status}.`
    })
  };
  
  const { activeTickets, completedTickets } = useMemo(() => {
    const active = tickets.filter(t => t.status !== 'completed');
    const completed = tickets.filter(t => t.status === 'completed');
    return { activeTickets: active, completedTickets: completed };
  }, [tickets]);


  const renderTicketList = (list: SupportTicket[]) => {
    if (loadingTickets || userLoading) {
      return (
        <div className="p-2 space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      );
    }
    if (list.length === 0) {
       return (
        <div className="text-center p-8 text-muted-foreground">
            <MessageSquare className="mx-auto h-12 w-12 mb-4" />
            <p>No tickets in this category.</p>
        </div>
       );
    }
    return list.map((ticket) => (
        <button
        key={ticket.id}
        onClick={() => handleSelectTicket(ticket)}
        className={cn(
            'flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors border-b',
            selectedTicket?.id === ticket.id && 'bg-muted'
        )}
        >
        <div className="relative">
            <Avatar>
                <AvatarFallback>{ticket.userName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            {!ticket.isReadByAdmin && (
                <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-background" />
            )}
        </div>
        <div className="flex-1 truncate">
            <div className="flex items-center justify-between">
                <p className={cn("truncate font-semibold", !ticket.isReadByAdmin && "font-bold")}>{ticket.userName}</p>
                <Badge className={cn("capitalize text-white", getStatusBadgeVariant(ticket.status))}>{ticket.status}</Badge>
            </div>
            <p className="truncate text-sm font-medium text-foreground">{ticket.subject}</p>
            <p className="truncate text-sm text-muted-foreground">{ticket.lastMessage}</p>
        </div>
        </button>
    ));
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[350px_1fr] h-[calc(100vh-8rem)] gap-4">
      <Card className="flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Support Tickets</h2>
        </div>
        <Tabs defaultValue="active" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="flex-1">
                <ScrollArea className="h-[calc(100vh-18rem)]">
                    {renderTicketList(activeTickets)}
                </ScrollArea>
            </TabsContent>
            <TabsContent value="completed" className="flex-1">
                <ScrollArea className="h-[calc(100vh-18rem)]">
                    {renderTicketList(completedTickets)}
                </ScrollArea>
            </TabsContent>
        </Tabs>
      </Card>

      {/* Message View */}
      <Card className="flex flex-col h-full">
        {selectedTicket ? (
          <>
            <div className="p-3 border-b flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarFallback>{selectedTicket.userName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                    <h3 className="font-semibold">{selectedTicket.userName}</h3>
                    <p className="text-sm text-muted-foreground">{selectedTicket.userEmail}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleChangeStatus(selectedTicket, 'pending')}>Mark as Pending</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleChangeStatus(selectedTicket, 'answered')}>Mark as Answered</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleChangeStatus(selectedTicket, 'completed')}>Mark as Completed</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <ScrollArea className="flex-1 p-4">
                {loadingMessages ? (
                    <div className="p-4 space-y-4 flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((msg) => (
                             <div key={msg.id} className={cn('flex flex-col gap-1', msg.senderId === 'support' ? 'items-end' : 'items-start')}>
                                <div
                                    className={cn(
                                        'flex items-end gap-2 max-w-[80%]',
                                        msg.senderId === 'support' ? 'flex-row-reverse' : ''
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
                                <p className="text-xs text-muted-foreground px-1">
                                    {msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </p>
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
                  disabled={selectedTicket.status === 'completed'}
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim() || selectedTicket.status === 'completed'}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-16 w-16 mb-4" />
            <p>Select a ticket to view the conversation</p>
          </div>
        )}
      </Card>
    </div>
  );
}
