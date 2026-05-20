<div align="center">

# Inimatic

**Personal digital assistant environments built around AdaOS.**

[![AdaOS CI](https://github.com/inimatic/adaos/actions/workflows/ci.yml/badge.svg)](https://github.com/inimatic/adaos/actions/workflows/ci.yml)
[![Docs](https://img.shields.io/badge/docs-inimatic.github.io%2Fadaos-0f766e)](https://inimatic.github.io/adaos/)
[![App](https://img.shields.io/badge/app-inimatic.web.app-2563eb)](https://inimatic.web.app/)
[![Core](https://img.shields.io/badge/core-inimatic%2Fadaos-111827)](https://github.com/inimatic/adaos)

</div>

Inimatic builds **AdaOS**, an environment for personal digital assistants. AdaOS turns devices, agents, skills, applications, webspaces, and interfaces into one assistant environment while keeping the lower-level runtime machinery available for diagnostics, automation, and developer workflows.

## Start Here

| Surface | Link |
| --- | --- |
| Web app | [inimatic.web.app](https://inimatic.web.app/) |
| Documentation | [inimatic.github.io/adaos](https://inimatic.github.io/adaos/) |
| Core repository | [github.com/inimatic/adaos](https://github.com/inimatic/adaos) |
| API health | [api.inimatic.com/healthz](https://api.inimatic.com/healthz) |

## What We Build

| Layer | Role |
| --- | --- |
| AdaOS core | Runtime, SDK, CLI, bootstrap scripts, documentation, tests, and local developer workflows. |
| Web client | Angular/Ionic assistant interface, browser auth runtime, pairing flows, installed PWA profiles, and runtime configuration. |
| Backend services | Owner/browser auth, pairing APIs, Telegram and NATS integrations, Root bridge endpoints, and operational health surfaces. |
| Infrastructure | GHCR image builds, Firebase Hosting delivery, blue-green host deploys, and zonal API/app routing. |

## AdaOS Model

AdaOS is designed around a small core and extensible edges:

- an **Assistant** is the persistent user-facing environment
- **Webspaces** define access and projection contexts
- **Applications** are user-facing scenarios inside a webspace
- **Devices** are physical or virtual hosts
- **Agents** are software participants running on devices
- **Skills** implement integrations, automations, interface logic, and assistant behavior
- **SDK**, **CLI**, and **API** provide local control, diagnostics, and operational workflows

## Quick Start

```bash
git clone -b rev2026 https://github.com/inimatic/adaos.git
cd adaos
bash tools/bootstrap.sh
```

Windows bootstrap is available from PowerShell:

```powershell
& ([scriptblock]::Create((iwr -UseBasicParsing https://raw.githubusercontent.com/inimatic/adaos/rev2026/tools/init/windows/init.ps1).Content))
```

## Current Focus

- local and private assistant deployments
- distributed hub/member runtime topologies
- browser-based owner authentication and pairing
- skill and scenario development workflows
- dependable CI/CD for the public app, backend services, and infrastructure
