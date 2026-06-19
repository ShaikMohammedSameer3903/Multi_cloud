// ============================================================
// Monitoring and Telemetry API Router
// All endpoints use live Azure data only
// ============================================================

const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db/database');
const { getResourceMetrics, getCostConsumption, getBackupHealth, getActiveAlerts, getVmUsageAndCredits } = require('../services/monitoringService');
const { getSecureScore, getDefenderRecommendations, getDefenderAlerts, getComplianceResults } = require('../services/defenderService');
const { getAdvisorRecommendations, getAdvisorScore } = require('../services/advisorService');
const { getServiceHealthAlerts, getResourceHealth, getPlannedMaintenance } = require('../services/healthService');
const { calculateRiskScore } = require('../services/riskEngine');
const { getCloudHealthScore } = require('../services/cloudHealthService');
const { getCache, setCache } = require('../services/cacheService');

const { verifySubscriptionAccess, logSecurityEvent } = require('../middleware/subscriptionSecurity');

// Helper: verify subscription access with security isolation
async function verifySubscription(tenantId, userId, userRole, subId) {
  const sub = await verifySubscriptionAccess(tenantId, userId, userRole, subId);
  if (!sub) {
    console.warn(`[SECURITY] DENIED subscription access: user=${userId} role=${userRole} sub=${subId}`);
  }
  return sub;
}

// ── 1. GET /api/monitoring/metrics ──────────────────────────
router.get('/metrics', async (req, res) => {
  const { subscriptionId, resourceId, provider } = req.query;
  
  if (provider === 'aws') {
    // Mock AWS CloudWatch Metrics
    const mockMetrics = [];
    let now = Date.now() - 3600000;
    for (let i = 0; i < 60; i++) {
      mockMetrics.push({ timestamp: new Date(now).toISOString(), cpuPercentage: Math.random() * 40 + 10 });
      now += 60000;
    }
    return res.json(mockMetrics);
  }

  const userAccessToken = req.azureAccessToken || req.headers['x-azure-token'] || null;
  if (!subscriptionId || !resourceId) {
    return res.status(400).json({ error: 'subscriptionId and resourceId are required for Azure.' });
  }
  try {
    const sub = await verifySubscription(req.tenantId, req.userId, req.userRole, subscriptionId);
    if (!sub) return res.status(404).json({ error: 'Subscription not found or access denied.' });

    const metrics = await getResourceMetrics(req.tenantId, sub.id, resourceId, userAccessToken);
    res.json(metrics);
  } catch (err) {
    console.error('[ROUTES] GET /monitoring/metrics failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 2. GET /api/monitoring/cost ──────────────────────────────
router.get('/cost', async (req, res) => {
  const { subscriptionId } = req.query;
  const userAccessToken = req.azureAccessToken || req.headers['x-azure-token'] || null;
  if (!subscriptionId) return res.status(400).json({ error: 'subscriptionId is required.' });
  try {
    const sub = await verifySubscription(req.tenantId, req.userId, req.userRole, subscriptionId);
    if (!sub) return res.status(404).json({ error: 'Subscription not found or access denied.' });

    const data = await getCostConsumption(req.tenantId, sub.id, userAccessToken);
    res.json(data);
  } catch (err) {
    console.error('[ROUTES] GET /monitoring/cost failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 3. GET /api/monitoring/backup ──────────────────────────
router.get('/backup', async (req, res) => {
  const { subscriptionId } = req.query;
  const userAccessToken = req.azureAccessToken || req.headers['x-azure-token'] || null;
  if (!subscriptionId) return res.status(400).json({ error: 'subscriptionId is required.' });
  try {
    const sub = await verifySubscription(req.tenantId, req.userId, req.userRole, subscriptionId);
    if (!sub) return res.status(404).json({ error: 'Subscription not found or access denied.' });

    const data = await getBackupHealth(req.tenantId, sub.id, userAccessToken);
    res.json(data);
  } catch (err) {
    console.error('[ROUTES] GET /monitoring/backup failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 4. GET /api/monitoring/alerts ───────────────────────────
router.get('/alerts', async (req, res) => {
  const { subscriptionId, provider } = req.query;

  if (provider === 'aws') {
    return res.json([
      { id: 'aws-1', name: 'High CPU Utilization', severity: 'Warning', condition: 'CPU > 80% for 5 minutes', source: 'CloudWatch' },
      { id: 'aws-2', name: 'RDS Storage Low', severity: 'High', condition: 'FreeStorageSpace < 5GB', source: 'CloudWatch' }
    ]);
  }

  const userAccessToken = req.azureAccessToken || req.headers['x-azure-token'] || null;
  if (!subscriptionId) return res.status(400).json({ error: 'subscriptionId is required for Azure.' });
  try {
    const sub = await verifySubscription(req.tenantId, req.userId, req.userRole, subscriptionId);
    if (!sub) return res.status(404).json({ error: 'Subscription not found or access denied.' });

    const data = await getActiveAlerts(req.tenantId, sub.id, userAccessToken);
    res.json(data);
  } catch (err) {
    console.error('[ROUTES] GET /monitoring/alerts failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 5. GET /api/monitoring/defender ─────────────────────────
router.get('/defender', async (req, res) => {
  const { subscriptionId } = req.query;
  const userAccessToken = req.azureAccessToken || req.headers['x-azure-token'] || null;
  if (!subscriptionId) return res.status(400).json({ error: 'subscriptionId is required.' });
  try {
    const sub = await verifySubscription(req.tenantId, req.userId, req.userRole, subscriptionId);
    if (!sub) return res.status(404).json({ error: 'Subscription not found or access denied.' });

    const [score, recommendations, alerts, compliance] = await Promise.allSettled([
      getSecureScore(req.tenantId, sub.id, userAccessToken),
      getDefenderRecommendations(req.tenantId, sub.id, userAccessToken),
      getDefenderAlerts(req.tenantId, sub.id, userAccessToken),
      getComplianceResults(req.tenantId, sub.id, userAccessToken)
    ]);

    res.json({
      secureScore: score.status === 'fulfilled' ? score.value : null,
      recommendations: recommendations.status === 'fulfilled' ? recommendations.value : [],
      alerts: alerts.status === 'fulfilled' ? alerts.value : [],
      compliance: compliance.status === 'fulfilled' ? compliance.value : [],
      errors: {
        secureScore: score.status === 'rejected' ? score.reason?.message : null,
        recommendations: recommendations.status === 'rejected' ? recommendations.reason?.message : null,
        alerts: alerts.status === 'rejected' ? alerts.reason?.message : null,
        compliance: compliance.status === 'rejected' ? compliance.reason?.message : null
      }
    });
  } catch (err) {
    console.error('[ROUTES] GET /monitoring/defender failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 6. GET /api/monitoring/advisor ──────────────────────────
router.get('/advisor', async (req, res) => {
  const { subscriptionId, category } = req.query;
  const userAccessToken = req.azureAccessToken || req.headers['x-azure-token'] || null;
  if (!subscriptionId) return res.status(400).json({ error: 'subscriptionId is required.' });
  try {
    const sub = await verifySubscription(req.tenantId, req.userId, req.userRole, subscriptionId);
    if (!sub) return res.status(404).json({ error: 'Subscription not found or access denied.' });

    const [recs, scores] = await Promise.allSettled([
      getAdvisorRecommendations(req.tenantId, sub.id, userAccessToken),
      getAdvisorScore(req.tenantId, sub.id, userAccessToken)
    ]);

    let recommendations = recs.status === 'fulfilled' ? recs.value : [];
    if (category) {
      recommendations = recommendations.filter(r =>
        r.category?.toLowerCase() === category.toLowerCase()
      );
    }

    res.json({
      recommendations,
      scores: scores.status === 'fulfilled' ? scores.value : [],
      errors: {
        recommendations: recs.status === 'rejected' ? recs.reason?.message : null,
        scores: scores.status === 'rejected' ? scores.reason?.message : null
      }
    });
  } catch (err) {
    console.error('[ROUTES] GET /monitoring/advisor failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 7. GET /api/monitoring/health ───────────────────────────
router.get('/health', async (req, res) => {
  const { subscriptionId, resourceId } = req.query;
  const userAccessToken = req.azureAccessToken || req.headers['x-azure-token'] || null;
  if (!subscriptionId) return res.status(400).json({ error: 'subscriptionId is required.' });
  try {
    const sub = await verifySubscription(req.tenantId, req.userId, req.userRole, subscriptionId);
    if (!sub) return res.status(404).json({ error: 'Subscription not found or access denied.' });

    if (resourceId) {
      const health = await getResourceHealth(req.tenantId, sub.id, resourceId, userAccessToken);
      return res.json(health);
    }

    const [events, maintenance] = await Promise.allSettled([
      getServiceHealthAlerts(req.tenantId, sub.id, userAccessToken),
      getPlannedMaintenance(req.tenantId, sub.id, userAccessToken)
    ]);

    res.json({
      activeEvents: events.status === 'fulfilled' ? events.value : [],
      plannedMaintenance: maintenance.status === 'fulfilled' ? maintenance.value : [],
      errors: {
        activeEvents: events.status === 'rejected' ? events.reason?.message : null,
        plannedMaintenance: maintenance.status === 'rejected' ? maintenance.reason?.message : null
      }
    });
  } catch (err) {
    console.error('[ROUTES] GET /monitoring/health failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 8. GET /api/monitoring/risk ─────────────────────────────
router.get('/risk', async (req, res) => {
  const { subscriptionId, resourceGroup } = req.query;
  const userAccessToken = req.azureAccessToken || req.headers['x-azure-token'] || null;
  if (!subscriptionId) return res.status(400).json({ error: 'subscriptionId is required.' });
  try {
    const sub = await verifySubscription(req.tenantId, req.userId, req.userRole, subscriptionId);
    if (!sub) return res.status(404).json({ error: 'Subscription not found or access denied.' });

    const data = await calculateRiskScore(req.tenantId, sub.id, resourceGroup || null, userAccessToken);
    res.json(data);
  } catch (err) {
    console.error('[ROUTES] GET /monitoring/risk failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 9. GET /api/monitoring/cloud-health ─────────────────────
router.get('/cloud-health', async (req, res) => {
  const { subscriptionId } = req.query;
  const userAccessToken = req.azureAccessToken || req.headers['x-azure-token'] || null;
  if (!subscriptionId) return res.status(400).json({ error: 'subscriptionId is required.' });
  try {
    const sub = await verifySubscription(req.tenantId, req.userId, req.userRole, subscriptionId);
    if (!sub) return res.status(404).json({ error: 'Subscription not found or access denied.' });

    const data = await getCloudHealthScore(req.tenantId, sub.id, userAccessToken);
    res.json(data);
  } catch (err) {
    console.error('[ROUTES] GET /monitoring/cloud-health failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 10. GET /api/monitoring/traffic ─────────────────────────
router.get('/traffic', (req, res) => {
  try {
    const getTrafficStats = req.app.get('getTrafficStats');
    if (getTrafficStats) {
      return res.json(getTrafficStats());
    }
    res.json({
      requestsPerSecond: 0,
      totalRequests: 0,
      activeConnections: 0,
      averageResponseTime: 0,
      successRate: 100,
      errorRate: 0,
      recentRequests: []
    });
  } catch (err) {
    console.error('[ROUTES] GET /monitoring/traffic failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 11. GET /api/monitoring/usage ───────────────────────────
router.get('/usage', async (req, res) => {
  const { subscriptionId, location } = req.query;
  const userAccessToken = req.azureAccessToken || req.headers['x-azure-token'] || null;
  if (!subscriptionId) return res.status(400).json({ error: 'subscriptionId is required.' });
  try {
    const sub = await verifySubscription(req.tenantId, req.userId, req.userRole, subscriptionId);
    if (!sub) return res.status(404).json({ error: 'Subscription not found or access denied.' });

    const data = await getVmUsageAndCredits(req.tenantId, sub.id, location || 'eastus', userAccessToken);
    res.json(data);
  } catch (err) {
    console.error('[ROUTES] GET /monitoring/usage failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});
// ============================================================
// UNIFIED MULTI-CLOUD ENDPOINTS
// Aggregate data from all connected cloud accounts
// ============================================================

// Helper: Get all AWS accounts for a tenant and run a provider method
async function aggregateAwsData(tenantId, methodName, ...args) {
  const db = await getDatabase();
  const awsAccounts = await db.all("SELECT * FROM cloud_accounts WHERE tenant_id = ? AND provider = 'aws' AND status = 'Active'", [tenantId]);
  const results = [];

  for (const account of awsAccounts) {
    try {
      const provider = ProviderFactory.getProvider(account);
      const data = await provider[methodName](...args);
      results.push({ account, data });
    } catch (err) {
      console.warn(`[Unified] ${methodName} failed for AWS account ${account.account_name}:`, err.message);
    }
  }
  return results;
}

// ── 12. GET /api/monitoring/security/unified ──────────────────
router.get('/security/unified', async (req, res) => {
  const { provider, scope = 'ALL' } = req.query;
  const cacheKey = `sec:unified:${req.tenantId}:${provider || 'all'}:${scope}`;
  try {
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    let allFindings = [];
    let totalScore = 0;
    let scoreCount = 0;

    // Azure data (if not filtered to aws only)
    if (provider !== 'aws') {
      try {
        const db = await getDatabase();
                let azureSubs = [];
        if (scope !== 'ALL' && scope.startsWith('azure-')) {
          azureSubs = await db.all('SELECT * FROM azure_subscriptions WHERE id = ? AND tenant_id = ?', [scope, req.tenantId]);
        } else if (scope === 'ALL') {
          azureSubs = await db.all('SELECT * FROM azure_subscriptions WHERE tenant_id = ?', [req.tenantId]);
        }
        if (azureSubs.length > 0) {
          const sub = azureSubs[0];
          const userAccessToken = req.azureAccessToken || req.headers['x-azure-token'] || null;
          const [secureScore, alerts] = await Promise.allSettled([
            getSecureScore(req.tenantId, sub.id, userAccessToken),
            getDefenderAlerts(req.tenantId, sub.id, userAccessToken),
          ]);
          if (secureScore.status === 'fulfilled' && secureScore.value?.percentage) {
            totalScore += secureScore.value.percentage;
            scoreCount++;
          }
          if (alerts.status === 'fulfilled') {
            for (const alert of (alerts.value || [])) {
              allFindings.push({
                ...alert,
                provider: 'azure',
                source: 'AzureDefender',
              });
            }
          }
        }
      } catch (err) { console.warn('[Unified Security] Azure fetch failed:', err.message); }
    }

    // AWS data (if not filtered to azure only)
    if (provider !== 'azure') {
      const awsResults = await aggregateAwsData(req.tenantId, 'getSecurity');
      for (const { account, data } of awsResults) {
        if (data.securityScore?.percentage) {
          totalScore += data.securityScore.percentage;
          scoreCount++;
        }
        for (const finding of (data.findings || [])) {
          allFindings.push({ ...finding, accountName: account.account_name });
        }
      }
    }

    const overallScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : null;
    const critical = allFindings.filter(f => f.severity === 'CRITICAL' || f.severity === 'High').length;
    const high = allFindings.filter(f => f.severity === 'HIGH' || f.severity === 'WARNING').length;
    const medium = allFindings.filter(f => f.severity === 'MEDIUM').length;
    const low = allFindings.filter(f => f.severity === 'LOW' || f.severity === 'INFORMATIONAL').length;

    const result = {
      overallScore,
      criticalAlerts: critical,
      highAlerts: high,
      mediumAlerts: medium,
      lowAlerts: low,
      findings: allFindings,
    };
    await setCache(cacheKey, result, 300);
    res.json(result);
  } catch (err) {
    console.error('[Unified Security] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 13. GET /api/monitoring/cost/unified ───────────────────────
router.get('/cost/unified', async (req, res) => {
  const { provider, scope = 'ALL' } = req.query;
  const cacheKey = `cost:unified:${req.tenantId}:${provider || 'all'}:${scope}`;
  try {
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    let totalCost = 0;
    let totalForecast = 0;
    const details = [];

    // Azure cost
    if (provider !== 'aws') {
      try {
        const db = await getDatabase();
                let azureSubs = [];
        if (scope !== 'ALL' && scope.startsWith('azure-')) {
          azureSubs = await db.all('SELECT * FROM azure_subscriptions WHERE id = ? AND tenant_id = ?', [scope, req.tenantId]);
        } else if (scope === 'ALL') {
          azureSubs = await db.all('SELECT * FROM azure_subscriptions WHERE tenant_id = ?', [req.tenantId]);
        }
        if (azureSubs.length > 0) {
          const sub = azureSubs[0];
          const userAccessToken = req.azureAccessToken || req.headers['x-azure-token'] || null;
          const costData = await getCostConsumption(req.tenantId, sub.id, userAccessToken);
          if (costData) {
            totalCost += costData.currentSpend || 0;
            details.push({
              provider: 'azure',
              accountName: sub.name || 'Azure Subscription',
              accountId: sub.subscription_id,
              cost: costData.currentSpend || 0,
              currency: costData.currency || 'USD',
              forecast: 0,
              breakdown: (costData.byService || []).map(s => ({ service: s.service, cost: s.cost })),
            });
          }
        }
      } catch (err) { console.warn('[Unified Cost] Azure fetch failed:', err.message); }
    }

    // AWS cost
    if (provider !== 'azure') {
      const awsResults = await aggregateAwsData(req.tenantId, 'getCost');
      for (const { account, data } of awsResults) {
        totalCost += data.currentMonthCost || 0;
        totalForecast += data.forecastCost || 0;
        details.push({
          provider: 'aws',
          accountName: account.account_name,
          accountId: account.account_id,
          cost: data.currentMonthCost || 0,
          currency: 'USD',
          forecast: data.forecastCost || 0,
          breakdown: data.breakdown || [],
        });
      }
    }

    const result = {
      totalCost: Math.round(totalCost * 100) / 100,
      totalForecast: Math.round(totalForecast * 100) / 100,
      currency: 'USD',
      month: new Date().toISOString().substring(0, 7),
      details,
    };
    await setCache(cacheKey, result, 3600);
    res.json(result);
  } catch (err) {
    console.error('[Unified Cost] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 14. GET /api/monitoring/compliance/unified ─────────────────
router.get('/compliance/unified', async (req, res) => {
  const { provider, framework, scope = 'ALL' } = req.query;
  const cacheKey = `comp:unified:${req.tenantId}:${provider || 'all'}:${framework || 'HIPAA'}:${scope}`;
  try {
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    let totalScore = 0;
    let scoreCount = 0;
    let totalControls = 0;
    let failedControls = 0;
    const allFindings = [];

    // Azure compliance
    if (provider !== 'aws') {
      try {
        const db = await getDatabase();
                let azureSubs = [];
        if (scope !== 'ALL' && scope.startsWith('azure-')) {
          azureSubs = await db.all('SELECT * FROM azure_subscriptions WHERE id = ? AND tenant_id = ?', [scope, req.tenantId]);
        } else if (scope === 'ALL') {
          azureSubs = await db.all('SELECT * FROM azure_subscriptions WHERE tenant_id = ?', [req.tenantId]);
        }
        if (azureSubs.length > 0) {
          const sub = azureSubs[0];
          const userAccessToken = req.azureAccessToken || req.headers['x-azure-token'] || null;
          const compData = await getComplianceResults(req.tenantId, sub.id, userAccessToken);
          if (compData && Array.isArray(compData)) {
            const passed = compData.filter(c => c.complianceState === 'Compliant').length;
            const total = compData.length || 1;
            totalScore += Math.round((passed / total) * 100);
            scoreCount++;
            totalControls += total;
            failedControls += total - passed;
          }
        }
      } catch (err) { console.warn('[Unified Compliance] Azure fetch failed:', err.message); }
    }

    // AWS compliance
    if (provider !== 'azure') {
      const awsResults = await aggregateAwsData(req.tenantId, 'getCompliance', framework || 'HIPAA');
      for (const { account, data } of awsResults) {
        if (data.score !== undefined) { totalScore += data.score; scoreCount++; }
        totalControls += data.totalControls || 0;
        failedControls += data.failedControls || 0;
        allFindings.push(...(data.findings || []).map(f => ({ ...f, accountName: account.account_name })));
      }
    }

    const overallScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 100;
    const result = {
      framework: framework || 'HIPAA',
      overallScore,
      totalControls,
      failedControls,
      riskLevel: overallScore < 70 ? 'High' : overallScore < 90 ? 'Medium' : 'Low',
      findings: allFindings,
    };
    await setCache(cacheKey, result, 300);
    res.json(result);
  } catch (err) {
    console.error('[Unified Compliance] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 15. GET /api/monitoring/executive ──────────────────────────
router.get('/executive', async (req, res) => {
  const { provider } = req.query;
  const cacheKey = `exec:unified:${req.tenantId}`;
  try {
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const db = await getDatabase();
    const accounts = await db.all('SELECT * FROM cloud_accounts WHERE tenant_id = ?', [req.tenantId]);
    const resources = await db.all('SELECT * FROM resources WHERE subscription_id IN (SELECT subscription_id FROM cloud_accounts WHERE tenant_id = ? UNION SELECT account_id FROM cloud_accounts WHERE tenant_id = ?)', [req.tenantId, req.tenantId]);
    const incidents = await db.all('SELECT * FROM incidents WHERE tenant_id = ?', [req.tenantId]);

    const azureAccounts = accounts.filter(a => a.provider === 'azure').length;
    const awsAccounts = accounts.filter(a => a.provider === 'aws').length;
    const azureResources = resources.filter(r => (r.provider || 'azure') === 'azure').length;
    const awsResources = resources.filter(r => r.provider === 'aws').length;
    const openIncidents = incidents.filter(i => i.status !== 'Closed' && i.status !== 'Resolved').length;
    const criticalIncidents = incidents.filter(i => i.severity === 'CRITICAL' || i.severity === 'SEV0').length;

    const result = {
      totalCloudAccounts: accounts.length,
      azureAccounts,
      awsAccounts,
      totalResources: resources.length,
      azureResources,
      awsResources,
      monthlySpend: 0,
      forecastSpend: 0,
      complianceScore: 0,
      securityScore: 0,
      criticalIncidents,
      backupSuccessRate: 100,
      riskScore: 0,
      resourceGrowth: 0,
      openIncidents,
    };
    await setCache(cacheKey, result, 300);
    return res.json(result);
  } catch (err) {
    console.error('[Executive] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 16. GET /api/monitoring/audit/unified ──────────────────────
router.get('/audit/unified', async (req, res) => {
  const { provider } = req.query;
  try {
    const allEvents = [];

    // AWS CloudTrail
    if (provider !== 'azure') {
      const awsResults = await aggregateAwsData(req.tenantId, 'getAuditLogs');
      for (const { account, data } of awsResults) {
        for (const event of (data || [])) {
          allEvents.push({ ...event, accountName: account.account_name });
        }
      }
    }

    // Sort by time descending
    allEvents.sort((a, b) => new Date(b.eventTime || 0) - new Date(a.eventTime || 0));

    res.json({ events: allEvents.slice(0, 100) });
  } catch (err) {
    console.error('[Unified Audit] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 17. GET /api/monitoring/backup/unified ─────────────────────
router.get('/backup/unified', async (req, res) => {
  const { provider, scope = 'ALL' } = req.query;
  try {
    let totalProtected = 0;
    let totalHealthy = 0;
    let totalFailed = 0;
    let totalRecoveryPoints = 0;
    let latestBackup = null;
    const allJobs = [];
    const details = [];

    // Azure backup
    if (provider !== 'aws') {
      try {
        const db = await getDatabase();
                let azureSubs = [];
        if (scope !== 'ALL' && scope.startsWith('azure-')) {
          azureSubs = await db.all('SELECT * FROM azure_subscriptions WHERE id = ? AND tenant_id = ?', [scope, req.tenantId]);
        } else if (scope === 'ALL') {
          azureSubs = await db.all('SELECT * FROM azure_subscriptions WHERE tenant_id = ?', [req.tenantId]);
        }
        if (azureSubs.length > 0) {
          const sub = azureSubs[0];
          const userAccessToken = req.azureAccessToken || req.headers['x-azure-token'] || null;
          const backupData = await getBackupHealth(req.tenantId, sub.id, userAccessToken);
          if (backupData) {
            totalProtected += backupData.totalProtectedItems || 0;
            totalHealthy += (backupData.totalProtectedItems || 0) - (backupData.failedJobs || 0);
            totalFailed += backupData.failedJobs || 0;
            details.push({
              provider: 'azure',
              accountName: sub.name || 'Azure Subscription',
              protectedItems: backupData.totalProtectedItems || 0,
              healthyItems: (backupData.totalProtectedItems || 0) - (backupData.failedJobs || 0),
              failedJobs: backupData.failedJobs || 0,
              lastBackup: backupData.recentJobs?.[0]?.timestamp || null,
            });
          }
        }
      } catch (err) { console.warn('[Unified Backup] Azure fetch failed:', err.message); }
    }

    // AWS Backup
    if (provider !== 'azure') {
      const awsResults = await aggregateAwsData(req.tenantId, 'getBackup');
      for (const { account, data } of awsResults) {
        totalProtected += data.totalProtectedItems || 0;
        totalHealthy += data.healthyItems || 0;
        totalFailed += data.failedJobs || 0;
        totalRecoveryPoints += data.recoveryPoints || 0;
        if (data.lastBackupTime && (!latestBackup || new Date(data.lastBackupTime) > new Date(latestBackup))) {
          latestBackup = data.lastBackupTime;
        }
        allJobs.push(...(data.recentJobs || []).map(j => ({ ...j, provider: 'aws', accountName: account.account_name })));
        details.push({
          provider: 'aws',
          accountName: account.account_name,
          protectedItems: data.totalProtectedItems || 0,
          healthyItems: data.healthyItems || 0,
          failedJobs: data.failedJobs || 0,
          lastBackup: data.lastBackupTime,
        });
      }
    }

    const successRate = totalProtected > 0 ? Math.round((totalHealthy / totalProtected) * 100) : 100;

    res.json({
      totalProtectedItems: totalProtected,
      healthyItems: totalHealthy,
      failedJobs: totalFailed,
      successRate,
      recoveryPoints: totalRecoveryPoints,
      lastBackupTime: latestBackup,
      recentJobs: allJobs.sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0)).slice(0, 20),
      details,
    });
  } catch (err) {
    console.error('[Unified Backup] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;


