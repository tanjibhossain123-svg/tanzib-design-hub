import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';
import confetti from 'canvas-confetti';
import {
  Palette,
  ExternalLink,
  Copy,
  Check,
  Flame,
  Clock,
  CheckCircle2,
  Archive,
  Search,
  RefreshCw,
  FolderKanban,
  DollarSign,
  Share2,
  Sparkles,
  Phone,
  Mail,
  Linkedin
} from 'lucide-react';

interface Lead {
  id: string | number;
  title: string;
  link: string;
  snippet?: string;
  score: number;
  category?: string;
  pain?: string;
  budget?: string;
  proposal?: string;
  status: 'New' | 'Contacted' | 'Won' | 'Archived';
  created_at: string;
}

export default function TanzibDesignHub() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'High-Intent' | 'New' | 'Contacted' | 'Won' | 'Archived'>('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);

  // Fetch leads from Supabase
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('score', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setLeads(data as Lead[]);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();

    // Supabase Realtime Listener
    const channel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchLeads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Instant CRM 2-way status update
  const handleStatusChange = async (id: string | number, newStatus: Lead['status']) => {
    setUpdatingId(id);
    // Optimistic UI update
    setLeads(prev => prev.map(lead => (lead.id === id ? { ...lead, status: newStatus } : lead)));

    if (newStatus === 'Won') {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    }

    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating status:', err);
      fetchLeads(); // Rollback on failure
    } finally {
      setUpdatingId(null);
    }
  };

  // 1-Click Proposal Copy
  const copyProposal = (id: string | number, pitch: string) => {
    navigator.clipboard.writeText(pitch);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = leads.length;
    const highIntent = leads.filter(l => l.score >= 80 && l.status !== 'Archived').length;
    const contacted = leads.filter(l => l.status === 'Contacted').length;
    const won = leads.filter(l => l.status === 'Won').length;
    return { total, highIntent, contacted, won };
  }, [leads]);

  // Categories dynamically derived
  const categories = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => {
      if (l.category && l.category !== 'General') set.add(l.category);
    });
    return ['All', ...Array.from(set)];
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Status filter
      if (statusFilter === 'High-Intent' && (lead.score < 80 || lead.status === 'Archived')) return false;
      if (statusFilter !== 'All' && statusFilter !== 'High-Intent' && lead.status !== statusFilter) return false;

      // Category filter
      if (categoryFilter !== 'All' && lead.category !== categoryFilter) return false;

      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchTitle = lead.title?.toLowerCase().includes(q);
        const matchPain = lead.pain?.toLowerCase().includes(q);
        const matchProp = lead.proposal?.toLowerCase().includes(q);
        if (!matchTitle && !matchPain && !matchProp) return false;
      }

      return true;
    });
  }, [leads, statusFilter, categoryFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-20">
      <Head>
        <title>Tanzib Ul Alam | Graphic Design Command CRM</title>
        <meta name="description" content="Autonomous Lead Pipeline & CRM for Tanzib Ul Alam" />
      </Head>

      {/* TOP BRAND HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md shadow-violet-200">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 leading-tight">Tanzib Ul Alam</h1>
                <span className="text-[11px] font-semibold tracking-wide bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full border border-violet-200">
                  Design HQ
                </span>
              </div>
              <p className="text-xs text-slate-500">Autonomous Graphic Design Pipeline & Client CRM</p>
            </div>
          </div>

          {/* Quick Actions & Contact Links */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <a
              href="https://drive.google.com/drive/folders/1UDsUcIsEEhv1isTU_DuQlGQEdMmQ7e3H"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              <FolderKanban className="h-3.5 w-3.5 text-slate-500" />
              Drive Portfolio
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </a>

            <a
              href="https://wa.me/8801992796109"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium border border-emerald-200 transition"
            >
              <Phone className="h-3.5 w-3.5 text-emerald-600" />
              WhatsApp
            </a>

            <button
              onClick={fetchLeads}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium shadow-sm transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* KPI CARDS */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Total Scouted</span>
              <Share2 className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{kpis.total}</p>
            <span className="text-[11px] text-slate-400">All scanned opportunities</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm">
            <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
              <span>High-Intent (80+)</span>
              <Flame className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-900">{kpis.highIntent}</p>
            <span className="text-[11px] text-amber-600/80">Immediate client matches</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-sm">
            <div className="flex items-center justify-between text-blue-700 text-xs font-semibold">
              <span>In Outreach</span>
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-blue-900">{kpis.contacted}</p>
            <span className="text-[11px] text-blue-600/80">Pitch sent to client</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
            <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
              <span>Deals Won</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-900">{kpis.won}</p>
            <span className="text-[11px] text-emerald-600/80">Active client revenue</span>
          </div>
        </section>

        {/* CONTROLS: SEARCH & FILTERS */}
        <section className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search leads by title, client pain, or keywords..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-400 font-medium mr-1 text-[11px]">Skill:</span>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition ${
                    categoryFilter === cat
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-xs overflow-x-auto">
            {(['All', 'High-Intent', 'New', 'Contacted', 'Won', 'Archived'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition ${
                  statusFilter === tab
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab === 'High-Intent' ? '🔥 80+ Score' : tab}
              </button>
            ))}
            <span className="ml-auto text-slate-400 text-xs hidden sm:inline">
              Showing {filteredLeads.length} leads
            </span>
          </div>
        </section>

        {/* LEADS PIPELINE GRID */}
        {loading ? (
          <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
            <RefreshCw className="h-8 w-8 text-violet-600 animate-spin mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">Connecting to live Supabase pipeline...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
            <FolderKanban className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-base font-semibold text-slate-700">No leads match your criteria</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting your search query or status filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLeads.map(lead => {
              const isHot = lead.score >= 80;
              const isCopied = copiedId === lead.id;

              return (
                <div
                  key={lead.id}
                  className={`bg-white rounded-xl border transition-all hover:shadow-md ${
                    isHot ? 'border-amber-300 shadow-sm' : 'border-slate-200'
                  }`}
                >
                  <div className="p-5 space-y-3">
                    {/* Header Row: Score + Title + Category + Link */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {/* Score Badge */}
                        <div
                          className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-center font-bold text-sm shadow-sm ${
                            lead.score >= 80
                              ? 'bg-amber-500 text-white'
                              : lead.score >= 70
                              ? 'bg-violet-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="text-[10px] uppercase tracking-wider font-semibold opacity-80 leading-none">Score</div>
                          <div className="text-base mt-0.5">{lead.score}</div>
                        </div>

                        {/* Title & Category */}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                              {lead.category || 'Graphic Design'}
                            </span>
                            {lead.budget && lead.budget !== 'N/A' && (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5">
                                <DollarSign className="h-3 w-3" />
                                {lead.budget}
                              </span>
                            )}
                            <span className="text-xs text-slate-400">
                              {new Date(lead.created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>

                          <a
                            href={lead.link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-base font-bold text-slate-900 hover:text-violet-600 mt-1 group transition"
                          >
                            <span>{lead.title}</span>
                            <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-violet-600 transition" />
                          </a>
                        </div>
                      </div>

                      {/* Current Status Pill */}
                      <span
                        className={`self-start text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          lead.status === 'Won'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : lead.status === 'Contacted'
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : lead.status === 'Archived'
                            ? 'bg-slate-100 text-slate-500 border-slate-300'
                            : 'bg-violet-50 text-violet-700 border-violet-200'
                        }`}
                      >
                        {lead.status}
                      </span>
                    </div>

                    {/* Client Pain Summary */}
                    {lead.pain && (
                      <div className="bg-slate-50 border-l-2 border-amber-500 px-3 py-2 text-xs text-slate-700 rounded-r-md">
                        <span className="font-semibold text-slate-900">Target Pain: </span>
                        {lead.pain}
                      </div>
                    )}

                    {/* Snippet preview if available */}
                    {lead.snippet && !lead.pain && (
                      <p className="text-xs text-slate-600 line-clamp-2 italic">{lead.snippet}</p>
                    )}

                    {/* Pre-Drafted AI Proposal Box */}
                    {lead.proposal && (
                      <div className="bg-violet-50/50 rounded-lg p-3 border border-violet-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-violet-800 flex items-center gap-1 uppercase tracking-wider">
                            <Sparkles className="h-3 w-3 text-violet-600" />
                            Tanzib's Personalized Pitch
                          </span>
                          <button
                            onClick={() => copyProposal(lead.id, lead.proposal || '')}
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md transition ${
                              isCopied
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white hover:bg-violet-100 text-violet-700 border border-violet-200'
                            }`}
                          >
                            {isCopied ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                Copied to Clipboard!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                Copy Proposal
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed font-sans select-all">
                          {lead.proposal}
                        </p>
                      </div>
                    )}

                    {/* Bottom Control Bar: Two-Way Interactive Pipeline Buttons */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-400 font-medium text-[11px] mr-1">Move to:</span>

                        <button
                          disabled={updatingId === lead.id || lead.status === 'New'}
                          onClick={() => handleStatusChange(lead.id, 'New')}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                            lead.status === 'New'
                              ? 'bg-violet-100 text-violet-800 ring-1 ring-violet-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          New
                        </button>

                        <button
                          disabled={updatingId === lead.id || lead.status === 'Contacted'}
                          onClick={() => handleStatusChange(lead.id, 'Contacted')}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                            lead.status === 'Contacted'
                              ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          Contacted
                        </button>

                        <button
                          disabled={updatingId === lead.id || lead.status === 'Won'}
                          onClick={() => handleStatusChange(lead.id, 'Won')}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                            lead.status === 'Won'
                              ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          Won 🏆
                        </button>

                        <button
                          disabled={updatingId === lead.id || lead.status === 'Archived'}
                          onClick={() => handleStatusChange(lead.id, 'Archived')}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                            lead.status === 'Archived'
                              ? 'bg-slate-200 text-slate-800'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                          }`}
                        >
                          Archive
                        </button>
                      </div>

                      <a
                        href={lead.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-violet-600 hover:text-violet-800 inline-flex items-center gap-1 transition"
                      >
                        Open Original Post →
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
