import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { ChatMessage } from '../types';
import Spinner from './Spinner';
import { PaperclipIcon, XIcon } from './icons';

interface Attachment {
  file: File;
  base64: string;
  mimeType: string;
}

const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = useCallback(() => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      chatRef.current = ai.chats.create({
        model: 'gemini-2.5-flash',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize chat.');
      console.error(err);
    }
  }, []);

  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve({ base64: result.split(',')[1], mimeType: file.type });
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        setError('File is too large. Please select a file smaller than 4MB.');
        return;
      }
      try {
        setError('');
        const { base64, mimeType } = await fileToBase64(file);
        setAttachment({ file, base64, mimeType });
      } catch (error) {
        setError('Failed to read the file.');
        console.error(error);
      }
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachment) || loading) return;

    const userMessage: ChatMessage = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);

    const currentInput = input;
    const currentAttachment = attachment;
    
    setInput('');
    setAttachment(null);
    setLoading(true);
    setError('');

    try {
      if (!chatRef.current) {
        throw new Error('Chat is not initialized.');
      }

      const parts: ({text: string} | {inlineData: {data: string, mimeType: string}})[] = [];
      
      if(currentAttachment){
        parts.push({
          inlineData: {
            data: currentAttachment.base64,
            mimeType: currentAttachment.mimeType,
          },
        });
      }
      
      if (currentInput.trim()) {
        parts.push({ text: currentInput });
      }
      
      // The API expects an object with a `message` property containing the parts.
      const stream = await chatRef.current.sendMessageStream({ message: parts });

      let botResponse = '';
      setMessages((prev) => [...prev, { sender: 'bot', text: '...' }]);

      for await (const chunk of stream) {
        if (chunk.text) {
          botResponse += chunk.text;
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if(lastMessage?.sender === 'bot') {
                lastMessage.text = botResponse;
            }
            return newMessages;
          });
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      setMessages((prev) => [...prev, { sender: 'bot', text: `Error: ${errorMessage}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg flex flex-col h-[70vh]">
      <h2 className="text-xl font-semibold mb-4 text-white">Gemini Chat</h2>
      <div className="flex-grow overflow-y-auto pr-4 space-y-4 mb-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${
                msg.sender === 'user' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-200'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
         <div ref={messagesEndRef} />
      </div>

      {loading && !messages.some(m => m.sender === 'bot' && m.text.endsWith('...')) && (
        <div className="flex justify-start mb-4">
          <div className="bg-gray-700 px-4 py-2 rounded-lg"><Spinner/></div>
        </div>
      )}

      {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-lg mb-4">{error}</p>}
      
      {attachment && (
        <div className="mb-2 p-2 bg-gray-700 rounded-lg flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2 overflow-hidden">
                <PaperclipIcon />
                <span className="text-gray-300 truncate">{attachment.file.name}</span>
            </div>
            <button onClick={removeAttachment} className="p-1 rounded-full hover:bg-gray-600 transition-colors" aria-label="Remove attachment">
                <XIcon />
            </button>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="p-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          aria-label="Attach file"
        >
          <PaperclipIcon />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Gemini anything..."
          className="flex-grow p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || (!input.trim() && !attachment)}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold py-3 px-5 rounded-lg transition-colors duration-200"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatBot;