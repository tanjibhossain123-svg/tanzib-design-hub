import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import {
  Send,
  Mic,
  MicOff,
  Sparkles,
  ArrowLeft,
  Copy,
  Check,
  RefreshCw,
  FileText,
  Trash2
} from 'lucide-react';

interface Lead {
  id: string | number;
  title: string;
  category?: string;
  pain?: string;
  budget?: string;
  proposal?: string;
  link: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function TanzibCoPilot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('tanzib_copilot_history');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {}
    } else {
      setMessages([
        {
          role: 'assistant',
          content: "👋 Hey Tanzib! I'm your 24/7 Design Co-Pilot. You can attach any lead from your pipeline, ask me to draft customized proposals, counter low budgets, or brainstorm ideas. How can I help you close a client today?"
        }
      ]);
    }

    const fetchPipelineLeads = async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, title, category, pain, budget, proposal, link')
        .order('score', { ascending: false })
        .limit(20);
      if (data) setLeads(data as Lead[]);
    };

    fetchPipelineLeads();
  }, []);

  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem('tanzib_copilot_history', JSON.stringify(messages));
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Edge.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.start();
  };

  const sendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: textToSend };
    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          leadContext: selectedLead,
          conversationHistory: messages.slice(-6)
        })
      });

      const data = await res.json();
      if (data.reply) {
        setMessages([...updatedHistory, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages([...updatedHistory, { role: 'assistant', content: '⚠️ Error: ' + (data.error || 'Could not generate reply.') }]);
      }
    } catch (err) {
      setMessages([...updatedHistory, { role: 'assistant', content: '⚠️ Connection error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const clearChat = () => {
    localStorage.removeItem('tanzib_copilot_history');
    setMessages([
      {
        role: 'assistant',
        content: "Chat history cleared. Ready for your next client pitch!"
      }
    ]);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#F8FAFC] text-slate-900">
      <Head>
        <title>Tanzib Co-Pilot | 24/7 Strategic Design Partner</title>
      </Head>

      {/* TOP HEADER */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-violet-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-none">Tanzib's Design Co-Pilot</h1>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active 24/7 • Pipeline Connected
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={clearChat}
          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition"
          title="Clear Conversation"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </header>

      {/* ACTIVE LEAD SELECTOR */}
      <div className="bg-violet-50/80 border-b border-violet-100 px-4 py-2 flex items-center justify-between text-xs flex-shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <FileText className="h-4 w-4 text-violet-600 flex-shrink-0" />
          <span className="text-slate-500">Target Lead:</span>
          {selectedLead ? (
            <span className="font-semibold text-violet-900 truncate max-w-[200px] sm:max-w-[400px]">
              {selectedLead.title}
            </span>
          ) : (
            <span className="text-slate-400 italic">None selected (General Mode)</span>
          )}
        </div>

        <select
          onChange={e => {
            const found = leads.find(l => l.id.toString() === e.target.value);
            setSelectedLead(found || null);
          }}
          value={selectedLead ? selectedLead.id : ''}
          className="bg-white border border-violet-200 rounded-md px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-500 ml-2"
        >
          <option value="">Attach Lead Context...</option>
          {leads.map(lead => (
            <option key={lead.id} value={lead.id}>
              {lead.title.slice(0, 45)}...
            </option>
          ))}
        </select>
      </div>

      {/* CHAT LOG */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => {
          const isAssistant = msg.role === 'assistant';
          const isCopied = copiedIndex === idx;

          return (
            <div
              key={idx}
              className={`flex gap-3 max-w-3xl ${isAssistant ? 'mr-auto' : 'ml-auto justify-end'}`}
            >
              {isAssistant && (
                <div className="h-7 w-7 rounded-lg bg-violet-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
              )}

              <div
                className={`relative group rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  isAssistant
                    ? 'bg-white border border-slate-200 text-slate-800'
                    : 'bg-violet-600 text-white rounded-br-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {isAssistant && (
                  <button
                    onClick={() => copyText(msg.content, idx)}
                    className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-50 border border-slate-200 text-slate-500 opacity-0 group-hover:opacity-100 hover:text-slate-900 transition"
                    title="Copy to clipboard"
                  >
                    {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 mr-auto">
            <div className="h-7 w-7 rounded-lg bg-violet-600 text-white flex items-center justify-center flex-shrink-0">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-500 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-violet-600 animate-pulse"></span>
              Drafting high-converting proposal...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* QUICK PROMPT CHIPS */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-xs flex-shrink-0">
        <span className="text-slate-400 font-semibold mr-1">Quick:</span>
        <button
          onClick={() => sendMessage("Draft a high-converting 3-sentence pitch for this lead focusing on speed and my portfolio.")}
          className="bg-white hover:bg-violet-50 text-slate-700 hover:text-violet-700 border border-slate-200 rounded-full px-3 py-1 whitespace-nowrap transition"
        >
          ⚡ Fast Pitch
        </button>
        <button
          onClick={() => sendMessage("How should I counter a client saying 'Can you do this for half the budget?' politely and professionally?")}
          className="bg-white hover:bg-violet-50 text-slate-700 hover:text-violet-700 border border-slate-200 rounded-full px-3 py-1 whitespace-nowrap transition"
        >
          💰 Counter Low Budget
        </button>
        <button
          onClick={() => sendMessage("Offer a 10-post monthly social media retainer bundle with pricing options.")}
          className="bg-white hover:bg-violet-50 text-slate-700 hover:text-violet-700 border border-slate-200 rounded-full px-3 py-1 whitespace-nowrap transition"
        >
          📦 Monthly Retainer Pitch
        </button>
      </div>

      {/* INPUT DOCK */}
      <footer className="bg-white border-t border-slate-200 p-3 flex-shrink-0">
        <form
          onSubmit={e => {
            e.preventDefault();
            sendMessage();
          }}
          className="max-w-4xl mx-auto flex items-center gap-2"
        >
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2.5 rounded-xl border transition ${
              isListening
                ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
            }`}
            title="Voice Dictation"
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isListening ? 'Listening to your voice...' : 'Ask your Co-Pilot or request a custom proposal...'}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition"
          />

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition shadow-sm"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </footer>
    </div>
  );
}
