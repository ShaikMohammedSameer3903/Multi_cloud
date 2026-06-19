// ============================================================
// Threat Hunting Dashboard & Attack Timeline
// ============================================================

import React, { useState } from 'react';
import { Search, Shield, Target, Activity, ArrowRight, Crosshair, Users, Server, Database, AlertTriangle } from 'lucide-react';
import { useCloudStore } from '../store/cloudStore';

interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  description: string;
  type: 'LOGIN' | 'PRIVILEGE' | 'LATERAL' | 'EXFILTRATION' | 'REMEDIATION';
}

const MOCK_TIMELINE: TimelineEvent[] = [
  { id: '1', time: '10:00 AM', title: 'Suspicious Login', description: 'Login from unauthorized IP (104.28.19.12) to Azure AD.', type: 'LOGIN' },
  { id: '2', time: '10:15 AM', title: 'Privilege Escalation', description: 'User assigned Global Administrator role.', type: 'PRIVILEGE' },
  { id: '3', time: '10:45 AM', title: 'Lateral Movement', description: 'Accessing critical VM over RDP.', type: 'LATERAL' },
  { id: '4', time: '11:30 AM', title: 'Data Access', description: 'Mass download from internal database server.', type: 'EXFILTRATION' },
  { id: '5', time: '11:45 AM', title: 'Automated Containment', description: 'System disabled user and quarantined VM.', type: 'REMEDIATION' },
];

export default function ThreatHuntingDashboard() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setTimeout(() => setSearching(false), 800);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">Threat Hunting Center</h1>
          <p className="page-subtitle">Proactively search and investigate cross-cloud security events</p>
        </div>
      </div>

      <div className="card mb-6">
        <div className="card-body">
          <form onSubmit={handleSearch} className="flex" style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: 12, color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                placeholder="Search IPs, Users, Resources, or Event IDs across all connected clouds..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 16px 10px 45px',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                  fontSize: 14
                }}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={searching}>
              {searching ? 'Hunting...' : 'Hunt'}
            </button>
          </form>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <span className="badge" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)' }}><Users size={12} /> Compromised Users</span>
            <span className="badge" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)' }}><Server size={12} /> Exposed VMs</span>
            <span className="badge" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)' }}><Database size={12} /> Open Storage</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Attack Timeline */}
        <div className="card col-span-2">
          <div className="card-header">
            <div className="card-title">Attack Timeline Analysis</div>
          </div>
          <div className="card-body">
            <div style={{ paddingLeft: 16, borderLeft: '2px solid var(--border-subtle)' }}>
              {MOCK_TIMELINE.map((event, index) => (
                <div key={event.id} style={{ position: 'relative', paddingBottom: index === MOCK_TIMELINE.length - 1 ? 0 : 32 }}>
                  {/* Timeline Dot */}
                  <div style={{
                    position: 'absolute',
                    left: -21,
                    top: 0,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: event.type === 'REMEDIATION' ? '#107C10' : '#D13438',
                    border: '2px solid var(--bg-surface)'
                  }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600 }}>{event.time}</span>
                        <span className="badge" style={{ fontSize: 10, background: 'var(--bg-hover)' }}>{event.type}</span>
                      </div>
                      <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{event.title}</h4>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{event.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Threat Intelligence / Quick Actions */}
        <div className="card col-span-1">
          <div className="card-header">
            <div className="card-title">Investigation Tools</div>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: 12 }}>
                <Crosshair size={16} /> Look up IP in Threat Intel
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: 12 }}>
                <Target size={16} /> Find Lateral Movement
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: 12 }}>
                <Shield size={16} /> Isolate Affected Assets
              </button>
            </div>
            
            <div style={{ marginTop: 24, padding: 16, background: 'rgba(209,52,56,0.05)', borderRadius: 8, border: '1px solid rgba(209,52,56,0.2)' }}>
              <h4 style={{ fontSize: 13, color: '#D13438', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={14} /> Critical Findings
              </h4>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Multiple failed login attempts followed by successful login from Tor exit node.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
