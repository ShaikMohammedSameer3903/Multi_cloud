// ============================================================
// AWS Resource Discovery Engine - Live AWS API Integration
// ============================================================

const { STSClient, AssumeRoleCommand } = require('@aws-sdk/client-sts');
const { OrganizationsClient, ListAccountsCommand } = require('@aws-sdk/client-organizations');
const { ResourceGroupsTaggingAPIClient, GetResourcesCommand } = require('@aws-sdk/client-resource-groups-tagging-api');
const { CostExplorerClient, GetCostAndUsageCommand } = require('@aws-sdk/client-cost-explorer');
const { SecurityHubClient, GetFindingsCommand } = require('@aws-sdk/client-securityhub');
const { getDatabase } = require('../db/database');
const { logAudit } = require('./auditLogger');

// Create AWS clients configured to assume roles across accounts
async function getAwsClients(tenantId, accountId) {
  const db = await getDatabase();
  const awsAccount = await db.get('SELECT * FROM azure_subscriptions WHERE provider = "AWS" AND id = ? AND tenant_id = ?', [accountId, tenantId]);
  
  if (!awsAccount || !awsAccount.client_id) { // using client_id as RoleARN for AWS accounts
    throw new Error('AWS Account not configured or missing IAM Role ARN for AssumeRole.');
  }

  // Assuming the backend environment has master AWS credentials configured
  const stsClient = new STSClient({ region: 'us-east-1' });
  const assumeRoleResponse = await stsClient.send(new AssumeRoleCommand({
    RoleArn: awsAccount.client_id, // Role ARN stored in client_id column
    RoleSessionName: `CloudOps_Discovery_${Date.now()}`,
    DurationSeconds: 3600
  }));

  const credentials = {
    accessKeyId: assumeRoleResponse.Credentials.AccessKeyId,
    secretAccessKey: assumeRoleResponse.Credentials.SecretAccessKey,
    sessionToken: assumeRoleResponse.Credentials.SessionToken
  };

  return {
    resourceClient: new ResourceGroupsTaggingAPIClient({ credentials, region: awsAccount.location || 'us-east-1' }),
    costClient: new CostExplorerClient({ credentials, region: 'us-east-1' }),
    securityClient: new SecurityHubClient({ credentials, region: awsAccount.location || 'us-east-1' }),
  };
}

/**
 * Discover all AWS resources using the Resource Groups Tagging API (cross-service discovery)
 */
async function discoverAwsResources(tenantId, accountId) {
  const startMs = Date.now();
  const db = await getDatabase();
  
  console.log(`[AWS-DISCOVERY] ▶ Starting discovery for Account: ${accountId}`);

  let clients;
  try {
    clients = await getAwsClients(tenantId, accountId);
  } catch (error) {
    console.error(`[AWS-DISCOVERY] ❌ Auth failed: ${error.message}`);
    throw error;
  }

  const { resourceClient } = clients;
  const discoveredList = [];
  const discoveredIds = [];

  try {
    // Paginate through all resources across supported AWS services
    let paginationToken = undefined;
    
    do {
      const response = await resourceClient.send(new GetResourcesCommand({
        PaginationToken: paginationToken,
        ResourcesPerPage: 100
      }));

      if (response.ResourceTagMappingList) {
        for (const mapping of response.ResourceTagMappingList) {
          const arn = mapping.ResourceARN;
          const tags = mapping.Tags || [];
          const tagMap = {};
          tags.forEach(t => { tagMap[t.Key] = t.Value });

          // Parse ARN
          // Example: arn:aws:ec2:us-east-1:123456789012:instance/i-0abcd1234efgh5678
          const arnParts = arn.split(':');
          const service = arnParts[2];
          const region = arnParts[3];
          const resourcePath = arnParts[5];
          const resourceName = tagMap['Name'] || resourcePath.split('/').pop() || arn;

          let riskScore = 0;
          if (!tagMap['Environment']) riskScore += 15;
          if (!tagMap['Owner']) riskScore += 15;

          const costImpact = service === 'ec2' || service === 'rds' ? 80 : 20;

          discoveredIds.push(arn);
          discoveredList.push({
            id: arn,
            subscription_id: accountId, // using subscription_id column to hold AWS Account ID for unification
            resource_group: service, // Map service to resource_group concept
            name: resourceName,
            type: `aws_${service}`,
            location: region || 'global',
            status: 'Active',
            tags: tagMap,
            raw_payload: { arn, service },
            owner: tagMap['Owner'] || 'Unassigned',
            last_modified: new Date().toISOString(),
            cost_impact: costImpact,
            risk_score: riskScore,
            health_status: riskScore >= 30 ? 'Warning' : 'Healthy'
          });
        }
      }
      paginationToken = response.PaginationToken;
    } while (paginationToken);

    // Persist to DB
    for (const res of discoveredList) {
      await db.run(`
        INSERT INTO resources (
          id, subscription_id, resource_group, name, type, location, status, tags, raw_payload,
          owner, last_modified, cost_impact, risk_score, health_status, last_discovered_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          status = excluded.status,
          tags = excluded.tags,
          raw_payload = excluded.raw_payload,
          owner = excluded.owner,
          last_modified = excluded.last_modified,
          cost_impact = excluded.cost_impact,
          risk_score = excluded.risk_score,
          health_status = excluded.health_status,
          last_discovered_at = CURRENT_TIMESTAMP
      `, [
        res.id, res.subscription_id, res.resource_group, res.name, res.type, res.location,
        res.status, JSON.stringify(res.tags), JSON.stringify(res.raw_payload), res.owner, res.last_modified,
        res.cost_impact, res.risk_score, res.health_status
      ]);
    }

    // Prune stale resources
    if (discoveredIds.length > 0) {
      const placeholders = discoveredIds.map(() => '?').join(',');
      await db.run(`
        DELETE FROM resources
        WHERE subscription_id = ? AND id NOT IN (${placeholders})
      `, [accountId, ...discoveredIds]);
    } else {
      await db.run('DELETE FROM resources WHERE subscription_id = ?', [accountId]);
    }

    const totalMs = Date.now() - startMs;
    console.log(`[AWS-DISCOVERY] ✅ Done: ${discoveredList.length} resources discovered in ${totalMs}ms`);

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60000).toISOString();
    const lastLog = await db.get(`
      SELECT created_at FROM audit_logs 
      WHERE resource_id = ? 
        AND action = 'DISCOVERY_COMPLETED' 
        AND created_at > ?
      ORDER BY created_at DESC LIMIT 1
    `, [accountId, thirtyMinutesAgo]);

    if (!lastLog) {
      await logAudit(tenantId, 'system', 'discovery-engine@cloudops.internal', 'DISCOVERY_COMPLETED', 'AwsAccount', accountId, '127.0.0.1', 'SUCCESS', {
        count: discoveredList.length,
        durationMs: totalMs
      });
    }

    return discoveredList;
  } catch (error) {
    const totalMs = Date.now() - startMs;
    console.error(`[AWS-DISCOVERY] ❌ Discovery failed: ${error.message}`);
    
    await logAudit(tenantId, 'system', 'discovery-engine@cloudops.internal', 'DISCOVERY_FAILED', 'AwsAccount', accountId, '127.0.0.1', 'FAILURE', {
      error: error.message,
      durationMs: totalMs
    });
    throw error;
  }
}

module.exports = {
  discoverAwsResources,
  getAwsClients
};
