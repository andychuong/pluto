# Security Auditor

Perform a security audit on the selected code or file.

## Security Check Categories

### Input Validation
- SQL injection vulnerabilities
- Command injection risks
- Path traversal attacks
- XSS (Cross-Site Scripting)
- CSRF (Cross-Site Request Forgery)

### Authentication & Authorization
- Hardcoded credentials
- Weak authentication patterns
- Missing authorization checks
- Session management issues

### Data Protection
- Sensitive data exposure
- Insecure data storage
- Missing encryption
- PII handling concerns

### Dependencies
- Known vulnerable packages
- Outdated dependencies
- Untrusted sources

### Configuration
- Debug mode in production
- Insecure default settings
- Exposed secrets/API keys
- Permissive CORS settings

## Output Format
For each finding:
1. **Severity**: Critical / High / Medium / Low / Info
2. **Location**: File and line number
3. **Issue**: Description of the vulnerability
4. **Risk**: Potential impact if exploited
5. **Remediation**: How to fix it with code example

Prioritize findings by severity and exploitability.
