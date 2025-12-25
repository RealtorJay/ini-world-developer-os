
import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Building2,
  MapPin,
  TrendingUp,
  Users,
  FileText,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Zap,
  Download,
  Plus,
  Trash2,
  Save,
  LogOut
} from 'lucide-react';
import { ProjectState, TenantCategory, Tenant } from './types';
import { calculateFinancials, calculateWalkability } from './lib/calculations';
import { generatePartnerSummary } from './lib/geminiService';
import { supabase } from './lib/supabase';
import { AuthPage } from './components/AuthPage';
import { Session } from '@supabase/supabase-js';

const COLORS = ['#0f172a', '#334155', '#64748b', '#94a3b8', '#cbd5e1'];

const INITIAL_STATE: ProjectState = {
  landCost: 1500000,
  landClosingPct: 2,
  totalBuildSf: 45000,
  phase1Sf: 15000,
  hardCostPsf: 220,
  softCostPct: 15,
  contingencyPct: 8,
  maxLtc: 65,
  interestRate: 7.25,
  amortYears: 25,
  ioMonths: 18,
  siteAcres: 12,
  pedSpineLengthFt: 800,
  avgBlockLengthFt: 250,
  numNodes: 3,
  shadePct: 45,
  seatingIntervalFt: 200,
  treeIntervalFt: 50,
  heatMitigationCount: 1,
  activeFrontagePct: 65,
  parkingVisiblePct: 20,
  carCrossingsCount: 2,
  tenants: [
    { id: '1', name: 'Anchor Grocer', category: TenantCategory.RETAIL, sf: 12000, rentPsf: 28, operatingHours: 14, nightActive: false },
    { id: '2', name: 'The Daily Brew', category: TenantCategory.DINING, sf: 2200, rentPsf: 42, operatingHours: 12, nightActive: false },
    { id: '3', name: 'Main St Wellness', category: TenantCategory.WELLNESS, sf: 3500, rentPsf: 35, operatingHours: 10, nightActive: false },
    { id: '4', name: 'Social Taphouse', category: TenantCategory.DINING, sf: 4000, rentPsf: 38, operatingHours: 11, nightActive: true },
  ]
};

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<ProjectState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState('feasibility');
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadLatestProject();
    }
  }, [session]);

  const loadLatestProject = async () => {
    if (!session?.user) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading project:', error);
        return;
      }

      if (data) {
        setState(data.data as ProjectState);
        setProjectId(data.id);
      }
    } catch (err) {
      console.error('Unexpected error loading project:', err);
    }
  };

  const saveProject = async () => {
    if (!session?.user) return;
    setIsSaving(true);

    try {
      if (projectId) {
        const { error } = await supabase
          .from('projects')
          .update({
            data: state,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('projects')
          .insert({
            user_id: session.user.id,
            name: 'New Project',
            data: state
          })
          .select()
          .single();

        if (error) throw error;
        if (data) setProjectId(data.id);
      }
      alert('Project saved successfully!');
    } catch (err) {
      console.error('Error saving project:', err);
      alert('Failed to save project.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  }

  const fin = useMemo(() => calculateFinancials(state), [state]);
  const walk = useMemo(() => calculateWalkability(state), [state]);

  const handleInputChange = (field: keyof ProjectState, value: any) => {
    setState(prev => ({ ...prev, [field]: value }));
  };

  const addTenant = () => {
    const newTenant: Tenant = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Tenant',
      category: TenantCategory.RETAIL,
      sf: 1500,
      rentPsf: 30,
      operatingHours: 10,
      nightActive: false
    };
    setState(prev => ({ ...prev, tenants: [...prev.tenants, newTenant] }));
  };

  const removeTenant = (id: string) => {
    setState(prev => ({ ...prev, tenants: prev.tenants.filter(t => t.id !== id) }));
  };

  const updateTenant = (id: string, field: keyof Tenant, value: any) => {
    setState(prev => ({
      ...prev,
      tenants: prev.tenants.map(t => t.id === id ? { ...t, [field]: value } : t)
    }));
  };

  const generateSummary = async () => {
    setIsGeneratingAi(true);
    const summary = await generatePartnerSummary(state, fin, walk);
    setAiSummary(summary);
    setIsGeneratingAi(false);
  };

  if (!session) {
    return <AuthPage />;
  }

  // UI Components
  const StatCard = ({ label, value, sub, icon: Icon, status = 'default' }: any) => {
    const statusColors = {
      red: 'text-red-600 bg-red-50 border-red-100',
      yellow: 'text-amber-600 bg-amber-50 border-amber-100',
      green: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      default: 'text-slate-600 bg-slate-50 border-slate-100'
    };
    return (
      <div className={`p-5 rounded-xl border ${statusColors[status as keyof typeof statusColors]} transition-all duration-200`}>
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider opacity-80">{label}</span>
          {Icon && <Icon size={18} className="opacity-70" />}
        </div>
        <div className="text-2xl font-bold mb-1 tracking-tight">{value}</div>
        <div className="text-xs font-medium opacity-70">{sub}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
              <Building2 className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Mini-World Developer OS</h1>
              <p className="text-xs text-slate-500 font-medium">Underwriting & Strategy Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={saveProject}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <Save size={16} /> {isSaving ? 'Saving...' : 'Save Project'}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Download size={16} /> Export
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-red-600 transition-colors"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-12 gap-8">
        {/* Sidebar Inputs */}
        <aside className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <Zap size={16} className="text-slate-900" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Project Inputs</h2>
            </div>
            <div className="p-6 space-y-8">
              {/* Land Section */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Land & Site</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Land Cost ($)</label>
                    <input
                      type="number"
                      value={state.landCost}
                      onChange={e => handleInputChange('landCost', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Acres</label>
                    <input
                      type="number"
                      value={state.siteAcres}
                      onChange={e => handleInputChange('siteAcres', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-slate-900 outline-none"
                    />
                  </div>
                </div>
              </section>

              {/* Build Section */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Construction</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 text-center">Total Buildable SF</label>
                    <input
                      type="number"
                      value={state.totalBuildSf}
                      onChange={e => handleInputChange('totalBuildSf', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-900 text-white border-none rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-slate-700 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phase 1 SF</label>
                    <input
                      type="number"
                      value={state.phase1Sf}
                      onChange={e => handleInputChange('phase1Sf', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hard Cost/SF</label>
                    <input
                      type="number"
                      value={state.hardCostPsf}
                      onChange={e => handleInputChange('hardCostPsf', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium outline-none"
                    />
                  </div>
                </div>
              </section>

              {/* Finance Section */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Debt & Capital</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Max LTC (%)</label>
                    <input
                      type="number"
                      value={state.maxLtc}
                      onChange={e => handleInputChange('maxLtc', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Interest (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={state.interestRate}
                      onChange={e => handleInputChange('interestRate', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium outline-none"
                    />
                  </div>
                </div>
              </section>

              {/* Urbanism Section */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Urban Logic</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Shade Coverage ({state.shadePct}%)</label>
                    </div>
                    <input
                      type="range" min="0" max="100"
                      value={state.shadePct}
                      onChange={e => handleInputChange('shadePct', Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Active Frontage ({state.activeFrontagePct}%)</label>
                    </div>
                    <input
                      type="range" min="0" max="100"
                      value={state.activeFrontagePct}
                      onChange={e => handleInputChange('activeFrontagePct', Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                    />
                  </div>
                </div>
              </section>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 w-fit">
            {[
              { id: 'feasibility', label: 'Financials', icon: TrendingUp },
              { id: 'walkability', label: 'Walkability', icon: MapPin },
              { id: 'tenants', label: 'Tenant Mix', icon: Users },
              { id: 'summary', label: 'Partner Summary', icon: FileText }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content: Financials */}
          {activeTab === 'feasibility' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  label="Total Project Cost"
                  value={`$${(fin.totalProjectCost / 1000000).toFixed(2)}M`}
                  sub={`$${(fin.totalProjectCost / state.totalBuildSf).toFixed(0)}/SF Built`}
                  icon={Building2}
                />
                <StatCard
                  label="Conservative DSCR"
                  value={fin.dscr.toFixed(2)}
                  sub="Target: 1.25"
                  icon={CheckCircle2}
                  status={fin.dscr < 1.25 ? 'yellow' : 'green'}
                />
                <StatCard
                  label="Required Equity"
                  value={`$${(fin.requiredEquity / 1000).toFixed(0)}K`}
                  sub={`${fin.equityPct.toFixed(1)}% of Capital`}
                  icon={TrendingUp}
                  status={fin.equityPct > 40 ? 'yellow' : 'default'}
                />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold">Capital & Income Stack</h3>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-slate-900 rounded-sm"></span>
                      <span className="text-xs font-bold text-slate-600">Debt</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-slate-300 rounded-sm"></span>
                      <span className="text-xs font-bold text-slate-600">Equity</span>
                    </div>
                  </div>
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Capital Stack', Debt: fin.maxLoan, Equity: fin.requiredEquity },
                        { name: 'Stability', NOI: fin.noi, 'Debt Srv': fin.annualDebtService }
                      ]}
                      layout="vertical"
                      barGap={0}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fontWeight: 700 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        formatter={(val: number) => `$${val.toLocaleString()}`}
                      />
                      <Bar dataKey="Debt" stackId="a" fill="#0f172a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Equity" stackId="a" fill="#cbd5e1" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="NOI" stackId="b" fill="#059669" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Debt Srv" stackId="b" fill="#f87171" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-12 border-t border-slate-100 pt-8">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Break-even Analysis</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-medium text-slate-600">Break-even Rent</span>
                        <span className="text-lg font-bold">${fin.breakEvenRentPsf.toFixed(2)}/SF</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-slate-900 h-full" style={{ width: `${(fin.breakEvenRentPsf / 45) * 100}%` }}></div>
                      </div>
                      <p className="text-[10px] text-slate-500 italic">Project is safe as long as market rents stay above this floor.</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Phase 1 Standalone</h4>
                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="p-3 bg-white rounded-lg shadow-sm">
                        <Layers className="text-slate-900" size={20} />
                      </div>
                      <div>
                        <div className="text-sm font-bold">Phase 1 DSCR: {fin.phase1Dscr.toFixed(2)}</div>
                        <p className="text-xs text-slate-500">Standalone feasibility is {fin.phase1Dscr >= 1.2 ? 'STRONG' : 'WEAK'}.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Walkability */}
          {activeTab === 'walkability' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 text-white rounded-2xl p-8 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">Final Walkability Score</div>
                    <div className="text-6xl font-black mb-4">{walk.finalScore.toFixed(0)}</div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-sm font-bold">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      {walk.grade}
                    </div>
                  </div>
                  <p className="mt-8 text-sm opacity-70 leading-relaxed font-medium">
                    This score measures human-scale intimacy, thermal comfort, and active storefronts.
                    Scores above 75 are proven to drive significant rent premiums in Celina.
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Score Breakdown</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Human Comfort', val: walk.comfortScore, color: 'bg-emerald-500' },
                      { label: 'Activation Density', val: walk.activationScore, color: 'bg-blue-500' },
                      { label: 'Parking Penalty', val: walk.parkingPenalty, color: 'bg-red-500', isPenalty: true }
                    ].map(m => (
                      <div key={m.label} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span>{m.label}</span>
                          <span className={m.isPenalty ? 'text-red-600' : ''}>{m.isPenalty ? '-' : ''}{m.val.toFixed(0)}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className={`${m.color} h-full`} style={{ width: `${m.val}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <h3 className="text-lg font-bold mb-6">Pedestrian Experience Logic</h3>
                <div className="grid grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <div className="p-3 bg-slate-50 rounded-lg w-fit mb-2"><MapPin size={20} className="text-slate-900" /></div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Avg Walk Segment</div>
                    <div className="text-xl font-bold">{walk.avgWalkDistance.toFixed(0)} FT</div>
                    <div className={`text-[10px] font-black uppercase ${walk.fiveMinWalkCompliant ? 'text-emerald-600' : 'text-red-600'}`}>
                      {walk.fiveMinWalkCompliant ? '✓ 5-Min Walk Compliant' : '⚠ Scaling Risk'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="p-3 bg-slate-50 rounded-lg w-fit mb-2"><Zap size={20} className="text-slate-900" /></div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Frontage</div>
                    <div className="text-xl font-bold">{state.activeFrontagePct}%</div>
                    <p className="text-[10px] text-slate-500 italic">Visual interest every 25ft.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="p-3 bg-slate-50 rounded-lg w-fit mb-2"><Users size={20} className="text-slate-900" /></div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Night Activation</div>
                    <div className="text-xl font-bold">
                      {((state.tenants.filter(t => t.nightActive).length / state.tenants.length) * 100).toFixed(0)}%
                    </div>
                    <p className="text-[10px] text-slate-500 italic">After-hours resilience.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Tenant Mix */}
          {activeTab === 'tenants' && (
            <div className="space-y-8">
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-lg font-bold">Lease-Up Matrix</h3>
                  <button
                    onClick={addTenant}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <Plus size={14} /> Add Tenant
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Tenant Name</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">SF</th>
                        <th className="px-6 py-4">Rent/SF</th>
                        <th className="px-6 py-4">Total Rent</th>
                        <th className="px-6 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {state.tenants.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <input
                              value={t.name}
                              onChange={e => updateTenant(t.id, 'name', e.target.value)}
                              className="bg-transparent border-none font-bold text-slate-900 outline-none w-full"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={t.category}
                              onChange={e => updateTenant(t.id, 'category', e.target.value)}
                              className="bg-transparent border-none font-medium text-slate-600 outline-none cursor-pointer"
                            >
                              {Object.values(TenantCategory).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              value={t.sf}
                              onChange={e => updateTenant(t.id, 'sf', Number(e.target.value))}
                              className="bg-transparent border-none font-medium text-slate-600 outline-none w-20"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              value={t.rentPsf}
                              onChange={e => updateTenant(t.id, 'rentPsf', Number(e.target.value))}
                              className="bg-transparent border-none font-medium text-slate-600 outline-none w-20"
                            />
                          </td>
                          <td className="px-6 py-4 font-bold">
                            ${(t.sf * t.rentPsf).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => removeTenant(t.id)}
                              className="text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl border border-slate-200 p-8">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6 text-center">Usage Concentration</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.values(TenantCategory).map(cat => ({
                            name: cat,
                            value: state.tenants.filter(t => t.category === cat).reduce((a, b) => a + b.sf, 0)
                          })).filter(d => d.value > 0)}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {COLORS.map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col justify-center">
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Leased Area</div>
                      <div className="text-4xl font-black">{state.tenants.reduce((a, b) => a + b.sf, 0).toLocaleString()} SF</div>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-xs font-bold text-slate-600">Phase 1 Utilization</div>
                      <div className="text-sm font-black">
                        {((state.tenants.reduce((a, b) => a + b.sf, 0) / state.totalBuildSf) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Partner Summary */}
          {activeTab === 'summary' && (
            <div className="space-y-8">
              <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold">AI Investor Narrative</h3>
                  <button
                    onClick={generateSummary}
                    disabled={isGeneratingAi}
                    className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl active:scale-95"
                  >
                    {isGeneratingAi ? 'Thinking...' : 'Generate New Narrative'}
                  </button>
                </div>

                <div className="prose prose-slate max-w-none">
                  {aiSummary ? (
                    <div className="space-y-6 text-slate-700 leading-relaxed text-lg">
                      {aiSummary.split('\n').map((para, i) => (
                        para.trim() && <p key={i}>{para}</p>
                      ))}
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
                      <FileText size={48} className="mb-4 opacity-20" />
                      <p className="text-sm font-medium">Click generate to build the investment case based on your data.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-900 text-white p-10 rounded-3xl shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-4">Partner Verdict</h3>
                  <p className="text-slate-400 mb-8 max-w-xl">
                    Based on conservative bank standards, this project has a {fin.dscr >= 1.25 ? 'HIGH' : 'MODERATE'} probability of institutional funding.
                    The walkability score of {walk.finalScore.toFixed(0)} provides a resilient competitive advantage.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <div className="px-6 py-3 bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest border border-white/10">
                      Equity Rec: $${(fin.requiredEquity / 1000).toFixed(0)}K
                    </div>
                    <div className="px-6 py-3 bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest border border-white/10">
                      DSCR Goal: 1.25+
                    </div>
                    <div className="px-6 py-3 bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold uppercase tracking-widest border border-emerald-500/30">
                      Risk Profile: Stabilized
                    </div>
                  </div>
                </div>
                {/* Abstract graphic background */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-slate-800 to-slate-900 -rotate-12 translate-x-20 -translate-y-20 rounded-full blur-3xl opacity-50"></div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating Status Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-4xl px-6">
        <div className="bg-white/80 backdrop-blur-md border border-slate-200 p-4 rounded-2xl shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DSCR</span>
              <span className={`text-sm font-bold ${fin.dscr >= 1.25 ? 'text-emerald-600' : 'text-amber-600'}`}>{fin.dscr.toFixed(2)}</span>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Walk Score</span>
              <span className="text-sm font-bold">{walk.finalScore.toFixed(0)}</span>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Breakeven</span>
              <span className="text-sm font-bold">${fin.breakEvenRentPsf.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
              <Info size={18} />
            </button>
            <div className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all cursor-pointer">
              Deploy Model
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
