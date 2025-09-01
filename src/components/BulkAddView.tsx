import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Loader2, Send, User } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

interface Message {
    id: number;
    sender: 'user' | 'bot';
    text: string | React.ReactNode;
}

interface BulkAddViewProps {
    bulkCreateTasks: (prompt: string) => Promise<{ success: boolean; summary: string; createdCount: number; failedCount: number; tasks: any[] }>;
    isProcessing: boolean;
}

export const BulkAddView = ({ bulkCreateTasks, isProcessing }: BulkAddViewProps) => {
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, sender: 'bot', text: "Hello! Describe the tasks you want to create. You can list multiple tasks in one message. For example: 'I need to buy groceries for tonight and also finish the Q3 report for work.'" }
    ]);
    const [input, setInput] = useState('');
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollElement = scrollAreaRef.current.querySelector('div');
            if (scrollElement) {
                scrollElement.scrollTo({ top: scrollElement.scrollHeight, behavior: 'smooth' });
            }
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isProcessing) return;

        const userMessage: Message = { id: Date.now(), sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');

        const botLoadingMessage: Message = { id: Date.now() + 1, sender: 'bot', text: <Loader2 className="h-5 w-5 animate-spin" /> };
        setMessages(prev => [...prev, botLoadingMessage]);

        const result = await bulkCreateTasks(input);

        const botResponseMessage: Message = {
            id: Date.now() + 2,
            sender: 'bot',
            text: (
                <div>
                    <p>{result.summary}</p>
                    {result.tasks.length > 0 && (
                        <ul className="list-disc pl-5 mt-2 text-sm">
                            {result.tasks.map((task, index) => (
                                <li key={index}><strong>{task.title}</strong> in list: <em>{task.listName}</em></li>
                            ))}
                        </ul>
                    )}
                </div>
            )
        };

        setMessages(prev => prev.filter(m => m.id !== botLoadingMessage.id).concat(botResponseMessage));
    };

    return (
        <Card className="w-full h-full flex flex-col">
            <CardHeader>
                <h3 className="text-lg font-semibold">Bulk Add Tasks with AI</h3>
                <p className="text-sm text-muted-foreground">Describe your tasks in plain English, and the AI will add them to your lists.</p>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden">
                <ScrollArea className="h-[50vh] pr-4" ref={scrollAreaRef}>
                    <div className="space-y-4">
                        {messages.map((message) => (
                            <div key={message.id} className={`flex items-start gap-3 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                                {message.sender === 'bot' && (
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={`rounded-lg p-3 max-w-md ${message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                    <p className="text-sm">{message.text}</p>
                                </div>
                                {message.sender === 'user' && (
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
            <CardFooter>
                <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your tasks here..."
                        disabled={isProcessing}
                    />
                    <Button type="submit" disabled={isProcessing || !input.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </CardFooter>
        </Card>
    );
};