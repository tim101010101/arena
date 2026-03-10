# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in Arena MCP, please report it by:

1. **Do NOT open a public issue**
2. Email the maintainers or use GitHub's private vulnerability reporting feature
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and work with you to address the issue.

## Security Best Practices

When using Arena MCP:

- **Never commit API keys** - Use environment variables
- **Validate all inputs** - Especially when accepting code or commands
- **Review agent outputs** - AI-generated content should be reviewed before execution
- **Limit agent permissions** - Use least-privilege principle for CLI tools
- **Monitor costs** - Set API rate limits and budgets
- **Keep dependencies updated** - Run `bun update` regularly

## Known Security Considerations

- Arena MCP executes external CLI commands - ensure you trust the agent CLIs you install
- Agent responses are not sanitized - review outputs before using in production
- Parallel mode can generate high API costs - monitor usage
- Session data is stored in memory - sensitive information is not persisted

## Disclosure Policy

- Security issues will be disclosed after a fix is available
- Credit will be given to reporters (unless they prefer to remain anonymous)
- We follow responsible disclosure practices
