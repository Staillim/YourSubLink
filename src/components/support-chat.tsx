
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
  where,
  updateDoc,
  getDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, X, Loader2, ArrowLeft, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage, SupportTicket } from '@/types';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';

const getStatusBadgeVariant = (status: SupportTicket['status']) => {
    switch (status) {
        case 'pending': return 'bg-yellow-500 hover:bg-yellow-500/80';
        case 'answered': return 'bg-blue-500 hover:bg-blue-500/80';
        case 'completed': return 'bg-green-600 hover:bg-green-600/80';
        default: return 'secondary';
    }
}

const predefinedQuestions = [
    { 
        question: "Problema con un pago",
        template: "Hola, tengo un problema con un pago. El ID de la transacción es (si lo tienes): \n\nMi problema es: "
    },
    { 
        question: "Un enlace no funciona",
        template: "Hola, uno de mis enlaces no funciona correctamente. El enlace es: \n\nEl problema que estoy viendo es: "
    },
    {
        question: "Pregunta sobre mi saldo",
        template: "Hola, tengo una pregunta sobre mi saldo. \n\nMi duda es: "
    },
    {
        question: "Sugerencia para la plataforma",
        template: "Hola, tengo una sugerencia para mejorar la plataforma. \n\nMi sugerencia es: "
    }
];


export default function SupportChat() {
  const { user, profile } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'list' | 'chat' | 'new'>('list');
  
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const hasUnread = tickets.some(ticket => !ticket.isReadByUser);


  useEffect(() => {
    if (!user) return;

    setLoading(true);
    // Query only by userId, as required by Firestore rules. Sorting will be done on the client.
    const ticketsQuery = query(
      collection(db, 'supportTickets'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(ticketsQuery, (snapshot) => {
        const ticketsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as SupportTicket));
        
        // Sort tickets by timestamp on the client side to avoid composite index requirement.
        setTickets(ticketsData.sort((a, b) => (b.lastMessageTimestamp?.seconds ?? 0) - (a.lastMessageTimestamp?.seconds ?? 0)));
        setLoading(false);
    }, (error) => {
        console.error("Error fetching support tickets: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
}, [user]);


  // Effect to load messages when a ticket is selected
  useEffect(() => {
    if (!selectedTicket) {
      setMessages([]);
      return;
    }
    setLoading(true);
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
      setLoading(false);
    }, (error) => {
        console.error("Error fetching messages:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedTicket]);

  useEffect(() => {
    if(isOpen) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const openChat = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setView('chat');
    if (!ticket.isReadByUser && user) {
        const batch = writeBatch(db);
        
        const ticketRef = doc(db, 'supportTickets', ticket.id);
        batch.update(ticketRef, { isReadByUser: true });
        
        const notifQuery = query(
            collection(db, 'notifications'), 
            where('userId', '==', user.uid),
            where('ticketId', '==', ticket.id),
            where('isRead', '==', false)
        );
        const notifSnapshot = await getDocs(notifQuery);
        if (!notifSnapshot.empty) {
            notifSnapshot.docs.forEach(notifDoc => {
                batch.update(notifDoc.ref, { isRead: true });
            });
        }
        
        await batch.commit();
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !profile || !selectedTicket) return;

    if (selectedTicket.status === 'completed') return;

    const messageText = newMessage;
    setNewMessage('');

    const batch = writeBatch(db);
    const ticketRef = doc(db, 'supportTickets', selectedTicket.id);

    const messagesRef = doc(collection(ticketRef, 'messages'));
    batch.set(messagesRef, {
      text: messageText,
      senderId: user.uid,
      timestamp: serverTimestamp(),
    });
    
    batch.update(ticketRef, {
        lastMessage: messageText,
        lastMessageTimestamp: serverTimestamp(),
        isReadByAdmin: false,
        isReadByUser: true,
        status: 'pending',
    });

    await batch.commit();
  };

  const handleCreateTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim() || !user || !profile) return;
    
    setLoading(true);

    const batch = writeBatch(db);

    const ticketRef = doc(collection(db, 'supportTickets'));
    batch.set(ticketRef, {
        userId: user.uid,
        userName: profile.displayName,
        userEmail: profile.email || 'No email provided',
        subject: newSubject,
        lastMessage: newMessage,
        lastMessageTimestamp: serverTimestamp(),
        isReadByAdmin: false,
        isReadByUser: true,
        status: 'pending',
    });
    
    const messagesRef = doc(collection(ticketRef, 'messages'));
    batch.set(messagesRef, {
        text: newMessage,
        senderId: user.uid,
        timestamp: serverTimestamp(),
    });

    await batch.commit();
    
    setNewSubject('');
    setNewMessage('');
    setLoading(false);
    setView('list');
  };
  
  const handlePredefinedQuestionClick = (subject: string, template: string) => {
    setNewSubject(subject);
    setNewMessage(template);
  }

  const handleOpenWidget = () => {
    setIsOpen(true);
    setView('list');
  }

  const handleCloseWidget = () => {
    setIsOpen(false);
    setSelectedTicket(null);
  }

  if (!user) return null;

  if (isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="w-80 h-[450px] bg-card border rounded-lg shadow-lg flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b">
            {view !== 'list' && (
                <Button variant="ghost" size="icon" onClick={() => setView('list')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            )}
            <h3 className="font-semibold text-card-foreground">
                {view === 'list' && 'Support Tickets'}
                {view === 'chat' && (selectedTicket?.subject || 'Chat')}
                {view === 'new' && 'New Ticket'}
            </h3>
            <Button variant="ghost" size="icon" onClick={handleCloseWidget}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* List View */}
          {view === 'list' && (
            <>
                <ScrollArea className="flex-1 p-2">
                    {loading && <div className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}
                    {!loading && tickets.length === 0 && (
                        <div className="text-center text-muted-foreground p-8">No tickets yet.</div>
                    )}
                    <div className="space-y-2">
                    {tickets.map(ticket => (
                        <button key={ticket.id} onClick={() => openChat(ticket)} className="w-full text-left p-2 rounded-md hover:bg-muted/50 flex items-center gap-3">
                            <div className="flex-1 truncate">
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold truncate">{ticket.subject}</p>
                                    {!ticket.isReadByUser && <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />}
                                </div>
                                <p className="text-sm text-muted-foreground truncate">{ticket.lastMessage}</p>
                                <Badge variant="outline" className={cn("capitalize text-xs h-5 mt-1", getStatusBadgeVariant(ticket.status))}>{ticket.status}</Badge>
                            </div>
                        </button>
                    ))}
                    </div>
                </ScrollArea>
                <div className="p-2 border-t">
                    <Button className="w-full" onClick={() => setView('new')}>
                        <PlusCircle className="mr-2 h-4 w-4"/>
                        Create New Ticket
                    </Button>
                </div>
            </>
          )}

          {/* Chat View */}
          {view === 'chat' && selectedTicket && (
            <>
                <ScrollArea className="flex-1 p-3">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {messages.map((msg) => (
                                <div key={msg.id} className={cn('flex flex-col gap-1', msg.senderId === user.uid ? 'items-end' : 'items-start')}>
                                    <div className={cn('flex items-end gap-2 max-w-[90%]', msg.senderId === user.uid ? 'flex-row-reverse' : '')}>
                                        <div className={cn('rounded-lg py-1.5 px-3', msg.senderId === user.uid ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
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

                <div className="p-3 border-t">
                    {selectedTicket.status === 'completed' ? (
                        <div className="text-center text-xs text-muted-foreground p-2">This ticket has been marked as completed. Please create a new ticket for further assistance.</div>
                    ) : (
                        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2">
                            <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." autoComplete="off" />
                            <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    )}
                </div>
            </>
          )}

          {/* New Ticket View */}
          {view === 'new' && (
            <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
                    <p className="text-xs text-muted-foreground">Select a common issue or write your own subject.</p>
                    <div className="flex flex-col space-y-2">
                        {predefinedQuestions.map((q, i) => (
                            <Button 
                                key={i} 
                                variant="outline" 
                                size="sm" 
                                className="h-auto py-2 justify-start text-left"
                                onClick={() => handlePredefinedQuestionClick(q.question, q.template)}
                            >
                                {q.question}
                            </Button>
                        ))}
                    </div>
                    
                    <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Subject" />
                    <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="How can we help you?" className="h-28"/>
                </div>
                <div className="p-3 border-t">
                     <Button className="w-full" onClick={handleCreateTicket} disabled={loading || !newSubject.trim() || !newMessage.trim()}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                        Send Ticket
                    </Button>
                </div>
            </ScrollArea>
          )}
        </div>
      </div>
    );
  }

  return (
    <Button
      onClick={handleOpenWidget}
      className="fixed bottom-4 right-4 z-50 rounded-full h-14 w-14 shadow-lg"
    >
      <MessageSquare />
      {hasUnread && (
        <span className="absolute top-1 right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      )}
    </Button>
  );
}
