## GitHub Copilot Chat

- Extension: 0.37.9 (prod)
- VS Code: 1.109.5 (072586267e68ece9a47aa43f8c108e0dcbf44622)
- OS: win32 10.0.26200 x64
- GitHub Account: nin-webapp2025

## Network

User Settings:
```json
  "http.systemCertificatesNode": true,
  "github.copilot.advanced.debug.useElectronFetcher": true,
  "github.copilot.advanced.debug.useNodeFetcher": false,
  "github.copilot.advanced.debug.useNodeFetchFetcher": true
```

Connecting to https://api.github.com:
- DNS ipv4 Lookup: 140.82.121.6 (35 ms)
- DNS ipv6 Lookup: Error (41 ms): getaddrinfo ENOTFOUND api.github.com
- Proxy URL: None (3 ms)
- Electron fetch (configured): HTTP 200 (560 ms)
- Node.js https: HTTP 200 (620 ms)
- Node.js fetch: HTTP 200 (185 ms)

Connecting to https://api.githubcopilot.com/_ping:
- DNS ipv4 Lookup: 140.82.113.22 (45 ms)
- DNS ipv6 Lookup: Error (42 ms): getaddrinfo ENOTFOUND api.githubcopilot.com
- Proxy URL: None (6 ms)
- Electron fetch (configured): HTTP 200 (814 ms)
- Node.js https: HTTP 200 (1154 ms)
- Node.js fetch: HTTP 200 (788 ms)

Connecting to https://copilot-proxy.githubusercontent.com/_ping:
- DNS ipv4 Lookup: 20.250.119.64 (65 ms)
- DNS ipv6 Lookup: Error (379 ms): getaddrinfo ENOTFOUND copilot-proxy.githubusercontent.com
- Proxy URL: None (4 ms)
- Electron fetch (configured): HTTP 200 (611 ms)
- Node.js https: HTTP 200 (557 ms)
- Node.js fetch: HTTP 200 (658 ms)

Connecting to https://mobile.events.data.microsoft.com: HTTP 404 (241 ms)
Connecting to https://dc.services.visualstudio.com: HTTP 404 (877 ms)
Connecting to https://copilot-telemetry.githubusercontent.com/_ping: HTTP 200 (956 ms)
Connecting to https://copilot-telemetry.githubusercontent.com/_ping: HTTP 200 (794 ms)
Connecting to https://default.exp-tas.com: HTTP 400 (805 ms)

Number of system certificates: 95

## Documentation

In corporate networks: [Troubleshooting firewall settings for GitHub Copilot](https://docs.github.com/en/copilot/troubleshooting-github-copilot/troubleshooting-firewall-settings-for-github-copilot).