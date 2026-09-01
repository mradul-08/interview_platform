# Security policy

## Reporting a vulnerability

Please do not open a public issue for a suspected security vulnerability. Contact the repository owner privately through the GitHub security contact or repository owner account with:

- a short description of the issue
- affected routes, components, or dependencies
- reproduction steps or a minimal proof of concept
- the potential impact

Allow reasonable time for investigation and remediation before public disclosure. Never include passwords, tokens, private keys, database URLs, or personal user data in a report.

## Security expectations

Code execution depends on Docker isolation. Review changes to execution limits, container arguments, file handling, authentication, authorization, CORS, uploads, and environment-variable handling carefully.
