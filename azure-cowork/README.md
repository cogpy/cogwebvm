# Azure Cowork Cloud VM — ReZonAi Cognitive Infrastructure

## Overview

This module deploys a Windows 11 Pro VM on Azure with nested virtualisation, configured for running Claude Cowork as a persistent cloud workstation. It is the **physical substrate** for the ReZonAi cognitive tenant — the `d@rzo.ai` DevOps agent's primary execution environment.

**Target region:** South Africa North (Johannesburg)

**Why Azure:** Only major cloud provider with a South Africa region that supports nested virtualisation on general-purpose VMs. AWS Cape Town requires expensive `.metal` instances; GCP has no SA region.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Azure South Africa North                                                     │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Standard_D4s_v5  (4 vCPU / 16GB / 256GB Premium SSD)                │  │
│  │  Security Type: Standard (not Trusted Launch — required for Hyper-V)  │  │
│  │                                                                        │  │
│  │  Windows 11 Pro 24H2                                                  │  │
│  │  ├── Hyper-V / Virtual Machine Platform                               │  │
│  │  │   └── Cowork's internal Linux VM (sandboxed task execution)        │  │
│  │  │                                                                    │  │
│  │  ├── Claude Desktop App                                               │  │
│  │  │   ├── Chat tab                                                     │  │
│  │  │   ├── Cowork tab  ◄── primary use                                  │  │
│  │  │   └── Code tab                                                     │  │
│  │  │                                                                    │  │
│  │  ├── C:\CoworkData\                                                   │  │
│  │  │   ├── Projects/                                                    │  │
│  │  │   ├── Documents/                                                   │  │
│  │  │   ├── Research/                                                    │  │
│  │  │   ├── Legal/                                                       │  │
│  │  │   └── Exports/                                                     │  │
│  │  │                                                                    │  │
│  │  └── ReZonAi Tenant Integration                                       │  │
│  │      ├── Entra ID: rzo.ai domain (tenant 6a5b8c74)                   │  │
│  │      ├── SP Agents: 8 cognitive service principals                    │  │
│  │      ├── Graph API: d@rzo.ai DevOps-Agents group                     │  │
│  │      └── Cloudflare: rzo.ai zone email routing                       │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                    │                                                          │
│                    │ RDP (port 3389) — NSG locked to your IP                 │
└────────────────────┼─────────────────────────────────────────────────────────┘
                     │
              ┌──────┴──────┐
              │ Your laptop  │
              │ (RDP client) │
              └─────────────┘
```

---

## Cognitive Architecture Mapping

This VM maps to the ReZonAi tenant's cognitive architecture as follows:

| Cognitive Component | Mapping | Description |
|---------------------|---------|-------------|
| **User Agent** | `d@rzo.ai` | DevOps CI/CD & git sync agent |
| **Group** | DevOps-Agents | CI/CD and git sync agents |
| **SP Agent** | rzoai-ingestion | Data ingestion pipeline (KSM steps 4, 5) |
| **Memory System** | sensory-motor | Raw signals, API responses |
| **KSM Role** | Infrastructure substrate | Physical compute for Autogenesis |
| **Autogenesis** | Self-creating capability | VM can deploy new agents, run pipelines |

The VM serves as the **physical body** of the cognitive organism — the hardware substrate through which the Autogenesis-Creators group (`j@rzo.ai`, `o@rzo.ai`, `d@rzo.ai`) can execute self-modifying operations on the tenant.

---

## Files

| File | Purpose |
|------|---------|
| `azuredeploy.json` | ARM template — provisions VM, networking, NSG, auto-shutdown |
| `deploy.sh` | Bash wrapper — one-command Azure CLI deployment |
| `Setup-CoworkVM.ps1` | PowerShell — runs inside VM to enable Hyper-V, create workspace, optimise |
| `scripts/rzoai-entra-join.ps1` | PowerShell — joins VM to ReZonAi Entra ID tenant |
| `scripts/rzoai-graph-bootstrap.py` | Python — bootstraps Graph API connectivity from inside VM |
| `scripts/rzoai-cloudflare-dns.sh` | Bash — registers VM hostname in rzo.ai Cloudflare zone |
| `README.md` | This guide |

---

## Deployment

### Quick Start (Azure CLI)

```bash
# 1. Login to Azure
az login

# 2. Deploy the VM
chmod +x deploy.sh
./deploy.sh cowork-rg "YourP@ssw0rd!Here"

# 3. Wait ~5 minutes, then RDP in using the printed connection details

# 4. Inside the VM (PowerShell as Admin):
.\Setup-CoworkVM.ps1 -InstallClaude

# 5. After reboot, run ReZonAi integration:
.\scripts\rzoai-entra-join.ps1
```

### ARM Template via Portal

1. Go to **portal.azure.com** > Deploy a custom template
2. Paste contents of `azuredeploy.json`
3. Set region to **South Africa North**
4. **CRITICAL:** Security type must be **Standard** (not Trusted Launch)
5. Fill parameters, deploy

---

## VM Size Guide

| Size | vCPU | RAM | Monthly (24/7) | Monthly (10h/day) | Best for |
|------|------|-----|-----------------|---------------------|----------|
| Standard_D4s_v3 | 4 | 16 GB | ~R3,200 | ~R1,350 | Budget option, older gen |
| **Standard_D4s_v5** | **4** | **16 GB** | **~R3,000** | **~R1,250** | **Recommended default** |
| Standard_D8s_v5 | 8 | 32 GB | ~R6,000 | ~R2,500 | Heavy parallel agents |
| Standard_E4s_v5 | 4 | 32 GB | ~R3,800 | ~R1,600 | Memory-intensive tasks |

Prices are estimates in ZAR for South Africa North. Auto-shutdown at 23:00 SAST is enabled by default.

---

## Cost Control

```bash
# Stop and deallocate (stops compute billing; disk storage still charged)
az vm deallocate --resource-group cowork-rg --name cowork-vm

# Start when needed
az vm start --resource-group cowork-rg --name cowork-vm

# Nuclear option — delete everything
az group delete --name cowork-rg --yes --no-wait
```

**Tip:** 10h/day, 22 days/month = roughly 40% of 24/7 cost.

---

## ReZonAi Tenant Integration

### Entra ID Join

The `rzoai-entra-join.ps1` script registers the VM with the ReZonAi Entra ID tenant, enabling:

- Single sign-on via `d@rzo.ai` credentials
- Conditional access policy enforcement
- Device compliance reporting to Autognosis-Observers
- Membership in DevOps-Agents group for scoped permissions

### Graph API Bootstrap

The `rzoai-graph-bootstrap.py` script establishes Graph API connectivity from inside the VM:

- Authenticates using the `rzoai-ingestion` SP agent credentials
- Verifies connectivity to all 18 user agents and 8 SP agents
- Tests mail send capability via `rzoai-clawcog`
- Reports health status to `rzoai-autognosis` for KSM step 1 (Perceive)

### Cloudflare DNS Registration

The `rzoai-cloudflare-dns.sh` script registers the VM's public IP in the rzo.ai Cloudflare zone:

- Creates an A record: `vm.rzo.ai` → VM public IP
- Enables Cloudflare proxy for DDoS protection
- Configures SSL/TLS in Full (Strict) mode

---

## Security

### NSG Hardening

The deployment script automatically locks RDP to your current IP. If your IP changes:

```bash
az network nsg rule update \
    --resource-group cowork-rg \
    --nsg-name cowork-vm-nsg \
    --name Allow-RDP \
    --source-address-prefixes "YOUR.IP.HERE/32"
```

### Azure Bastion (Optional)

For RDP without public IP exposure (~R750/month additional):

```bash
az network vnet subnet create \
    --resource-group cowork-rg \
    --vnet-name cowork-vm-vnet \
    --name AzureBastionSubnet \
    --address-prefixes 10.0.1.0/26

az network bastion create \
    --resource-group cowork-rg \
    --name cowork-bastion \
    --vnet-name cowork-vm-vnet \
    --location southafricanorth
```

---

## Troubleshooting

### Cowork sandbox error

```powershell
# Verify virtualisation is exposed
(Get-CimInstance Win32_Processor).VirtualizationFirmwareEnabled  # Should be True

# Verify VMP is enabled
(Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform).State  # Should be Enabled

# Reset Cowork VM bundle if needed
Remove-Item -Recurse -Force "$env:APPDATA\Claude\vm_bundles"
```

### Security type error

If Hyper-V cannot be installed — you deployed with Trusted Launch instead of Standard. Must recreate the VM.

### Claude Desktop installer fails

Use MSIX sideload approach:
```powershell
Add-AppxPackage -Path "C:\path\to\Claude.msix"
```

---

## Template Adaptability

This blueprint is designed as a **generalised template** that can be adapted for various use cases:

| Variant | Modification | Use Case |
|---------|-------------|----------|
| **Cowork Workstation** | Default config | Daily Claude Cowork cloud desktop |
| **CI/CD Runner** | Remove RDP, add GitHub Actions runner | Automated pipeline execution |
| **Reservoir Compute** | Upgrade to E8s_v5 (64GB) | ReservoirPy ESN training |
| **Multi-Agent Hub** | D8s_v5 + data disk | Run multiple cognitive agents |
| **AVD Host** | Add AVD host pool config | Azure Virtual Desktop for team |

---

*Blueprint version: 1.0 — 2026-03-12*
*ReZonAi tenant integration: Phase 5 (AVD/DevOps Infrastructure)*
