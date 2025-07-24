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
  arrayUnion,
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


  // Effect to subscribe to the user's tickets via their profile
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    // Watch the user's own profile document for the list of ticket IDs
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (userDoc) => {
        const userData = userDoc.data();
        const ticketIds = userData?.supportTicketIds || [];

        if (ticketIds.length === 0) {
            setTickets([]);
            setLoading(false);
            return;
        }

        // Now, for each ticket ID, set up a listener
        const unsubscribers = ticketIds.map((ticketId: string) => {
            const ticketDocRef = doc(db, 'supportTickets', ticketId);
            return onSnapshot(ticketDocRef, (ticketDoc) => {
                if (ticketDoc.exists()) {
                    const newTicketData = { id: ticketDoc.id, ...ticketDoc.data() } as SupportTicket;
                    setTickets(currentTickets => {
                        const existingIndex = currentTickets.findIndex(t => t.id === newTicketData.id);
                        let updatedTickets;
                        if (existingIndex > -1) {
                            updatedTickets = [...currentTickets];
                            updatedTickets[existingIndex] = newTicketData;
                        } else {
                            updatedTickets = [...currentTickets, newTicketData];
                        }
                        // Sort tickets by last message timestamp descending
                        return updatedTickets.sort((a, b) => (b.lastMessageTimestamp?.seconds ?? 0) - (a.lastMessageTimestamp?.seconds ?? 0));
                    });
                }
            });
        });

        setLoading(false);
        
        // Return a cleanup function that unsubscribes from all ticket listeners
        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    });

    return () => unsubscribeUser();
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
    if (!ticket.isReadByUser) {
        await updateDoc(doc(db, 'supportTickets', ticket.id), { isReadByUser: true });
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !profile || !selectedTicket) return;

    // Prevent sending messages on a completed ticket
    if (selectedTicket.status === 'completed') return;

    const messageText = newMessage;
    setNewMessage('');

    const ticketRef = doc(db, 'supportTickets', selectedTicket.id);
    const messagesRef = collection(ticketRef, 'messages');

    await addDoc(messagesRef, {
      text: messageText,
      senderId: user.uid,
      timestamp: serverTimestamp(),
    });
    
    await updateDoc(ticketRef, {
        lastMessage: messageText,
        lastMessageTimestamp: serverTimestamp(),
        isReadByAdmin: false,
        isReadByUser: true,
        status: 'pending', // Re-open the ticket if user replies
    });
  };

  const handleCreateTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim() || !user || !profile) return;
    
    setLoading(true);

    const ticketData: Omit<SupportTicket, 'id'> = {
        userId: user.uid,
        userName: profile.displayName,
        userEmail: profile.email || 'No email provided',
        subject: newSubject,
        lastMessage: newMessage,
        lastMessageTimestamp: serverTimestamp(),
        isReadByAdmin: false,
        isReadByUser: true,
        status: 'pending',
    };

    const ticketRef = await addDoc(collection(db, 'supportTickets'), ticketData);
    
    const messagesRef = collection(ticketRef, 'messages');
    await addDoc(messagesRef, {
        text: newMessage,
        senderId: user.uid,
        timestamp: serverTimestamp(),
    });

    // Add the new ticket ID to the user's profile
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
        supportTicketIds: arrayUnion(ticketRef.id)
    });
    
    setNewSubject('');
    setNewMessage('');
    setLoading(false);
    setView('list');
  };

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
                                <div key={msg.id} className={cn('flex items-end gap-2 max-w-[90%]', msg.senderId === user.uid ? 'ml-auto flex-row-reverse' : 'mr-auto')}>
                                    <div className={cn('rounded-lg py-1.5 px-3', msg.senderId === user.uid ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                        <p className="text-sm">{msg.text}</p>
                                    </div>
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
            <>
                <div className="p-3 flex-1 space-y-4">
                     <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Subject" />
                     <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="How can we help you?" className="h-40"/>
                </div>
                <div className="p-3 border-t">
                     <Button className="w-full" onClick={handleCreateTicket} disabled={loading || !newSubject.trim() || !newMessage.trim()}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                        Send Ticket
                    </Button>
                </div>
            </>
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
