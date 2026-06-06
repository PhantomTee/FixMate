'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useFixMateStore } from '@/lib/store';
import { Send, User as UserIcon } from 'lucide-react';

interface JobChatProps {
  jobId: string;
  currentUserType: 'user' | 'artisan';
}

export default function JobChat({ jobId, currentUserType }: JobChatProps) {
  const chatMessages = useFixMateStore(state => state.chatMessages);
  const addChatMessage = useFixMateStore(state => state.addChatMessage);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => chatMessages[jobId] || [], [chatMessages, jobId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    
    addChatMessage(jobId, {
      id: Date.now().toString(),
      senderType: currentUserType,
      text: inputText.trim(),
      timestamp: new Date().toISOString()
    });
    
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-80 border border-gray-200 rounded-xl overflow-hidden bg-white mt-4">
      <div className="bg-gray-50 border-b border-gray-200 p-3 flex items-center justify-between">
        <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Live Chat Support
        </h4>
        <span className="text-xs text-gray-500">
          Connected with {currentUserType === 'user' ? 'Artisan' : 'Customer'}
        </span>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-xs text-gray-400 mt-10">
            No messages yet. Say hello to your {currentUserType === 'user' ? 'artisan' : 'customer'}.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderType === currentUserType;
            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isMe ? (currentUserType === 'user' ? 'bg-green-600' : 'bg-gray-900') : (currentUserType === 'user' ? 'bg-gray-900' : 'bg-green-600')}`}>
                   {isMe ? <UserIcon className="w-4 h-4 text-white" /> : <span className="text-xs text-white uppercase font-bold">{msg.senderType.charAt(0)}</span>}
                 </div>
                 <div className={`max-w-[75%] rounded-2xl p-3 text-sm ${isMe ? (currentUserType === 'user' ? 'bg-green-600 text-white rounded-tr-sm' : 'bg-gray-900 text-white rounded-tr-sm') : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'}`}>
                    <p>{msg.text}</p>
                    <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                 </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white border-t border-gray-200 flex gap-2">
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 transition-all text-gray-900"
        />
        <button 
          onClick={handleSend}
          disabled={!inputText.trim()}
          className="bg-gray-900 hover:bg-gray-800 text-white p-2 rounded-lg disabled:opacity-50 transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
