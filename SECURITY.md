# Security

## Reporting a vulnerability

Please do **not** open a public GitHub issue for security vulnerabilities.

To report a security issue, contact the maintainer privately via GitHub:
[@shubhamjain2998](https://github.com/shubhamjain2998)

Include a description of the issue, reproduction steps, and the potential impact. You will receive a response within a reasonable timeframe.

## Known limitations

### JWT stored in localStorage

JWTs are currently stored in `localStorage`, which exposes them to XSS attacks. A migration to `httpOnly` cookies is planned to mitigate this risk. Track the work in the issue tracker once the tracking issue is created.
