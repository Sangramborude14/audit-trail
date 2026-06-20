import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';

// Interfaces representing DynamoDB single-table design entities
export interface TenantConfig {
  tenantId: string;
  name: string;
  createdAt: number;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface FrameworkStatus {
  tenantId: string;
  frameworkId: string; // e.g., 'SOC2', 'ISO27001'
  score: number; // 0 to 100
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'IN_PROGRESS';
  updatedAt: number;
}

export interface ComplianceControl {
  tenantId: string;
  frameworkId: string;
  controlId: string; // e.g., 'CC1.1'
  title: string;
  description: string;
  status: 'PASSED' | 'FAILED' | 'NOT_APPLICABLE';
  evidenceS3Key?: string;
  updatedAt: number;
}

export class AuditTrailDbClient {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(client: DynamoDBClient, tableName: string = 'AuditTrailTable') {
    this.docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
    this.tableName = tableName;
  }

  /**
   * Catastrophic Authorization Guard:
   * Instantly rejects any call where tenantId is empty, null, or undefined.
   */
  private validateTenantId(tenantId: string): void {
    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
      throw new Error(
        'SECURITY_ALERT: Catastrophic Authorization Failure. Tenant ID is undefined, null, or empty. Database operation rejected.'
      );
    }
    if (tenantId.includes('#')) {
      throw new Error(
        'SECURITY_ALERT: Catastrophic Authorization Failure. Tenant ID contains invalid delimiter characters. Database operation rejected.'
      );
    }
  }

  /**
   * Malicious Isolation Bypass Blocker:
   * Programmatically verifies that target partition keys (PK) match the tenantId namespace.
   * Logs a high-severity alert to console.error and throws an exception on bypass attempts.
   */
  private enforceIsolation(tenantId: string, pkValue: string): void {
    const expectedPrefix1 = `TENANT#${tenantId}`;
    const expectedPrefix2 = `TENANT#${tenantId}#`;

    if (pkValue !== expectedPrefix1 && !pkValue.startsWith(expectedPrefix2)) {
      const alertMsg = `[HIGH-SEVERITY ALERT] Tenant isolation breach attempt detected! Active session tenantId: '${tenantId}' attempted to access Partition Key: '${pkValue}'.`;
      console.error(alertMsg);
      throw new Error(`SECURITY_ALERT: Cross-tenant access violation. Database operation blocked.`);
    }
  }

  /**
   * Tenant Account Config Access Patterns
   */
  async getTenantConfig(tenantId: string): Promise<TenantConfig | null> {
    this.validateTenantId(tenantId);

    const pk = `TENANT#${tenantId}`;
    const sk = 'METADATA';
    this.enforceIsolation(tenantId, pk);

    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk, sk },
      })
    );

    if (!result.Item) return null;
    return {
      tenantId: result.Item.tenantId,
      name: result.Item.name,
      createdAt: result.Item.createdAt,
      status: result.Item.status,
    };
  }

  async putTenantConfig(tenantId: string, config: Omit<TenantConfig, 'tenantId'>): Promise<void> {
    this.validateTenantId(tenantId);

    const pk = `TENANT#${tenantId}`;
    const sk = 'METADATA';
    this.enforceIsolation(tenantId, pk);

    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk,
          sk,
          tenantId,
          ...config,
        },
      })
    );
  }

  /**
   * Framework Status Access Patterns
   */
  async getFrameworkStatus(tenantId: string, frameworkId: string): Promise<FrameworkStatus | null> {
    this.validateTenantId(tenantId);

    const pk = `TENANT#${tenantId}`;
    const sk = `FRAMEWORK#${frameworkId}`;
    this.enforceIsolation(tenantId, pk);

    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk, sk },
      })
    );

    if (!result.Item) return null;
    return {
      tenantId: result.Item.tenantId,
      frameworkId: result.Item.frameworkId,
      score: result.Item.score,
      status: result.Item.status,
      updatedAt: result.Item.updatedAt,
    };
  }

  async putFrameworkStatus(
    tenantId: string,
    frameworkId: string,
    status: Omit<FrameworkStatus, 'tenantId' | 'frameworkId'>
  ): Promise<void> {
    this.validateTenantId(tenantId);

    const pk = `TENANT#${tenantId}`;
    const sk = `FRAMEWORK#${frameworkId}`;
    this.enforceIsolation(tenantId, pk);

    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk,
          sk,
          tenantId,
          frameworkId,
          ...status,
        },
      })
    );
  }

  /**
   * Compliance Control Access Patterns
   */
  async putComplianceControl(
    tenantId: string,
    frameworkId: string,
    controlId: string,
    control: Omit<ComplianceControl, 'tenantId' | 'frameworkId' | 'controlId'>
  ): Promise<void> {
    this.validateTenantId(tenantId);

    const pk = `TENANT#${tenantId}#FRAMEWORK#${frameworkId}`;
    const sk = `CONTROL#${controlId}`;
    this.enforceIsolation(tenantId, pk);

    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk,
          sk,
          tenantId,
          frameworkId,
          controlId,
          ...control,
        },
      })
    );
  }

  async getComplianceControl(
    tenantId: string,
    frameworkId: string,
    controlId: string
  ): Promise<ComplianceControl | null> {
    this.validateTenantId(tenantId);

    const pk = `TENANT#${tenantId}#FRAMEWORK#${frameworkId}`;
    const sk = `CONTROL#${controlId}`;
    this.enforceIsolation(tenantId, pk);

    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk, sk },
      })
    );

    if (!result.Item) return null;
    return {
      tenantId: result.Item.tenantId,
      frameworkId: result.Item.frameworkId,
      controlId: result.Item.controlId,
      title: result.Item.title,
      description: result.Item.description,
      status: result.Item.status,
      evidenceS3Key: result.Item.evidenceS3Key,
      updatedAt: result.Item.updatedAt,
    };
  }

  async listComplianceControls(
    tenantId: string,
    frameworkId: string
  ): Promise<ComplianceControl[]> {
    this.validateTenantId(tenantId);

    const pk = `TENANT#${tenantId}#FRAMEWORK#${frameworkId}`;
    this.enforceIsolation(tenantId, pk);

    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': pk,
          ':skPrefix': 'CONTROL#',
        },
      })
    );

    if (!result.Items) return [];
    return result.Items.map((item) => ({
      tenantId: item.tenantId,
      frameworkId: item.frameworkId,
      controlId: item.controlId,
      title: item.title,
      description: item.description,
      status: item.status,
      evidenceS3Key: item.evidenceS3Key,
      updatedAt: item.updatedAt,
    }));
  }
}
