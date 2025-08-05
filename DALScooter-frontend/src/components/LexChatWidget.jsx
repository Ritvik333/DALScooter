import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X } from 'lucide-react';
import axios from 'axios';

const LEX_API_URL = 'https://n5y8xtov2h.execute-api.ca-central-1.amazonaws.com/prod/lex-chat';

const botConfig = {
  botId: 'S63TU5WQQB',
  botAliasId: 'E7GYXPI90T',
  localeId: 'en_US'
};

const LexChatWidget = () => {
  const { botId, botAliasId, localeId } = botConfig;
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const generatedSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    setSessionId(generatedSessionId);
  }, []);

  useEffect(() => {
    scrollToBottom();
    if (inputRef.current && isOpen) {
      inputRef.current.focus();
    }
  }, [messages, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = { from: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const payload = {
        message: userMessage.content,
        sessionId,
        botId,
        botAliasId,
        localeId
      };

      const response = await axios.post(
        LEX_API_URL,
        JSON.stringify(payload),
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const lexMessages = response.data?.messages || [];
      const formattedMessages = lexMessages.map(m => ({
        from: 'bot',
        content: m.content
      }));

      setMessages(prev => [...prev, ...formattedMessages]);
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages(prev => [
        ...prev,
        { from: 'bot', content: 'Something went wrong. Please try again later.' }
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  if (!isOpen) {
    return (
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-24 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition duration-300 transform hover:scale-110 flex items-center justify-center"
      >
        <MessageSquare className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-24 w-96 bg-white rounded-lg shadow-xl border border-gray-300 flex flex-col z-50"
      style={{ height: '500px' }}>
      {/* Header */}
      <div className="bg-blue-600 text-white p-3 rounded-t-lg flex justify-between items-center">
        <h3 className="font-medium text-lg">Chat Support</h3>
        <button 
          onClick={toggleChat} 
          className="text-white hover:text-gray-200 focus:outline-none"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      {/* Chat Content */}
      <div 
        className="flex-1 p-4 bg-gray-50 overflow-y-auto"
        style={{ 
          maxHeight: 'calc(500px - 110px)',
          wordWrap: 'break-word',
          overflowWrap: 'break-word'
        }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-32">
            <p className="text-lg">How can I help you today?</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={index} 
              className={`mb-3 ${msg.from === 'user' ? 'text-right' : 'text-left'}`}
            >
              <div 
                className={`inline-block px-4 py-3 rounded-lg max-w-full text-base ${msg.from === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
                style={{ wordBreak: 'break-word' }}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div className="p-3 border-t border-gray-300 bg-white">
        <div className="flex w-full">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 min-w-0 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            disabled={isLoading}
            autoFocus
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-r-lg disabled:opacity-50 whitespace-nowrap text-base"
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LexChatWidget;