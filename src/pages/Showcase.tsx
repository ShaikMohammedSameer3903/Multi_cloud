import React from 'react';
import { Shield, Cloud, Server, Database, Activity, Lock, Cpu, Globe, Zap, CheckCircle } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function Showcase() {
  const performanceData = [
    { time: '00:00', events: 1200, threats: 4 },
    { time: '04:00', events: 2100, threats: 7 },
    { time: '08:00', events: 8500, threats: 15 },
    { time: '12:00', events: 14200, threats: 42 },
    { time: '16:00', events: 9800, threats: 21 },
    { time: '20:00', events: 3400, threats: 8 },
  ];

  return (
    <div style={{ padding: '40px 20px', maxWidth: 1400, margin: '0 auto', color: '#e2e8f0', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 60, animation: 'fadeIn 0.8s ease-out' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(139,92,246,0.1)', borderRadius: 20, color: '#a78bfa', fontWeight: 600, marginBottom: 24, border: '1px solid rgba(139,92,246,0.2)' }}>
          <Shield size={16} /> CloudOps Enterprise: Healthcare Edition
        </div>
        <h1 style={{ fontSize: 56, fontWeight: 900, marginBottom: 24, letterSpacing: '-0.03em', background: 'linear-gradient(90deg, #fff, #a0aec0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Unified Healthcare Cloud Intelligence.
        </h1>
        <p style={{ fontSize: 20, color: '#94a3b8', maxWidth: 700, margin: '0 auto', lineHeight: 1.6 }}>
          A single pane of glass for Azure, AWS, and GCP. Master your HIPAA compliance posture, secure patient data workloads, and automate threat response.
        </p>
      </div>

      {/* Hero Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24, marginBottom: 60 }}>
        <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: 32, borderRadius: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: '#0078d4', marginBottom: 8 }}>3</div>
          <div style={{ color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 }}>Supported Clouds</div>
        </div>
        <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: 32, borderRadius: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: '#107c10', marginBottom: 8 }}>&lt;2s</div>
          <div style={{ color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 }}>Threat Detection Latency</div>
        </div>
        <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: 32, borderRadius: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: '#8b5cf6', marginBottom: 8 }}>100%</div>
          <div style={{ color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 }}>Agentless Architecture</div>
        </div>
        <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: 32, borderRadius: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: '#ffb900', marginBottom: 8 }}>HIPAA</div>
          <div style={{ color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 }}>Compliance Frameworks</div>
        </div>
      </div>

      {/* Features Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 80 }}>
        <div>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 32 }}>Platform Capabilities</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(0,120,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Cloud size={24} color="#0078d4"/></div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Multi-Cloud Discovery</h3>
                <p style={{ color: '#94a3b8', lineHeight: 1.5 }}>Parallel processing engine mapping resources across Azure Resource Graph, AWS STS, and GCP Resource Manager in real-time.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(209,52,56,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Shield size={24} color="#d13438"/></div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Unified Threat Engine</h3>
                <p style={{ color: '#94a3b8', lineHeight: 1.5 }}>Aggregates signals from Azure Defender, AWS GuardDuty, and GCP SCC into a normalized MITRE ATT&CK schema.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16,124,16,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Activity size={24} color="#107c10"/></div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>FinOps & Cost Optimization</h3>
                <p style={{ color: '#94a3b8', lineHeight: 1.5 }}>Detects orphaned disks, idle VMs, and underutilized clusters, providing 1-click remediation to lower monthly spend.</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: 32 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}><Cpu size={20} color="#8b5cf6"/> Real-Time SOC Telemetry</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0078d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0078d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d13438" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#d13438" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8}} />
                <Area type="monotone" dataKey="events" stroke="#0078d4" strokeWidth={3} fillOpacity={1} fill="url(#colorEvents)" />
                <Area type="monotone" dataKey="threats" stroke="#d13438" strokeWidth={3} fillOpacity={1} fill="url(#colorThreats)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tech Stack */}
      <div style={{ textAlign: 'center', padding: 60, background: 'rgba(255,255,255,0.02)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 32 }}>Enterprise Technology Stack</h2>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 16 }}>
          {['React 18', 'TypeScript', 'Node.js', 'Express', 'SQLite/PostgreSQL', 'Zustand', 'Vite', 'Recharts', 'Lucide', 'Azure SDK', 'AWS SDK', 'GCP SDK', 'MSAL', 'OpenAI API'].map(tech => (
            <div key={tech} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: 20, fontSize: 14, fontWeight: 600, color: '#cbd5e1' }}>
              {tech}
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
}
