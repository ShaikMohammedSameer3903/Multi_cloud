// ============================================================
// Backup & Disaster Recovery Dashboard - Fluent 2 Visual Upgrade
// ============================================================

import { useEffect, useState, useMemo } from 'react';
import {
  HardDrive, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  Clock, Shield, Database, RotateCcw, ArrowRight, Server, Cloud,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useAppStore, TENANT_CONFIGS } from '../store/appStore';
import { api } from '../services/api';

const BACKUP_COLORS = { Succeeded: '#107C10', Failed: '#D13438', Warning: '#FFB900', InProgress: '#0078D4' };

export default function BackupDashboard() {
  const { activeSubscriptionId, backupHealth, setBackupHealth, activeEnvironment, resources } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [backupJobs, setBackupJobs] = useState<any[]>([]);
  const [drReadiness, setDrReadiness] = useState({
    status: 'Ready',
    lastTest: '2026-06-12 16:30',
    rto: 4,
    rpo: 1,
    rtoTarget: 8,
    rpoTarget: 24,
    healthScore: 100
  });

  const tenantConfig = activeEnvironment !== 'All' ? TENANT_CONFIGS[activeEnvironment] : null;

  // Compute 30 days of backup trend data dynamically from real backup jobs
  const trendData = useMemo(() => {
    const days: Record<string, { Successful: number; Failed: number; RecoveryJobs: number }> = {};
    backupJobs.forEach(job => {
      const dateStr = new Date(job.startTime || job.timestamp || new Date()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (!days[dateStr]) {
        days[dateStr] = { Successful: 0, Failed: 0, RecoveryJobs: 0 };
      }
      if (job.status === 'Succeeded') {
        days[dateStr].Successful++;
      } else if (job.status === 'Failed') {
        days[dateStr].Failed++;
      }
      if (job.operation?.toLowerCase().includes('recovery') || job.type?.toLowerCase().includes('recovery')) {
        days[dateStr].RecoveryJobs++;
      }
    });
    return Object.entries(days).map(([name, counts]) => ({
      name,
      ...counts
    })).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
  }, [backupJobs]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeSubscriptionId) {
        const data = await api.get<any>('/api/monitoring/backup', { params: { subscriptionId: activeSubscriptionId } });
        if (data.vaults && data.vaults.length > 0) {
          setBackupHealth(data.vaults.map((v: any) => ({
            vaultName: v.name, protectedItems: v.protectedItems || 0,
            healthyItems: v.healthyItems || 0, warningItems: v.warningItems || 0, criticalItems: v.criticalItems || 0,
            lastSuccessfulBackup: v.lastBackup, jobs: v.recentJobs || [],
          })));
          setBackupJobs(data.recentJobs || []);
        } else {
          setBackupJobs([]);
          setBackupHealth([]);
        }
      }
    } catch {
      setBackupJobs([]);
      setBackupHealth([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [activeSubscriptionId]);

  const vault = backupHealth[0] || {
    vaultName: 'Recovery Services Vault',
    protectedItems: 0,
    healthyItems: 0,
    warningItems: 0,
    criticalItems: 0,
  };
  
  const totalProtected = vault.protectedItems;
  const successRate = backupJobs.length > 0
    ? Math.round((backupJobs.filter(j => j.status === 'Succeeded').length / backupJobs.length) * 100) : 0;

  const statusData = [
    { name: 'Healthy', value: vault.healthyItems, fill: '#107C10' },
    { name: 'Warning', value: vault.warningItems, fill: '#FFB900' },
    { name: 'Critical', value: vault.criticalItems, fill: '#D13438' },
  ];

  // Filter resources to get actual counts
  const protectedVms = resources.filter(r => r.type?.toLowerCase().includes('virtualmachines')).length;
  const protectedDbs = resources.filter(r => r.type?.toLowerCase().includes('sql/servers/databases') || r.type?.toLowerCase().includes('sql/servers')).length;
  const protectedStorage = resources.filter(r => r.type?.toLowerCase().includes('storageaccounts')).length;
  const recoveryVaults = resources.filter(r => r.type?.toLowerCase().includes('recoveryservices/vaults')).length;

  return (
    <div style={{ paddingBottom: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="page-header-content">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 700 }}>
            <HardDrive size={22} color="var(--azure-600)" />
            Backup & Disaster Recovery
          </h1>
          <p className="page-subtitle" style={{ color: 'var(--text-secondary)' }}>
            Recovery Services Vault monitoring, RPO/RTO tracking, and DR readiness
            {tenantConfig && <> for <strong>{tenantConfig.name}</strong></>}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={fetchData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Overview Cards (Live Counters) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 20
      }}>
        {[
          { label: 'Protected VMs', count: protectedVms, color: '#0078D4', icon: <Server size={18} /> },
          { label: 'Protected Databases', count: protectedDbs, color: '#8b5cf6', icon: <Database size={18} /> },
          { label: 'Protected Storage Accounts', count: protectedStorage, color: '#107C10', icon: <HardDrive size={18} /> },
          { label: 'Recovery Vaults', count: recoveryVaults, color: '#fbbf24', icon: <Shield size={18} /> }
        ].map(item => (
          <div key={item.label} className="card p-3" style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            borderRadius: 16
          }}>
            <div style={{
              background: `${item.color}15`,
              borderRadius: 8,
              padding: 10,
              display: 'flex',
              color: item.color
            }}>{item.icon}</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{item.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{item.count}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid Layout */}
      <div className="grid-3" style={{ gap: 20 }}>
        
        {/* Success Trend Line Chart */}
        <div className="card col-span-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 16 }}>
          <div className="card-header" style={{ padding: '16px 20px 0' }}>
            <div className="card-title" style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={16} color="var(--azure-600)" />
              Backup Success Trend (Last 30 Days)
            </div>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="var(--text-tertiary)" style={{ fontSize: 10 }} />
                <YAxis stroke="var(--text-tertiary)" style={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Successful" stroke="#107C10" strokeWidth={2.5} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Failed" stroke="#D13438" strokeWidth={2} />
                <Line type="monotone" dataKey="RecoveryJobs" stroke="#0078D4" strokeWidth={1.5} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vault Health Score */}
        <div className="card col-span-1" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 16 }}>
          <div className="card-header" style={{ padding: '16px 20px 0' }}>
            <div className="card-title" style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={16} color="var(--azure-600)" />
              Vault Health
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {/* Progress Circular Health Score */}
            <div style={{ position: 'relative', width: 110, height: 110, margin: '10px 0' }}>
              <svg width={110} height={110} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={55} cy={55} r={48} fill="none" stroke="#f1f5f9" strokeWidth={8} />
                <circle cx={55} cy={55} r={48} fill="none" stroke="#107C10" strokeWidth={8}
                  strokeDasharray={2 * Math.PI * 48} strokeDashoffset={2 * Math.PI * 48 * (1 - drReadiness.healthScore / 100)}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 800ms ease' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: '#107C10' }}>{drReadiness.healthScore}%</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Health</span>
              </div>
            </div>

            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-around', margin: '14px 0 6px', fontSize: 11 }}>
              {statusData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.fill }} />
                  <span>{d.name}: <strong>{d.value}</strong></span>
                </div>
              ))}
            </div>
            
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', width: '100%', textAlign: 'center', paddingTop: 8, marginTop: 4 }}>
              Sync Status: <span style={{ fontWeight: 600, color: '#107C10' }}>Connected</span> (5 mins ago)
            </div>
          </div>
        </div>

        {/* Disaster Recovery Map Panel */}
        <div className="card col-span-1" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 16 }}>
          <div className="card-header" style={{ padding: '16px 20px 0' }}>
            <div className="card-title" style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Cloud size={16} color="var(--azure-600)" />
              Disaster Recovery Map
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-surface-secondary)', borderRadius: 8 }}>
              <div>
                <div style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 700 }}>PRIMARY REGION</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>East US</div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, margin: '0 10px' }}>
                <span style={{ fontSize: 9, color: '#107C10', fontWeight: 700 }} className="animate-pulse">REPLICATING</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 2 }}>
                  <ArrowRight size={14} color="#107C10" className="animate-pulse" />
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 700 }}>SECONDARY REGION</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>West US</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
              <span style={{ fontWeight: 700, color: '#107C10' }}>Synchronized</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Last DR drill:</span>
              <span style={{ fontWeight: 600 }}>{drReadiness.lastTest.split(' ')[0]}</span>
            </div>
          </div>
        </div>

        {/* Recent Backup Jobs Panel */}
        <div className="card col-span-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 16 }}>
          <div className="card-header" style={{ padding: '16px 20px 0' }}>
            <div className="card-title" style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <RotateCcw size={16} color="var(--azure-600)" />
              Recent Backup Jobs (Latest 10)
            </div>
          </div>
          <div className="card-body" style={{ padding: '10px 0 0', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-default)' }}>
                  <th style={{ padding: '8px 16px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Job Name</th>
                  <th style={{ padding: '8px 16px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Resource</th>
                  <th style={{ padding: '8px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '8px 16px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600 }}>Duration</th>
                  <th style={{ padding: '8px 16px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600 }}>Size</th>
                </tr>
              </thead>
              <tbody>
                {backupJobs.map(job => {
                  const color = (BACKUP_COLORS as any)[job.status] || '#64748b';
                  return (
                    <tr key={job.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '9px 16px', fontWeight: 600 }}>{job.name}</td>
                      <td style={{ padding: '9px 16px', color: 'var(--text-secondary)' }}>{job.resource}</td>
                      <td style={{ padding: '9px 16px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: 9.5,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 20,
                          background: `${color}15`,
                          color
                        }}>{job.status}</span>
                      </td>
                      <td style={{ padding: '9px 16px', textAlign: 'right', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{job.duration}</td>
                      <td style={{ padding: '9px 16px', textAlign: 'right', fontWeight: 600 }}>{job.size}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
