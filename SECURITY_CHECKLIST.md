# OWASP Security Checklist for Development

Use this checklist when adding new features or endpoints to ensure OWASP compliance.

## Pre-Development

- [ ] Review OWASP Top 10 2021 for relevant threats
- [ ] Identify potential security risks before coding
- [ ] Plan rate limiting strategy if needed
- [ ] Identify all user inputs
- [ ] Plan authentication/authorization requirements
- [ ] Document security requirements

## Input Processing

- [ ] All user inputs validated using `validation.ts`
- [ ] Email inputs validated with `validateEmail()`
- [ ] Text inputs sanitized with `sanitizeContent()`
- [ ] URLs validated with `validateURL()` if applicable
- [ ] File inputs checked with `validateFileSize()` and `validateFileType()`
- [ ] JSON inputs validated with `validateJSON()`
- [ ] Input length limits enforced
- [ ] Special characters properly escaped
- [ ] No direct user input in database queries
- [ ] XSS prevention measures in place

## API Security

- [ ] Rate limiting implemented for endpoints
  - Use appropriate rate limiter (`apiRateLimiter`, `authRateLimiter`, etc.)
  - Choose appropriate request limits per user type
- [ ] Secure key management if using API keys
  - Initialize keys with `initializeSecureKeys()`
  - Retrieve keys with `getSecureKey()`
  - Never expose keys in logs or errors
- [ ] Security headers added via interceptor
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection enabled
- [ ] Error handling doesn't leak sensitive info
  - Use `getClientErrorMessage()` for client responses
  - Log full errors server-side only

## Authentication & Authorization

- [ ] Authentication required for sensitive operations
- [ ] Rate limiting on auth endpoints (5 attempts/15min)
- [ ] Password requirements enforced:
  - Minimum 8 characters
  - Uppercase, lowercase, number, special char
- [ ] Clear error messages (don't reveal if email exists)
- [ ] Session management secure
- [ ] Token/session expiration implemented
- [ ] User role/permissions validated
- [ ] Multi-user access properly isolated

## Database Security

- [ ] User ownership verified before data access
- [ ] Queries parameterized (Firebase handles this)
- [ ] User IDs included in all query filters
- [ ] Firestore security rules enforced
- [ ] No sensitive data in logs
- [ ] Proper indexing for query security

## Error Handling & Logging

- [ ] Try-catch blocks for all async operations
- [ ] Security events logged using `securityLogger`
  - Authentication attempts
  - Authorization failures
  - Validation errors
  - Rate limit violations
- [ ] Error messages safe for client display
- [ ] Sensitive data never logged
- [ ] Stack traces not exposed to users
- [ ] Comprehensive error information logged server-side

## Code Quality

- [ ] No hardcoded credentials or API keys
- [ ] No SQL/NoSQL injection vulnerabilities
- [ ] No command injection vulnerabilities
- [ ] No path traversal vulnerabilities
- [ ] Type safety enforced with TypeScript
- [ ] Unused variables/imports removed
- [ ] Comments don't expose security details

## Testing

- [ ] Unit tests for validation functions
- [ ] Rate limiting tested with multiple requests
- [ ] Input validation tested with edge cases
- [ ] Authentication flow tested
- [ ] Authorization tested
- [ ] Error handling tested
- [ ] Security headers verified
- [ ] Performance testing for rate limiting

## Deployment Security

- [ ] All secrets in `.env.local` (never committed)
- [ ] Firebase security rules reviewed
- [ ] API keys rotated before deployment
- [ ] HTTPS enabled in production
- [ ] Security headers enabled
- [ ] CORS properly configured
- [ ] Content Security Policy set
- [ ] Monitoring and alerting configured
- [ ] Incident response plan documented

## Code Review Checklist

When reviewing others' code:

- [ ] All inputs properly validated
- [ ] Rate limiting appropriate
- [ ] No exposed credentials
- [ ] Error messages safe
- [ ] Security logs added
- [ ] Authorization checks present
- [ ] SQL injection not possible
- [ ] XSS prevention in place
- [ ] CSRF tokens if needed
- [ ] Proper error handling
- [ ] Tests cover security scenarios

## Common Vulnerabilities to Prevent

### A01: Broken Access Control
- [ ] Verify user owns resource before allowing access
- [ ] Check user permissions for all operations
- [ ] Prevent privilege escalation
- [ ] Enforce principle of least privilege

### A02: Cryptographic Failures
- [ ] Use secure key management
- [ ] Never hardcode secrets
- [ ] Validate API keys before use
- [ ] Implement key rotation

### A03: Injection
- [ ] Validate all inputs
- [ ] Sanitize strings for output
- [ ] Use parameterized queries
- [ ] Encode special characters

### A05: Broken Access Control (repeated emphasis)
- [ ] Implement proper authorization checks
- [ ] Verify user identity
- [ ] Check user permissions
- [ ] Prevent IDOR vulnerabilities

### A07: Identification & Authentication Failures
- [ ] Enforce strong passwords
- [ ] Implement rate limiting on auth
- [ ] Use secure password storage
- [ ] Implement session timeouts

### A09: Logging & Monitoring Failures
- [ ] Log security events
- [ ] Monitor for attacks
- [ ] Alert on suspicious activity
- [ ] Retain logs for audit

### A10: Server-Side Request Forgery (SSRF)
- [ ] Validate URLs before use
- [ ] Restrict protocols to HTTPS
- [ ] Implement URL whitelist if needed
- [ ] Prevent open redirects

## Feature Completion Criteria

Before marking a feature as done:

- [ ] All security checklist items completed
- [ ] Security tests pass
- [ ] Code review approved
- [ ] Documentation complete
- [ ] SECURITY.md updated if needed
- [ ] Rate limits appropriate for feature
- [ ] Error messages user-friendly
- [ ] Logging configured
- [ ] Performance acceptable

## Security Issue Reporting

If you discover a security vulnerability:

1. **Do not** publicly disclose
2. Create an issue in the security channel (private)
3. Provide detailed description of vulnerability
4. Include steps to reproduce
5. Suggest potential fix
6. Follow incident response plan

## Resources

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- Project's [SECURITY.md](./SECURITY.md)

---

**Last Updated**: February 2026
**Next Review**: May 2026
