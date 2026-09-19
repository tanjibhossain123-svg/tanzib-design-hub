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
  Trash2,
  Cpu
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
  engine?: string;
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
          content: "👋 Hey Tanzib! I'm your 24/7 Strategic Design Co-Pilot. Attach any lead from your pipeline, ask me to draft custom pitches, counter low budgets, or brainstorm ideas. What deal are we closing right now?"
        }
      ]);
    }

    const fetchPipelineLeads = async () => {
      try {
        const { data } = await supabase
          .from('leads')
          .select('id, title, category, pain, budget, proposal, link')
          .order('score', { ascending: false })
          .limit(25);
        if (data) setLeads(data as Lead[]);
      } catch (err) {}
    };

    fetchPipelineLeads();
  }, []);

  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem('tanzib_copilot_history', JSON.stringify(messages));
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice dictation is supported in Chrome, Edge, and Safari.');
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
        setMessages([...updatedHistory, { role: 'assistant', content: data.reply, engine: data.engine }]);
      } else {
        setMessages([...updatedHistory, { role: 'assistant', content: '⚠️ Could not generate reply. Please retry.' }]);
      }
    } catch (err) {
      setMessages([...updatedHistory, { role: 'assistant', content: '⚠️ Connection issue. Check your network.' }]);
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
        content: "Chat cleared! Ready for your next client proposal, Tanzib."
      }
    ]);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#F8FAFC] text-slate-900 overflow-hidden select-text">
      <Head>
        <title>Tanzib Co-Pilot | 24/7 Strategic Design Partner</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>

      {/* TOP APP BAR (Ultra-compact for mobile, spacious on desktop) */}
      <header className="bg-white border-b border-slate-200 px-3 sm:px-4 py-2.5 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
          <Link
            href="/"
            className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition active:scale-95"
            title="Back to CRM"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-violet-600 text-white flex items-center justify-center shadow-sm flex-shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 leading-tight truncate">Tanzib Co-Pilot</h1>
              <p className="text-[10px] sm:text-[11px] text-emerald-600 font-semibold flex items-center gap-1 leading-none">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active 24/7 • Mobile Ready
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={clearChat}
          className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition"
          title="Clear Conversation"
        >
          <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </header>

      {/* RESPONSIVE PIPELINE LEAD SELECTOR */}
      <div className="bg-violet-50/90 border-b border-violet-100 px-3 sm:px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs flex-shrink-0">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <FileText className="h-3.5 w-3.5 text-violet-600 flex-shrink-0" />
          <span className="text-slate-500 text-[11px] sm:text-xs">Context:</span>
          {selectedLead ? (
            <span className="font-semibold text-violet-900 truncate text-[11px] sm:text-xs">
              {selectedLead.title}
            </span>
          ) : (
            <span className="text-slate-400 italic text-[11px]">General Design Mode</span>
          )}
        </div>

        <select
          onChange={e => {
            const found = leads.find(l => l.id.toString() === e.target.value);
            setSelectedLead(found || null);
          }}
          value={selectedLead ? selectedLead.id : ''}
          className="w-full sm:w-auto bg-white border border-violet-200 rounded-md px-2 py-1 text-[11px] sm:text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-500 truncate"
        >
          <option value="">Attach Lead Context from CRM...</option>
          {leads.map(lead => (
            <option key={lead.id} value={lead.id}>
              {lead.title.slice(0, 40)}...
            </option>
          ))}
        </select>
      </div>

      {/* CHAT THREAD (Auto-scrolls & padded for touch) */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5">
        {messages.map((msg, idx) => {
          const isAssistant = msg.role === 'assistant';
          const isCopied = copiedIndex === idx;

          return (
            <div
              key={idx}
              className={`flex gap-2 sm:gap-3 max-w-full sm:max-w-2xl ${
                isAssistant ? 'mr-auto' : 'ml-auto justify-end'
              }`}
            >
              {isAssistant && (
                <div className="h-7 w-7 rounded-lg bg-violet-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
              )}

              <div
                className={`relative group rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm leading-relaxed shadow-sm max-w-[88%] sm:max-w-full ${
                  isAssistant
                    ? 'bg-white border border-slate-200 text-slate-800'
                    : 'bg-violet-600 text-white rounded-br-none'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>

                {isAssistant && (
                  <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Cpu className="h-3 w-3" />
                      {msg.engine || 'AI Engine'}
                    </span>
                    <button
                      onClick={() => copyText(msg.content, idx)}
                      className="p-1 rounded text-slate-500 hover:text-slate-900 bg-slate-50 border border-slate-200 flex items-center gap-1 transition active:scale-95"
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-600 font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-2 sm:gap-3 mr-auto">
            <div className="h-7 w-7 rounded-lg bg-violet-600 text-white flex items-center justify-center flex-shrink-0">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-500 flex items-center gap-2 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-violet-600 animate-pulse"></span>
              Drafting high-converting pitch...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* QUICK PROMPT CHIPS (Touch-swipeable on mobile) */}
      <div className="px-3 sm:px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px] sm:text-xs flex-shrink-0 no-scrollbar">
        <span className="text-slate-400 font-semibold text-[10px] uppercase flex-shrink-0">Quick:</span>
        <button
          onClick={() => sendMessage("Draft a high-converting 3-sentence pitch for this lead focusing on speed and my portfolio.")}
          className="bg-white hover:bg-violet-50 text-slate-700 hover:text-violet-700 border border-slate-200 rounded-full px-2.5 sm:px-3 py-1 whitespace-nowrap transition active:scale-95 shadow-xs flex-shrink-0"
        >
          ⚡ Fast Pitch
        </button>
        <button
          onClick={() => sendMessage("How should I counter a client saying 'Can you do this for half the budget?' politely and professionally?")}
          className="bg-white hover:bg-violet-50 text-slate-700 hover:text-violet-700 border border-slate-200 rounded-full px-2.5 sm:px-3 py-1 whitespace-nowrap transition active:scale-95 shadow-xs flex-shrink-0"
        >
          💰 Counter Low Budget
        </button>
        <button
          onClick={() => sendMessage("Offer a 10-post monthly social media retainer bundle with pricing options.")}
          className="bg-white hover:bg-violet-50 text-slate-700 hover:text-violet-700 border border-slate-200 rounded-full px-2.5 sm:px-3 py-1 whitespace-nowrap transition active:scale-95 shadow-xs flex-shrink-0"
        >
          📦 Retainer Bundle
        </button>
      </div>

      {/* INPUT DOCK (iOS safe-area, 16px font to stop mobile auto-zoom) */}
      <footer className="bg-white border-t border-slate-200 p-2.5 sm:p-3 flex-shrink-0 pb-[max(0.65rem,env(safe-area-inset-bottom))]">
        <form
          onSubmit={e => {
            e.preventDefault();
            sendMessage();
          }}
          className="max-w-4xl mx-auto flex items-center gap-1.5 sm:gap-2"
        >
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2 sm:p-2.5 rounded-xl border transition active:scale-95 flex-shrink-0 ${
              isListening
                ? 'bg-rose-50 text-rose-600 border-rose-300 animate-pulse'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
            }`}
            title="Voice Dictation"
          >
            {isListening ? <MicOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Mic className="h-4 w-4 sm:h-5 sm:w-5" />}
          </button>

          {/* 16px font on mobile prevents iOS Safari from zooming */}
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isListening ? 'Listening...' : 'Ask your Co-Pilot or request a pitch...'}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 sm:px-4 py-2 text-[16px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition"
          />

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white p-2 sm:p-2.5 rounded-xl transition shadow-sm active:scale-95 flex-shrink-0"
          >
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </form>
      </footer>
    </div>
  );
}
