import { EventEmitter } from 'events';
export type EncryptionAlgorithm = 'aes-256-gcm' | 'aes-256-cbc' | 'chacha20-poly1305';
export type HashAlgorithm = 'sha256' | 'sha512' | 'blake2b512';
export type SecurityLevel = 'basic' | 'standard' | 'enhanced' | 'maximum';
export type ComplianceStandard = 'SOC2' | 'ISO27001' | 'PCI_DSS' | 'GDPR' | 'HIPAA' | 'FedRAMP';
export type AuditEventType = 'login' | 'logout' | 'asset_upload' | 'asset_download' | 'build_trigger' | 'config_change' | 'api_access' | 'security_event';
export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';
export interface SecurityConfig {
    encryptionAlgorithm: EncryptionAlgorithm;
    hashAlgorithm: HashAlgorithm;
    securityLevel: SecurityLevel;
    enableAuditLogging: boolean;
    enableThreatDetection: boolean;
    enableDataLossPrevention: boolean;
    enableZeroTrustAccess: boolean;
    complianceStandards: ComplianceStandard[];
    encryption: {
        masterKey: string;
        keyRotationInterval: number;
        enableKeyEscrow: boolean;
        enableHSM: boolean;
    };
    authentication: {
        jwtSecret: string;
        jwtExpiresIn: string;
        enableMFA: boolean;
        enableSSO: boolean;
        passwordPolicy: PasswordPolicy;
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
        enableDynamicLimiting: boolean;
    };
    audit: {
        retentionPeriod: number;
        enableRealTimeAlerts: boolean;
        enableForensics: boolean;
        exportFormat: 'json' | 'csv' | 'siem';
    };
}
export interface PasswordPolicy {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    prohibitCommonPasswords: boolean;
    maxAge: number;
    historyCount: number;
}
export interface EncryptionResult {
    encryptedData: string;
    iv: string;
    authTag: string;
    algorithm: EncryptionAlgorithm;
    keyId: string;
}
export interface AuditEvent {
    id: string;
    timestamp: Date;
    eventType: AuditEventType;
    userId: string;
    userAgent?: string;
    ipAddress?: string;
    resource: string;
    action: string;
    result: 'success' | 'failure' | 'blocked';
    details: Record<string, any>;
    riskScore: number;
    threatLevel: ThreatLevel;
    complianceFlags: ComplianceStandard[];
}
export interface SecurityAlert {
    id: string;
    timestamp: Date;
    alertType: 'authentication' | 'authorization' | 'data_access' | 'anomaly' | 'compliance' | 'threat';
    severity: ThreatLevel;
    title: string;
    description: string;
    affectedUser?: string;
    affectedResource?: string;
    remediationSteps: string[];
    automaticResponse?: string;
    metadata: Record<string, any>;
}
export interface ComplianceReport {
    standard: ComplianceStandard;
    reportDate: Date;
    overallScore: number;
    controls: ComplianceControl[];
    recommendations: string[];
    nonCompliantItems: NonCompliantItem[];
    certificationStatus: 'compliant' | 'non_compliant' | 'partial' | 'pending';
}
export interface ComplianceControl {
    controlId: string;
    controlName: string;
    description: string;
    status: 'implemented' | 'partial' | 'not_implemented' | 'not_applicable';
    evidenceCount: number;
    lastReviewDate: Date;
    nextReviewDate: Date;
    responsible: string;
}
export interface NonCompliantItem {
    controlId: string;
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    remediation: string;
    dueDate: Date;
    responsible: string;
}
export interface ThreatIntelligence {
    threatId: string;
    threatType: 'malware' | 'phishing' | 'bruteforce' | 'ddos' | 'insider' | 'supply_chain';
    severity: ThreatLevel;
    indicators: string[];
    mitigations: string[];
    lastUpdated: Date;
    source: string;
}
export interface SecurityMetrics {
    authenticationFailures: number;
    blockedRequests: number;
    encryptionOperations: number;
    auditEventsGenerated: number;
    threatsDetected: number;
    complianceScore: number;
    incidentCount: number;
    meanTimeToDetection: number;
    meanTimeToResponse: number;
}
export declare class SecurityService extends EventEmitter {
    private config;
    private encryptionKeys;
    private auditLog;
    private securityAlerts;
    private threatIntelligence;
    private complianceReports;
    private securityMetrics;
    private activeSessions;
    private blacklistedIPs;
    private rateLimiters;
    constructor(config: SecurityConfig);
    private initializeSecurity;
    encryptData(data: string | Buffer, keyId?: string, additionalData?: string): Promise<EncryptionResult>;
    decryptData(encryptionResult: EncryptionResult): Promise<string>;
    generateJWTToken(payload: any, expiresIn?: string): string;
    verifyJWTToken(token: string): any;
    hashPassword(password: string): Promise<string>;
    verifyPassword(password: string, hashedPassword: string): Promise<boolean>;
    logAuditEvent(event: Partial<AuditEvent>): void;
    getAuditEvents(filters?: {
        userId?: string;
        eventType?: AuditEventType;
        startDate?: Date;
        endDate?: Date;
        threatLevel?: ThreatLevel;
        limit?: number;
    }): AuditEvent[];
    exportAuditLogs(format?: 'json' | 'csv' | 'siem'): string;
    generateComplianceReport(standard: ComplianceStandard): Promise<ComplianceReport>;
    detectThreats(event: AuditEvent): Promise<ThreatIntelligence[]>;
    generateSecurityAlert(alertType: SecurityAlert['alertType'], severity: ThreatLevel, title: string, description: string, metadata?: Record<string, any>): SecurityAlert;
    getSecurityMetrics(): SecurityMetrics;
    private initializeEncryption;
    private getMasterKey;
    private rotateEncryptionKeys;
    private setupRateLimiters;
    private initializeThreatDetection;
    private loadComplianceFrameworks;
    private loadComplianceControls;
    private startSecurityMonitoring;
    private performSecurityScan;
    private validatePassword;
    private calculateRiskScore;
    private assessThreatLevel;
    private getComplianceFlags;
    private checkForSecurityAlerts;
    private assessComplianceControls;
    private calculateComplianceScore;
    private identifyNonCompliantItems;
    private generateComplianceRecommendations;
    private calculateOverallComplianceScore;
    private getRemediationSteps;
    private getAutomaticResponse;
    getStatus(): {
        securityLevel: SecurityLevel;
        encryptionAlgorithm: EncryptionAlgorithm;
        complianceStandards: ComplianceStandard[];
        activeKeys: number;
        auditEventsCount: number;
        securityAlertsCount: number;
        threatsDetected: number;
        metrics: SecurityMetrics;
    };
}
export default SecurityService;
//# sourceMappingURL=SecurityService.d.ts.map