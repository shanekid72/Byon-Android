"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const events_1 = require("events");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger = {
    info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
    error: (msg, error) => console.error(`[ERROR] ${msg}`, error || ''),
    warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ''),
    debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta || ''),
    audit: (action, userId, details) => {
        console.log(`[AUDIT] ${action} by ${userId}:`, details);
    }
};
class SecurityService extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.encryptionKeys = new Map();
        this.auditLog = [];
        this.securityAlerts = [];
        this.threatIntelligence = new Map();
        this.complianceReports = new Map();
        this.activeSessions = new Map();
        this.blacklistedIPs = new Set();
        this.rateLimiters = new Map();
        this.securityMetrics = {
            authenticationFailures: 0,
            blockedRequests: 0,
            encryptionOperations: 0,
            auditEventsGenerated: 0,
            threatsDetected: 0,
            complianceScore: 0,
            incidentCount: 0,
            meanTimeToDetection: 0,
            meanTimeToResponse: 0
        };
        this.initializeSecurity();
    }
    async initializeSecurity() {
        logger.info('Initializing enterprise security service');
        try {
            await this.initializeEncryption();
            this.setupRateLimiters();
            if (this.config.enableThreatDetection) {
                await this.initializeThreatDetection();
            }
            await this.loadComplianceFrameworks();
            this.startSecurityMonitoring();
            logger.info('Enterprise security service initialized successfully');
            this.emit('securityInitialized');
        }
        catch (error) {
            logger.error('Failed to initialize security service:', error);
            throw error;
        }
    }
    async encryptData(data, keyId, additionalData) {
        try {
            const algorithm = this.config.encryptionAlgorithm;
            const key = keyId ? this.encryptionKeys.get(keyId) : this.getMasterKey();
            if (!key) {
                throw new Error(`Encryption key not found: ${keyId}`);
            }
            let encryptedData;
            let iv;
            let authTag;
            const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
            switch (algorithm) {
                case 'aes-256-gcm':
                    const ivBuffer = crypto_1.default.randomBytes(16);
                    const cipher = crypto_1.default.createCipher(algorithm, key);
                    cipher.setAAD(Buffer.from(additionalData || '', 'utf8'));
                    let encrypted = cipher.update(dataBuffer);
                    encrypted = Buffer.concat([encrypted, cipher.final()]);
                    iv = ivBuffer.toString('hex');
                    authTag = cipher.getAuthTag().toString('hex');
                    encryptedData = encrypted.toString('hex');
                    break;
                case 'aes-256-cbc':
                    const ivCbc = crypto_1.default.randomBytes(16);
                    const cipherCbc = crypto_1.default.createCipher(algorithm, key);
                    let encryptedCbc = cipherCbc.update(dataBuffer);
                    encryptedCbc = Buffer.concat([encryptedCbc, cipherCbc.final()]);
                    iv = ivCbc.toString('hex');
                    authTag = '';
                    encryptedData = encryptedCbc.toString('hex');
                    break;
                default:
                    throw new Error(`Unsupported encryption algorithm: ${algorithm}`);
            }
            this.securityMetrics.encryptionOperations++;
            const result = {
                encryptedData,
                iv,
                authTag,
                algorithm,
                keyId: keyId || 'master'
            };
            this.logAuditEvent({
                eventType: 'api_access',
                userId: 'system',
                resource: 'encryption',
                action: 'encrypt_data',
                result: 'success',
                details: { algorithm, keyId }
            });
            return result;
        }
        catch (error) {
            logger.error('Data encryption failed:', error);
            this.securityMetrics.encryptionOperations++;
            throw error;
        }
    }
    async decryptData(encryptionResult) {
        try {
            const { encryptedData, iv, authTag, algorithm, keyId } = encryptionResult;
            const key = this.encryptionKeys.get(keyId) || this.getMasterKey();
            if (!key) {
                throw new Error(`Decryption key not found: ${keyId}`);
            }
            let decryptedData;
            switch (algorithm) {
                case 'aes-256-gcm':
                    const decipher = crypto_1.default.createDecipher(algorithm, key);
                    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
                    let decrypted = decipher.update(Buffer.from(encryptedData, 'hex'));
                    decrypted = Buffer.concat([decrypted, decipher.final()]);
                    decryptedData = decrypted;
                    break;
                case 'aes-256-cbc':
                    const decipherCbc = crypto_1.default.createDecipher(algorithm, key);
                    let decryptedCbc = decipherCbc.update(Buffer.from(encryptedData, 'hex'));
                    decryptedCbc = Buffer.concat([decryptedCbc, decipherCbc.final()]);
                    decryptedData = decryptedCbc;
                    break;
                default:
                    throw new Error(`Unsupported decryption algorithm: ${algorithm}`);
            }
            this.logAuditEvent({
                eventType: 'api_access',
                userId: 'system',
                resource: 'encryption',
                action: 'decrypt_data',
                result: 'success',
                details: { algorithm, keyId }
            });
            return decryptedData.toString('utf8');
        }
        catch (error) {
            logger.error('Data decryption failed:', error);
            throw error;
        }
    }
    generateJWTToken(payload, expiresIn) {
        try {
            const token = jsonwebtoken_1.default.sign(payload, this.config.authentication.jwtSecret, {
                expiresIn: expiresIn || this.config.authentication.jwtExpiresIn,
                issuer: 'lulupay-security-service',
                audience: 'lulupay-platform'
            });
            this.logAuditEvent({
                eventType: 'authentication',
                userId: payload.userId || 'unknown',
                resource: 'jwt',
                action: 'generate_token',
                result: 'success',
                details: { expiresIn }
            });
            return token;
        }
        catch (error) {
            logger.error('JWT token generation failed:', error);
            throw error;
        }
    }
    verifyJWTToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.config.authentication.jwtSecret);
            this.logAuditEvent({
                eventType: 'authentication',
                userId: decoded.userId || 'unknown',
                resource: 'jwt',
                action: 'verify_token',
                result: 'success',
                details: { tokenAge: Date.now() - (decoded.iat * 1000) }
            });
            return decoded;
        }
        catch (error) {
            this.securityMetrics.authenticationFailures++;
            this.logAuditEvent({
                eventType: 'authentication',
                userId: 'unknown',
                resource: 'jwt',
                action: 'verify_token',
                result: 'failure',
                details: { error: error.message }
            });
            throw error;
        }
    }
    async hashPassword(password) {
        try {
            this.validatePassword(password);
            const saltRounds = this.config.securityLevel === 'maximum' ? 15 : 12;
            const hashedPassword = await bcrypt_1.default.hash(password, saltRounds);
            return hashedPassword;
        }
        catch (error) {
            logger.error('Password hashing failed:', error);
            throw error;
        }
    }
    async verifyPassword(password, hashedPassword) {
        try {
            const isValid = await bcrypt_1.default.compare(password, hashedPassword);
            if (!isValid) {
                this.securityMetrics.authenticationFailures++;
            }
            return isValid;
        }
        catch (error) {
            logger.error('Password verification failed:', error);
            this.securityMetrics.authenticationFailures++;
            return false;
        }
    }
    logAuditEvent(event) {
        try {
            const auditEvent = {
                id: crypto_1.default.randomUUID(),
                timestamp: new Date(),
                eventType: event.eventType,
                userId: event.userId,
                userAgent: event.userAgent,
                ipAddress: event.ipAddress,
                resource: event.resource,
                action: event.action,
                result: event.result,
                details: event.details || {},
                riskScore: this.calculateRiskScore(event),
                threatLevel: this.assessThreatLevel(event),
                complianceFlags: this.getComplianceFlags(event)
            };
            this.auditLog.push(auditEvent);
            this.securityMetrics.auditEventsGenerated++;
            this.checkForSecurityAlerts(auditEvent);
            this.emit('auditEvent', auditEvent);
            logger.audit(auditEvent.action, auditEvent.userId, auditEvent.details);
        }
        catch (error) {
            logger.error('Failed to log audit event:', error);
        }
    }
    getAuditEvents(filters = {}) {
        let events = [...this.auditLog];
        if (filters.userId) {
            events = events.filter(e => e.userId === filters.userId);
        }
        if (filters.eventType) {
            events = events.filter(e => e.eventType === filters.eventType);
        }
        if (filters.startDate) {
            events = events.filter(e => e.timestamp >= filters.startDate);
        }
        if (filters.endDate) {
            events = events.filter(e => e.timestamp <= filters.endDate);
        }
        if (filters.threatLevel) {
            events = events.filter(e => e.threatLevel === filters.threatLevel);
        }
        events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        if (filters.limit) {
            events = events.slice(0, filters.limit);
        }
        return events;
    }
    exportAuditLogs(format = 'json') {
        const events = this.auditLog;
        switch (format) {
            case 'json':
                return JSON.stringify(events, null, 2);
            case 'csv':
                const headers = ['id', 'timestamp', 'eventType', 'userId', 'resource', 'action', 'result', 'riskScore', 'threatLevel'];
                const rows = events.map(e => headers.map(h => e[h]));
                return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            case 'siem':
                return events.map(e => `${e.timestamp.toISOString()} ${e.eventType} ${e.userId} ${e.action} ${e.result}`).join('\n');
            default:
                return JSON.stringify(events, null, 2);
        }
    }
    async generateComplianceReport(standard) {
        try {
            logger.info(`Generating compliance report for ${standard}`);
            const controls = await this.assessComplianceControls(standard);
            const overallScore = this.calculateComplianceScore(controls);
            const nonCompliantItems = this.identifyNonCompliantItems(controls);
            const recommendations = this.generateComplianceRecommendations(standard, controls);
            const report = {
                standard,
                reportDate: new Date(),
                overallScore,
                controls,
                recommendations,
                nonCompliantItems,
                certificationStatus: overallScore >= 90 ? 'compliant' : overallScore >= 70 ? 'partial' : 'non_compliant'
            };
            this.complianceReports.set(standard, report);
            this.logAuditEvent({
                eventType: 'security_event',
                userId: 'system',
                resource: 'compliance',
                action: 'generate_report',
                result: 'success',
                details: { standard, score: overallScore }
            });
            return report;
        }
        catch (error) {
            logger.error(`Failed to generate compliance report for ${standard}:`, error);
            throw error;
        }
    }
    async detectThreats(event) {
        const threats = [];
        try {
            if (event.eventType === 'login' && event.result === 'failure') {
                const recentFailures = this.auditLog.filter(e => e.eventType === 'login' &&
                    e.result === 'failure' &&
                    e.userId === event.userId &&
                    e.timestamp.getTime() > Date.now() - 300000).length;
                if (recentFailures >= 5) {
                    threats.push({
                        threatId: crypto_1.default.randomUUID(),
                        threatType: 'bruteforce',
                        severity: 'high',
                        indicators: [`Multiple login failures for user ${event.userId}`],
                        mitigations: ['Lock account', 'Require MFA', 'Monitor IP address'],
                        lastUpdated: new Date(),
                        source: 'internal_detection'
                    });
                }
            }
            if (event.eventType === 'api_access') {
                const recentApiCalls = this.auditLog.filter(e => e.eventType === 'api_access' &&
                    e.userId === event.userId &&
                    e.timestamp.getTime() > Date.now() - 3600000).length;
                if (recentApiCalls >= 1000) {
                    threats.push({
                        threatId: crypto_1.default.randomUUID(),
                        threatType: 'ddos',
                        severity: 'medium',
                        indicators: [`Excessive API calls from user ${event.userId}`],
                        mitigations: ['Apply rate limiting', 'Monitor patterns', 'Block if necessary'],
                        lastUpdated: new Date(),
                        source: 'internal_detection'
                    });
                }
            }
            threats.forEach(threat => {
                this.threatIntelligence.set(threat.threatId, threat);
                this.securityMetrics.threatsDetected++;
            });
            return threats;
        }
        catch (error) {
            logger.error('Threat detection failed:', error);
            return threats;
        }
    }
    generateSecurityAlert(alertType, severity, title, description, metadata = {}) {
        const alert = {
            id: crypto_1.default.randomUUID(),
            timestamp: new Date(),
            alertType,
            severity,
            title,
            description,
            remediationSteps: this.getRemediationSteps(alertType, severity),
            automaticResponse: this.getAutomaticResponse(alertType, severity),
            metadata
        };
        this.securityAlerts.push(alert);
        this.emit('securityAlert', alert);
        logger.warn(`Security alert generated: ${title}`, { severity, alertType });
        return alert;
    }
    getSecurityMetrics() {
        this.securityMetrics.complianceScore = this.calculateOverallComplianceScore();
        this.securityMetrics.incidentCount = this.securityAlerts.filter(a => a.severity === 'high' || a.severity === 'critical').length;
        return { ...this.securityMetrics };
    }
    async initializeEncryption() {
        const masterKey = Buffer.from(this.config.encryption.masterKey, 'hex');
        this.encryptionKeys.set('master', masterKey);
        if (this.config.encryption.keyRotationInterval > 0) {
            setInterval(() => {
                this.rotateEncryptionKeys();
            }, this.config.encryption.keyRotationInterval * 3600000);
        }
    }
    getMasterKey() {
        return this.encryptionKeys.get('master');
    }
    async rotateEncryptionKeys() {
        logger.info('Rotating encryption keys');
        const newMasterKey = crypto_1.default.randomBytes(32);
        this.encryptionKeys.set('master', newMasterKey);
        this.logAuditEvent({
            eventType: 'security_event',
            userId: 'system',
            resource: 'encryption',
            action: 'rotate_keys',
            result: 'success',
            details: {}
        });
    }
    setupRateLimiters() {
        const rateLimitConfig = this.config.rateLimit;
        this.rateLimiters.set('api', (0, express_rate_limit_1.default)({
            windowMs: rateLimitConfig.windowMs,
            max: rateLimitConfig.maxRequests,
            message: 'Too many requests from this IP'
        }));
        this.rateLimiters.set('auth', (0, express_rate_limit_1.default)({
            windowMs: 15 * 60 * 1000,
            max: 5,
            message: 'Too many authentication attempts'
        }));
    }
    async initializeThreatDetection() {
        logger.info('Initializing threat detection system');
        this.on('auditEvent', async (event) => {
            const threats = await this.detectThreats(event);
            if (threats.length > 0) {
                threats.forEach(threat => {
                    this.generateSecurityAlert('threat', threat.severity, `${threat.threatType} detected`, threat.indicators.join(', '), { threatId: threat.threatId });
                });
            }
        });
    }
    async loadComplianceFrameworks() {
        for (const standard of this.config.complianceStandards) {
            const controls = await this.loadComplianceControls(standard);
        }
    }
    async loadComplianceControls(standard) {
        return [];
    }
    startSecurityMonitoring() {
        setInterval(() => {
            this.performSecurityScan();
        }, 3600000);
    }
    async performSecurityScan() {
        logger.debug('Performing periodic security scan');
    }
    validatePassword(password) {
        const policy = this.config.authentication.passwordPolicy;
        if (password.length < policy.minLength) {
            throw new Error(`Password must be at least ${policy.minLength} characters long`);
        }
        if (policy.requireUppercase && !/[A-Z]/.test(password)) {
            throw new Error('Password must contain at least one uppercase letter');
        }
        if (policy.requireLowercase && !/[a-z]/.test(password)) {
            throw new Error('Password must contain at least one lowercase letter');
        }
        if (policy.requireNumbers && !/\d/.test(password)) {
            throw new Error('Password must contain at least one number');
        }
        if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            throw new Error('Password must contain at least one special character');
        }
    }
    calculateRiskScore(event) {
        let score = 0;
        switch (event.eventType) {
            case 'login':
                score += event.result === 'failure' ? 30 : 10;
                break;
            case 'asset_upload':
                score += 20;
                break;
            case 'config_change':
                score += 40;
                break;
            case 'api_access':
                score += 5;
                break;
            default:
                score += 10;
        }
        if (event.result === 'failure' || event.result === 'blocked') {
            score += 20;
        }
        return Math.min(score, 100);
    }
    assessThreatLevel(event) {
        const riskScore = this.calculateRiskScore(event);
        if (riskScore >= 80)
            return 'critical';
        if (riskScore >= 60)
            return 'high';
        if (riskScore >= 30)
            return 'medium';
        return 'low';
    }
    getComplianceFlags(event) {
        const flags = [];
        if (event.eventType === 'asset_upload' || event.eventType === 'asset_download') {
            flags.push('SOC2', 'ISO27001');
        }
        if (event.eventType === 'authentication') {
            flags.push('SOC2', 'ISO27001', 'PCI_DSS');
        }
        return flags;
    }
    checkForSecurityAlerts(event) {
        if (event.threatLevel === 'high' || event.threatLevel === 'critical') {
            this.generateSecurityAlert('anomaly', event.threatLevel, 'High-risk activity detected', `Event: ${event.action} by ${event.userId}`, { eventId: event.id });
        }
    }
    async assessComplianceControls(standard) {
        return [];
    }
    calculateComplianceScore(controls) {
        if (controls.length === 0)
            return 0;
        const implemented = controls.filter(c => c.status === 'implemented').length;
        return Math.round((implemented / controls.length) * 100);
    }
    identifyNonCompliantItems(controls) {
        return controls
            .filter(c => c.status !== 'implemented')
            .map(c => ({
            controlId: c.controlId,
            issue: `Control ${c.controlName} is not fully implemented`,
            severity: 'medium',
            remediation: 'Implement required control measures',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            responsible: c.responsible
        }));
    }
    generateComplianceRecommendations(standard, controls) {
        return [
            'Implement regular security awareness training',
            'Conduct periodic vulnerability assessments',
            'Enhance incident response procedures',
            'Improve access control mechanisms',
            'Strengthen data encryption practices'
        ];
    }
    calculateOverallComplianceScore() {
        if (this.complianceReports.size === 0)
            return 0;
        const scores = Array.from(this.complianceReports.values()).map(r => r.overallScore);
        return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    }
    getRemediationSteps(alertType, severity) {
        const steps = [];
        switch (alertType) {
            case 'authentication':
                steps.push('Review authentication logs', 'Check user account status', 'Verify IP address');
                break;
            case 'threat':
                steps.push('Isolate affected systems', 'Analyze threat indicators', 'Update security controls');
                break;
            case 'compliance':
                steps.push('Review compliance requirements', 'Update policies', 'Train staff');
                break;
            default:
                steps.push('Investigate incident', 'Document findings', 'Update security measures');
        }
        if (severity === 'critical') {
            steps.unshift('Immediate escalation required');
        }
        return steps;
    }
    getAutomaticResponse(alertType, severity) {
        if (severity === 'critical') {
            switch (alertType) {
                case 'authentication':
                    return 'Account temporarily locked';
                case 'threat':
                    return 'IP address blocked';
                default:
                    return 'Incident logged for immediate review';
            }
        }
        return undefined;
    }
    getStatus() {
        return {
            securityLevel: this.config.securityLevel,
            encryptionAlgorithm: this.config.encryptionAlgorithm,
            complianceStandards: this.config.complianceStandards,
            activeKeys: this.encryptionKeys.size,
            auditEventsCount: this.auditLog.length,
            securityAlertsCount: this.securityAlerts.length,
            threatsDetected: this.threatIntelligence.size,
            metrics: this.getSecurityMetrics()
        };
    }
}
exports.SecurityService = SecurityService;
exports.default = SecurityService;
//# sourceMappingURL=SecurityService.js.map