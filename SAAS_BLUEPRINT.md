# DATAQUERY AI — COMPLETE SAAS TRANSFORMATION BLUEPRINT

> **Version**: 1.0 | **Date**: June 2026 | **Status**: Strategic Blueprint
> **Current State**: Working MVP with 8 modules (React + FastAPI + SQLite)
> **Target State**: Enterprise-grade AI Data Intelligence Platform

---

## TABLE OF CONTENTS

1. [Phase 1: Product Strategy](#phase-1-product-strategy)
2. [Phase 2: SaaS Architecture](#phase-2-saas-architecture)
3. [Phase 3: User Management](#phase-3-user-management)
4. [Phase 4: Data Connectivity Platform](#phase-4-data-connectivity-platform)
5. [Phase 5: AI Data Analyst](#phase-5-ai-data-analyst)
6. [Phase 6: Dashboard Platform](#phase-6-dashboard-platform)
7. [Phase 7: Reporting Platform](#phase-7-reporting-platform)
8. [Phase 8: Knowledge Hub](#phase-8-knowledge-hub)
9. [Phase 9: Data Cleaning Engine](#phase-9-data-cleaning-engine)
10. [Phase 10: Automation Platform](#phase-10-automation-platform)
11. [Phase 11: AI Insights Engine](#phase-11-ai-insights-engine)
12. [Phase 12: Forecasting & Predictions](#phase-12-forecasting--predictions)
13. [Phase 13: Enterprise Features](#phase-13-enterprise-features)
14. [Phase 14: Billing & Monetization](#phase-14-billing--monetization)
15. [Phase 15: Modern UI/UX Redesign](#phase-15-modern-uiux-redesign)
16. [Phase 16: Product Roadmap](#phase-16-product-roadmap)

---

# PHASE 1: PRODUCT STRATEGY

## Product Vision

**"Make every business decision data-driven — no code, no complexity, no data team required."**

DataQuery AI is the world's first AI-native Data Intelligence Platform where anyone can upload data, ask questions in plain English, and get instant insights, dashboards, forecasts, and executive reports — all powered by AI.

## Mission Statement

To democratize data analytics by replacing the complexity of traditional BI tools with conversational AI, enabling every business professional to become their own data analyst.

## Unique Value Proposition

| Traditional BI (Power BI, Tableau) | DataQuery AI |
|-------------------------------------|-------------|
| Weeks to set up | Minutes to first insight |
| Requires trained analysts | Anyone can use it |
| Manual dashboard creation | AI auto-generates dashboards |
| Static reports | Dynamic, AI-powered reports |
| No document intelligence | Chat with PDFs, docs, knowledge bases |
| Separate ETL tools needed | Built-in data cleaning & automation |
| $70-150/user/month | Starting at $29/user/month |

**One-liner**: "ChatGPT meets Power BI — upload your data, ask questions, get answers."

## Target Customers

### Primary Segments

| Segment | Size | Pain Point | Willingness to Pay |
|---------|------|------------|---------------------|
| SMB Operations Teams | 50-500 employees | No dedicated analyst, data stuck in spreadsheets | $29-79/user/mo |
| Mid-Market Finance Teams | 500-5000 employees | Slow BI tools, manual reporting | $79-149/user/mo |
| Startup Growth Teams | 10-200 employees | Need insights without hiring data teams | $29-49/user/mo |
| Enterprise Data Teams | 5000+ employees | Augment analysts with AI, self-serve analytics | $149-299/user/mo |
| Consultants & Agencies | 1-50 people | Analyze client data quickly, generate reports | $49-99/user/mo |

### Ideal Customer Profile (ICP)

**Primary ICP**: Mid-market companies (200-2000 employees) with data spread across spreadsheets, databases, and SaaS tools, who cannot afford or cannot hire a full data team but need regular reporting and insights.

- **Title**: VP Operations, Finance Director, Head of Growth, COO
- **Budget**: $500-$5,000/month for analytics tooling
- **Current tools**: Excel, Google Sheets, maybe basic Metabase
- **Trigger event**: Board asks for better reporting, manual Excel reports taking too long
- **Decision criteria**: Speed to insight, ease of use, AI capabilities, price

## Key Differentiators

1. **AI-First Architecture**: Not a BI tool with AI bolted on — AI is the core interaction model
2. **Conversational Analytics**: Ask questions in English, get SQL + charts + insights
3. **Document Intelligence**: Unified platform for structured data AND unstructured documents
4. **Auto-Everything**: Auto-dashboards, auto-reports, auto-insights, auto-cleaning
5. **No-Code Automation**: Chain data workflows without engineering
6. **Proactive Insights**: AI alerts you to anomalies before you ask
7. **10x Faster Time-to-Insight**: Upload to insight in under 60 seconds

## Revenue Model

### SaaS Subscription + Usage-Based Hybrid

| Revenue Stream | Model | Target Contribution |
|---------------|-------|---------------------|
| Subscription Plans | Monthly/Annual per-user pricing | 70% |
| AI Query Credits | Usage-based for heavy AI users | 15% |
| Storage Overage | Per-GB beyond plan limits | 5% |
| Enterprise Add-ons | SSO, SAML, audit logs, SLA | 5% |
| Professional Services | Onboarding, custom connectors | 5% |

### Unit Economics Target

- **CAC**: < $300 (self-serve) / < $3,000 (sales-assisted)
- **ACV**: $1,200 (SMB) / $12,000 (Mid-Market) / $60,000+ (Enterprise)
- **LTV:CAC ratio**: > 5:1
- **Gross Margin**: > 75%
- **Net Revenue Retention**: > 110%

## Competitive Positioning

### Competitive Matrix

| Capability | DataQuery AI | Power BI | Tableau | Metabase | ThoughtSpot | ChatGPT Enterprise |
|-----------|-------------|----------|---------|----------|-------------|---------------------|
| AI-Native Analytics | ★★★★★ | ★★☆☆☆ | ★★☆☆☆ | ★☆☆☆☆ | ★★★★☆ | ★★★★★ |
| Natural Language Query | ★★★★★ | ★★★☆☆ | ★★☆☆☆ | ★☆☆☆☆ | ★★★★★ | ★★★★☆ |
| Ease of Setup | ★★★★★ | ★★☆☆☆ | ★★☆☆☆ | ★★★★☆ | ★★★☆☆ | ★★★★★ |
| Dashboard Builder | ★★★★☆ | ★★★★★ | ★★★★★ | ★★★★☆ | ★★★★☆ | ★☆☆☆☆ |
| Document Intelligence | ★★★★★ | ☆☆☆☆☆ | ☆☆☆☆☆ | ☆☆☆☆☆ | ☆☆☆☆☆ | ★★★★☆ |
| Data Cleaning | ★★★★★ | ★★☆☆☆ | ★★☆☆☆ | ☆☆☆☆☆ | ☆☆☆☆☆ | ★★☆☆☆ |
| Auto Dashboards | ★★★★★ | ★★☆☆☆ | ★★☆☆☆ | ☆☆☆☆☆ | ★★★☆☆ | ☆☆☆☆☆ |
| Report Generation | ★★★★★ | ★★★★☆ | ★★★☆☆ | ★★☆☆☆ | ★★☆☆☆ | ★★★☆☆ |
| Automation/Workflows | ★★★★☆ | ★★★☆☆ | ★☆☆☆☆ | ☆☆☆☆☆ | ★★☆☆☆ | ☆☆☆☆☆ |
| Forecasting/ML | ★★★★☆ | ★★★☆☆ | ★★★☆☆ | ☆☆☆☆☆ | ★★★☆☆ | ★★★☆☆ |
| Price (per user/mo) | $29-149 | $10-70 | $35-150 | Free-$85 | $95-250+ | $30 |
| Self-Serve Onboarding | ★★★★★ | ★★☆☆☆ | ★★☆☆☆ | ★★★★★ | ★★★☆☆ | ★★★★★ |

### How DataQuery AI Wins

**vs. Power BI**: Power BI requires DAX expertise, complex data modeling, and Microsoft ecosystem lock-in. DataQuery AI provides instant insights via natural language with zero learning curve. Win on: ease of use, AI depth, document intelligence.

**vs. Tableau**: Tableau is expensive ($75-150/user), requires training, and has weak AI capabilities. DataQuery AI auto-generates what Tableau users spend hours building manually. Win on: price, speed, AI automation.

**vs. Metabase**: Metabase is developer-focused, requires SQL knowledge, and has no AI capabilities. DataQuery AI serves the same self-serve ethos but with AI superpowers. Win on: AI analytics, document intelligence, reporting, automation.

**vs. ThoughtSpot**: ThoughtSpot pioneered NL analytics but costs $95+/user and targets only large enterprises. DataQuery AI offers similar AI capabilities at 1/3 the price, plus document intelligence and automation. Win on: price, broader feature set, SMB accessibility.

**vs. ChatGPT Enterprise**: ChatGPT is general-purpose — no persistent data connections, no dashboards, no scheduled reports, no team collaboration. DataQuery AI is purpose-built for analytics workflows. Win on: purpose-built features, data persistence, dashboards, automation.

---

# PHASE 2: SAAS ARCHITECTURE

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CDN (CloudFront / Vercel Edge)               │
│                              HTTPS / WSS                            │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                     FRONTEND (Angular 20+)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Analytics│ │   AI     │ │Dashboard │ │  Data    │ │  Admin   │ │
│  │ Module   │ │Assistant │ │ Builder  │ │  Mgmt    │ │  Panel   │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│  Angular Material / PrimeNG │ NgRx State │ RxJS │ Angular Signals  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ REST + WebSocket
┌──────────────────────────────▼──────────────────────────────────────┐
│                     API GATEWAY / LOAD BALANCER                     │
│                    (Kong / AWS ALB / Nginx)                         │
│          Rate Limiting │ Auth │ Routing │ SSL Termination           │
└──────┬─────────┬───────────┬──────────┬────────────┬───────────────┘
       │         │           │          │            │
┌──────▼───┐ ┌───▼─────┐ ┌──▼────┐ ┌───▼──────┐ ┌───▼──────┐
│ Auth     │ │ Core    │ │ AI    │ │ Data     │ │ Export   │
│ Service  │ │ API     │ │Engine │ │Connector │ │ Service  │
│ (FastAPI)│ │(FastAPI)│ │(Fast.)│ │ (Fast.)  │ │ (Fast.)  │
└──────┬───┘ └───┬─────┘ └──┬────┘ └───┬──────┘ └───┬──────┘
       │         │           │          │            │
┌──────▼─────────▼───────────▼──────────▼────────────▼───────────────┐
│                        SERVICE MESH / MESSAGE BUS                   │
│                     (Redis Pub/Sub / RabbitMQ / Celery)             │
└──────┬─────────┬───────────┬──────────┬────────────┬───────────────┘
       │         │           │          │            │
┌──────▼───┐ ┌───▼─────┐ ┌──▼────────┐ ┌▼──────────┐ ┌▼────────────┐
│PostgreSQL│ │ Redis   │ │ Vector DB │ │Object     │ │ Task Queue  │
│(Primary) │ │ (Cache) │ │(ChromaDB/ │ │Storage    │ │ (Celery +   │
│          │ │         │ │ Pinecone) │ │(S3/Azure) │ │  Redis)     │
└──────────┘ └─────────┘ └───────────┘ └───────────┘ └─────────────┘
```

## Multi-Tenant Data Isolation

```
┌─────────────────────────────────────────────┐
│              TENANT ISOLATION               │
│                                             │
│  Strategy: Schema-per-tenant (PostgreSQL)   │
│                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │ public  │  │tenant_a │  │tenant_b │    │
│  │ schema  │  │ schema  │  │ schema  │    │
│  │         │  │         │  │         │    │
│  │- users  │  │- sources│  │- sources│    │
│  │- tenants│  │- queries│  │- queries│    │
│  │- plans  │  │- dashbd │  │- dashbd │    │
│  │- billing│  │- reports│  │- reports│    │
│  └─────────┘  └─────────┘  └─────────┘    │
│                                             │
│  Row-Level Security (RLS) enforced at DB    │
│  Middleware sets search_path per request     │
└─────────────────────────────────────────────┘
```

## Project Folder Structure (Target)

```
dataquery-ai/
├── frontend/                          # Angular 20+ Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/                  # Singleton services, guards, interceptors
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.guard.ts
│   │   │   │   │   ├── auth.interceptor.ts
│   │   │   │   │   └── auth.service.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── api.service.ts
│   │   │   │   │   ├── websocket.service.ts
│   │   │   │   │   ├── theme.service.ts
│   │   │   │   │   └── notification.service.ts
│   │   │   │   └── interceptors/
│   │   │   │       ├── error.interceptor.ts
│   │   │   │       └── loading.interceptor.ts
│   │   │   ├── shared/                # Shared components, directives, pipes
│   │   │   │   ├── components/
│   │   │   │   │   ├── sidebar/
│   │   │   │   │   ├── navbar/
│   │   │   │   │   ├── data-table/
│   │   │   │   │   ├── chart-widget/
│   │   │   │   │   ├── file-upload/
│   │   │   │   │   ├── kpi-card/
│   │   │   │   │   └── chat-input/
│   │   │   │   ├── directives/
│   │   │   │   └── pipes/
│   │   │   ├── features/              # Lazy-loaded feature modules
│   │   │   │   ├── analytics/
│   │   │   │   │   ├── excel-analytics/
│   │   │   │   │   ├── sql-analytics/
│   │   │   │   │   └── api-analytics/
│   │   │   │   ├── ai-assistant/
│   │   │   │   │   ├── chat-with-data/
│   │   │   │   │   └── chat-with-documents/
│   │   │   │   ├── dashboards/
│   │   │   │   │   ├── dashboard-builder/
│   │   │   │   │   ├── dashboard-viewer/
│   │   │   │   │   └── widgets/
│   │   │   │   ├── reports/
│   │   │   │   │   ├── report-builder/
│   │   │   │   │   └── report-viewer/
│   │   │   │   ├── data-management/
│   │   │   │   │   ├── data-cleaning/
│   │   │   │   │   ├── connectors/
│   │   │   │   │   └── datasets/
│   │   │   │   ├── automation/
│   │   │   │   │   ├── workflow-builder/
│   │   │   │   │   └── scheduled-jobs/
│   │   │   │   ├── knowledge-hub/
│   │   │   │   │   ├── document-chat/
│   │   │   │   │   └── knowledge-base/
│   │   │   │   └── admin/
│   │   │   │       ├── users/
│   │   │   │       ├── billing/
│   │   │   │       ├── workspace/
│   │   │   │       └── settings/
│   │   │   ├── layouts/
│   │   │   │   ├── auth-layout/
│   │   │   │   ├── app-layout/
│   │   │   │   └── public-layout/
│   │   │   ├── store/                 # NgRx state management
│   │   │   │   ├── auth/
│   │   │   │   ├── sources/
│   │   │   │   ├── dashboards/
│   │   │   │   └── notifications/
│   │   │   └── app.routes.ts
│   │   ├── assets/
│   │   ├── styles/
│   │   │   ├── themes/
│   │   │   │   ├── light.scss
│   │   │   │   └── dark.scss
│   │   │   └── globals.scss
│   │   └── environments/
│   ├── angular.json
│   ├── package.json
│   └── tailwind.config.js
│
├── backend/                           # Python FastAPI Backend
│   ├── app/
│   │   ├── main.py                    # FastAPI app entry
│   │   ├── config.py                  # Settings / env vars
│   │   ├── middleware/
│   │   │   ├── tenant.py              # Multi-tenant middleware
│   │   │   ├── rate_limit.py          # Rate limiting
│   │   │   └── cors.py               # CORS configuration
│   │   ├── auth/
│   │   │   ├── security.py            # JWT, OAuth2
│   │   │   ├── oauth_providers.py     # Google, Microsoft, GitHub OAuth
│   │   │   └── rbac.py               # Role-based access control
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── workspace.py
│   │   │   ├── source.py
│   │   │   ├── dashboard.py
│   │   │   ├── report.py
│   │   │   ├── connector.py
│   │   │   ├── workflow.py
│   │   │   ├── audit_log.py
│   │   │   └── billing.py
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── source.py
│   │   │   ├── query.py
│   │   │   ├── dashboard.py
│   │   │   ├── report.py
│   │   │   ├── connector.py
│   │   │   └── billing.py
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── sources.py
│   │   │   ├── query.py
│   │   │   ├── dashboard.py
│   │   │   ├── reports.py
│   │   │   ├── connectors.py
│   │   │   ├── export.py
│   │   │   ├── knowledge.py
│   │   │   ├── workflows.py
│   │   │   ├── insights.py
│   │   │   ├── admin.py
│   │   │   ├── billing.py
│   │   │   └── webhooks.py
│   │   ├── ai/
│   │   │   ├── query_engine.py        # NL → SQL/Pandas engine
│   │   │   ├── dashboard_engine.py    # Auto-dashboard generation
│   │   │   ├── report_engine.py       # AI report generation
│   │   │   ├── insights_engine.py     # Proactive insights
│   │   │   ├── forecast_engine.py     # ML forecasting
│   │   │   ├── cleaning_engine.py     # AI data cleaning
│   │   │   ├── rag_engine.py          # RAG for document chat
│   │   │   └── llm_router.py          # Multi-LLM provider router
│   │   ├── services/
│   │   │   ├── data_loader.py         # Multi-format file loader
│   │   │   ├── exporter.py            # Multi-format export
│   │   │   ├── store.py               # DataFrame cache
│   │   │   ├── connector_service.py   # Database connector manager
│   │   │   ├── email_service.py       # Transactional emails
│   │   │   ├── notification_service.py # Alerts (Slack, Teams, Email)
│   │   │   ├── scheduler_service.py   # Job scheduling (APScheduler)
│   │   │   └── storage_service.py     # S3/Azure blob abstraction
│   │   ├── database/
│   │   │   ├── db.py                  # SQLAlchemy engine
│   │   │   └── migrations/            # Alembic migrations
│   │   ├── workers/
│   │   │   ├── celery_app.py          # Celery configuration
│   │   │   ├── tasks/
│   │   │   │   ├── report_tasks.py
│   │   │   │   ├── insight_tasks.py
│   │   │   │   ├── workflow_tasks.py
│   │   │   │   └── ingestion_tasks.py
│   │   └── tests/
│   │       ├── test_auth.py
│   │       ├── test_query.py
│   │       ├── test_dashboard.py
│   │       └── test_connectors.py
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── Dockerfile
│   └── pyproject.toml
│
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.prod.yml
│   │   └── nginx/
│   │       └── nginx.conf
│   ├── kubernetes/
│   │   ├── namespace.yaml
│   │   ├── deployments/
│   │   │   ├── api.yaml
│   │   │   ├── worker.yaml
│   │   │   ├── redis.yaml
│   │   │   └── postgres.yaml
│   │   ├── services/
│   │   ├── ingress/
│   │   ├── configmaps/
│   │   └── secrets/
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── modules/
│   └── monitoring/
│       ├── prometheus/
│       ├── grafana/
│       └── alerts/
│
├── docs/
│   ├── api/                           # OpenAPI docs
│   ├── architecture/                  # Architecture decision records
│   └── runbooks/                      # Operations runbooks
│
├── .github/
│   └── workflows/
│       ├── ci.yml                     # Test + lint
│       ├── cd-staging.yml             # Deploy to staging
│       └── cd-production.yml          # Deploy to production
│
├── SAAS_BLUEPRINT.md                  # This document
└── README.md
```

## Technology Stack Summary

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend Framework | Angular 20+ | Enterprise-grade, strong typing, dependency injection, signals for reactivity |
| UI Components | Angular Material + PrimeNG | Rich widget library for dashboard builder |
| State Management | NgRx + Angular Signals | Predictable state for complex analytics UIs |
| Charts | Apache ECharts (ngx-echarts) | 50+ chart types, better heatmaps/gauges than Recharts |
| Drag & Drop | Angular CDK DragDrop | Native Angular drag-and-drop for dashboard builder |
| Backend Framework | FastAPI (Python) | Async, auto-docs, Pydantic validation, ML ecosystem |
| Task Queue | Celery + Redis | Async report generation, scheduled jobs, workflows |
| Primary DB | PostgreSQL 16 | JSONB, RLS, schemas for multi-tenancy |
| Cache | Redis 7 | Session cache, rate limiting, pub/sub for WebSocket |
| Vector DB | ChromaDB (dev) / Pinecone (prod) | RAG for document intelligence |
| Object Storage | AWS S3 / Azure Blob | File uploads, generated reports |
| AI Providers | OpenAI, Claude, Gemini (via router) | Multi-provider for reliability and cost optimization |
| Search | PostgreSQL Full-Text + pg_trgm | Good enough until scale demands Elasticsearch |
| Email | SendGrid / AWS SES | Transactional + scheduled report delivery |
| Monitoring | Prometheus + Grafana + Sentry | Metrics, dashboards, error tracking |
| CI/CD | GitHub Actions | Build, test, deploy pipeline |
| Container | Docker + Kubernetes | Scalable, reproducible deployments |
| Infrastructure | Terraform | Infrastructure as code |

---

# PHASE 3: USER MANAGEMENT

## Authentication Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   AUTHENTICATION FLOW                     │
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐   │
│  │  Email/  │    │  OAuth2  │    │  Enterprise SSO  │   │
│  │ Password │    │ Providers│    │  (SAML / OIDC)   │   │
│  └────┬─────┘    └────┬─────┘    └────────┬─────────┘   │
│       │               │                   │              │
│       ▼               ▼                   ▼              │
│  ┌─────────────────────────────────────────────────┐     │
│  │              AUTH SERVICE (FastAPI)              │     │
│  │                                                 │     │
│  │  POST /auth/signup          (email + password)  │     │
│  │  POST /auth/login           (email + password)  │     │
│  │  GET  /auth/oauth/google    (redirect)          │     │
│  │  GET  /auth/oauth/microsoft (redirect)          │     │
│  │  GET  /auth/oauth/github    (redirect)          │     │
│  │  POST /auth/oauth/callback  (token exchange)    │     │
│  │  POST /auth/saml/acs        (SAML assertion)    │     │
│  │  POST /auth/refresh         (refresh token)     │     │
│  │  POST /auth/forgot-password (email reset link)  │     │
│  │  POST /auth/reset-password  (new password)      │     │
│  │  POST /auth/verify-email    (email confirm)     │     │
│  └──────────────────────┬──────────────────────────┘     │
│                         │                                │
│                         ▼                                │
│  ┌─────────────────────────────────────────────────┐     │
│  │              TOKEN MANAGEMENT                   │     │
│  │                                                 │     │
│  │  Access Token:  JWT, 15 min TTL, in memory      │     │
│  │  Refresh Token: Opaque, 30 day TTL, httpOnly    │     │
│  │  Cookie:        httpOnly, Secure, SameSite=Lax  │     │
│  └─────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

## OAuth2 Provider Setup

| Provider | Protocol | Scopes | User Data Retrieved |
|----------|----------|--------|---------------------|
| Google | OAuth 2.0 + OIDC | openid, email, profile | Email, name, avatar |
| Microsoft | OAuth 2.0 + OIDC | openid, email, profile, User.Read | Email, name, org, avatar |
| GitHub | OAuth 2.0 | user:email, read:user | Email, name, avatar, username |

## Authorization: RBAC Model

```
┌────────────────────────────────────────────────────────────────┐
│                    ROLE HIERARCHY                               │
│                                                                │
│  Owner (Workspace Creator)                                     │
│  ├── Full workspace control                                    │
│  ├── Billing management                                        │
│  ├── Delete workspace                                          │
│  └── All Admin permissions                                     │
│                                                                │
│  Admin                                                         │
│  ├── Manage members (invite, remove, change roles)             │
│  ├── Manage connectors and data sources                        │
│  ├── Configure workspace settings                              │
│  ├── View audit logs                                           │
│  └── All Analyst permissions                                   │
│                                                                │
│  Analyst                                                       │
│  ├── Create/edit/delete own dashboards and reports              │
│  ├── Run queries on all data sources                           │
│  ├── Create workflows and automations                          │
│  ├── Upload data files                                         │
│  ├── Use AI assistant                                          │
│  └── All Editor permissions                                    │
│                                                                │
│  Editor                                                        │
│  ├── Edit shared dashboards (if granted)                       │
│  ├── Run queries on assigned data sources                      │
│  ├── Create reports from existing dashboards                   │
│  └── All Viewer permissions                                    │
│                                                                │
│  Viewer                                                        │
│  ├── View shared dashboards                                    │
│  ├── View shared reports                                       │
│  ├── Export visible data                                       │
│  └── Use AI assistant (read-only queries)                      │
└────────────────────────────────────────────────────────────────┘
```

### Permission Matrix

| Action | Owner | Admin | Analyst | Editor | Viewer |
|--------|-------|-------|---------|--------|--------|
| Manage billing | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete workspace | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage members | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage connectors | ✅ | ✅ | ❌ | ❌ | ❌ |
| View audit logs | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create data sources | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create dashboards | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create workflows | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit shared dashboards | ✅ | ✅ | ✅ | ✅ | ❌ |
| Run queries | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create reports | ✅ | ✅ | ✅ | ✅ | ❌ |
| View dashboards | ✅ | ✅ | ✅ | ✅ | ✅ |
| Export data | ✅ | ✅ | ✅ | ✅ | ✅ |
| Use AI chat (read-only) | ✅ | ✅ | ✅ | ✅ | ✅ |

## Workspace Management

```
┌─────────────────────────────────────────────────────────┐
│                  WORKSPACE MODEL                         │
│                                                         │
│  User ──────┬──── owns ────── Workspace (1:N)           │
│             │                    │                       │
│             └── member of ───── WorkspaceMember (M:N)    │
│                                  │                       │
│                                  ├── role (enum)         │
│                                  ├── invited_by          │
│                                  ├── invited_at          │
│                                  └── accepted_at         │
│                                                         │
│  Workspace                                               │
│  ├── id (UUID)                                           │
│  ├── name                                                │
│  ├── slug (URL-friendly)                                 │
│  ├── owner_id (FK → User)                                │
│  ├── plan (FK → Plan)                                    │
│  ├── settings (JSONB)                                    │
│  ├── created_at                                          │
│  └── schema_name (for DB isolation)                      │
│                                                         │
│  URL Pattern: app.dataquery.ai/{workspace-slug}/...      │
└─────────────────────────────────────────────────────────┘
```

### Workspace Features

- **Create workspace**: Any user can create up to N workspaces (plan-dependent)
- **Invite members**: Via email invitation link (7-day expiry)
- **Switch workspaces**: Dropdown in navbar for multi-workspace users
- **Workspace settings**: Name, default timezone, data retention, notification preferences
- **Transfer ownership**: Owner can transfer to another Admin

## Enterprise SSO

| Feature | Implementation |
|---------|---------------|
| SAML 2.0 | python3-saml library, IdP-initiated and SP-initiated |
| OIDC | Built on existing OAuth2 flow with custom IdP discovery |
| Active Directory | Via Azure AD B2C OIDC integration |
| SCIM Provisioning | SCIM 2.0 API for automated user provisioning/deprovisioning |
| JIT Provisioning | Auto-create user on first SSO login |
| Domain Verification | Verify domain ownership via DNS TXT record |
| Forced SSO | Enterprise can require SSO for all workspace members |

---

# PHASE 4: DATA CONNECTIVITY PLATFORM

## Connector Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA CONNECTIVITY LAYER                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              CONNECTOR REGISTRY                          │   │
│  │  Each connector implements: ConnectorInterface            │   │
│  │  ├── test_connection()  → bool                           │   │
│  │  ├── get_schemas()      → List[Schema]                   │   │
│  │  ├── get_tables()       → List[Table]                    │   │
│  │  ├── preview_data()     → DataFrame                      │   │
│  │  ├── execute_query()    → DataFrame                      │   │
│  │  └── sync_metadata()    → CatalogUpdate                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────────┐  │
│  │  DATABASE     │ │  CLOUD       │ │  BUSINESS APPS         │  │
│  │  CONNECTORS   │ │  STORAGE     │ │  CONNECTORS            │  │
│  │              │ │              │ │                        │  │
│  │ ● PostgreSQL │ │ ● AWS S3     │ │ ● Salesforce (REST)   │  │
│  │ ● MySQL      │ │ ● Azure Blob │ │ ● HubSpot (REST)     │  │
│  │ ● SQL Server │ │ ● GCS       │ │ ● Jira (REST)        │  │
│  │ ● Oracle     │ │ ● Google     │ │ ● Shopify (GraphQL)  │  │
│  │ ● MongoDB    │ │ │  Drive     │ │ ● Zendesk (REST)     │  │
│  │ ● Snowflake  │ │ ● Dropbox    │ │ ● Stripe (REST)      │  │
│  │ ● BigQuery   │ │ ● OneDrive   │ │ ● Google Analytics   │  │
│  │ ● Redshift   │ │              │ │ ● Custom REST API    │  │
│  │ ● SQLite     │ │              │ │ ● Custom GraphQL     │  │
│  └──────────────┘ └──────────────┘ └────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              FILE UPLOAD (EXISTING)                       │   │
│  │  CSV, Excel, JSON, JSONL, Parquet, TSV, XML, HTML,       │   │
│  │  PDF, DOCX, TXT, LOG                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Ingestion Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    DATA INGESTION PIPELINE                      │
│                                                                │
│  SOURCE ──► CONNECTOR ──► INGESTION WORKER ──► DATA STORE      │
│                                                                │
│  Step 1: Connection                                            │
│  ┌──────────────────────────────────────────┐                  │
│  │ User provides credentials (encrypted)    │                  │
│  │ System tests connection                  │                  │
│  │ Credentials stored in Vault/KMS          │                  │
│  └──────────────────────────────────────────┘                  │
│                                                                │
│  Step 2: Schema Discovery                                      │
│  ┌──────────────────────────────────────────┐                  │
│  │ Enumerate databases/schemas/tables       │                  │
│  │ Infer column types and relationships     │                  │
│  │ Store metadata in catalog                │                  │
│  └──────────────────────────────────────────┘                  │
│                                                                │
│  Step 3: Data Sync                                             │
│  ┌──────────────────────────────────────────┐                  │
│  │ Mode: Full Refresh or Incremental        │                  │
│  │ Schedule: Manual / Hourly / Daily        │                  │
│  │ Worker: Celery task with retry logic     │                  │
│  │ Storage: Parquet files in S3 + metadata  │                  │
│  └──────────────────────────────────────────┘                  │
│                                                                │
│  Step 4: Query Execution                                       │
│  ┌──────────────────────────────────────────┐                  │
│  │ Option A: Direct query (live connection) │                  │
│  │ Option B: Query cached Parquet (faster)  │                  │
│  │ AI engine operates on DataFrame either   │                  │
│  │ way (same interface)                     │                  │
│  └──────────────────────────────────────────┘                  │
└────────────────────────────────────────────────────────────────┘
```

## Connector Configuration Model

```python
# Database connector config (stored encrypted)
{
    "connector_type": "postgresql",
    "host": "db.example.com",
    "port": 5432,
    "database": "analytics",
    "username": "readonly_user",         # encrypted at rest
    "password": "***",                   # encrypted at rest, never returned in API
    "ssl_mode": "require",
    "ssh_tunnel": {                      # optional
        "host": "bastion.example.com",
        "port": 22,
        "username": "tunnel_user",
        "private_key": "***"             # encrypted
    },
    "sync_schedule": "0 */6 * * *",      # cron: every 6 hours
    "sync_mode": "incremental",
    "selected_tables": ["orders", "customers", "products"]
}
```

## Credential Security

| Concern | Solution |
|---------|----------|
| Storage | AES-256 encryption at rest, keys in AWS KMS / Azure Key Vault |
| Transit | TLS 1.3 for all connections |
| Access | Only the connector worker reads credentials; never returned via API |
| Rotation | Support for periodic credential rotation with zero-downtime |
| SSH Tunnels | Bastion host support for on-premise databases |
| IP Whitelisting | Static egress IPs for customer firewall rules |

---

# PHASE 5: AI DATA ANALYST

## AI Query Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AI DATA ANALYST WORKFLOW                         │
│                                                                     │
│  USER INPUT: "Analyze sales performance for Q1 2026"                │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ STEP 1: INTENT CLASSIFICATION                                │    │
│  │ LLM classifies intent:                                       │    │
│  │ ├── simple_query    → single operation                       │    │
│  │ ├── analysis        → multi-step exploration                 │    │
│  │ ├── comparison      → A vs B                                 │    │
│  │ ├── trend           → time-series analysis                   │    │
│  │ ├── anomaly         → outlier detection                      │    │
│  │ ├── forecast        → predictive model                       │    │
│  │ └── executive       → full report generation                 │    │
│  │                                                              │    │
│  │ Result: intent = "analysis"                                  │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                              │                                      │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │ STEP 2: SCHEMA AWARENESS                                    │    │
│  │ Load source metadata:                                        │    │
│  │ ├── Columns: [date, product, region, revenue, quantity, ...]  │    │
│  │ ├── Types:   [datetime, str, str, float, int, ...]           │    │
│  │ ├── Sample:  First 5 rows for context                        │    │
│  │ └── Stats:   Row count, date range, unique values            │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                              │                                      │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │ STEP 3: QUERY PLAN GENERATION                               │    │
│  │ LLM generates execution plan:                                │    │
│  │ [                                                            │    │
│  │   {"op": "filter", "col": "date", "range": "Q1 2026"},      │    │
│  │   {"op": "groupby", "by": ["product"], "agg": "sum"},       │    │
│  │   {"op": "sort", "by": "revenue", "order": "desc"},         │    │
│  │   {"op": "trend", "col": "revenue", "by": "month"},         │    │
│  │   {"op": "top", "col": "product", "n": 5}                   │    │
│  │ ]                                                            │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                              │                                      │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │ STEP 4: SAFE EXECUTION (Pandas)                             │    │
│  │ Execute each operation deterministically:                    │    │
│  │ ├── No eval(), no exec(), no arbitrary code                  │    │
│  │ ├── Sandboxed pandas operations only                         │    │
│  │ ├── Row limit enforcement (max 100K rows processed)          │    │
│  │ └── Timeout: 30 seconds per operation                        │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                              │                                      │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │ STEP 5: INSIGHT GENERATION                                  │    │
│  │ LLM analyzes results and generates:                          │    │
│  │ ├── Natural language answer                                  │    │
│  │ ├── Key findings (3-5 bullet points)                         │    │
│  │ ├── Chart specifications (auto-selected chart types)         │    │
│  │ ├── Anomaly flags (if any)                                   │    │
│  │ └── Recommended follow-up questions                          │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                              │                                      │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │ STEP 6: RESPONSE ASSEMBLY                                   │    │
│  │                                                              │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │    │
│  │  │ Answer   │ │ Data     │ │ Charts   │ │ Insights │       │    │
│  │  │ (text)   │ │ (table)  │ │ (specs)  │ │ (bullets)│       │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │    │
│  │                                                              │    │
│  │  Streamed to frontend via WebSocket                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## Multi-LLM Router

```python
# ai/llm_router.py — Routes requests to optimal LLM provider

class LLMRouter:
    """
    Routes AI requests to the best provider based on:
    - Task type (planning, analysis, generation)
    - Cost optimization (use cheaper models for simple tasks)
    - Availability (failover if primary is down)
    - Tenant configuration (enterprise customers choose their provider)
    """

    ROUTING_TABLE = {
        "query_planning":     {"primary": "gpt-4o-mini",    "fallback": "claude-haiku-4-5"},
        "complex_analysis":   {"primary": "claude-sonnet-4-6", "fallback": "gpt-4o"},
        "insight_generation": {"primary": "gpt-4o-mini",    "fallback": "claude-haiku-4-5"},
        "report_narrative":   {"primary": "claude-sonnet-4-6", "fallback": "gpt-4o"},
        "forecasting":        {"primary": "gpt-4o",         "fallback": "claude-sonnet-4-6"},
        "document_qa":        {"primary": "claude-sonnet-4-6", "fallback": "gpt-4o"},
    }
```

## Example: Full AI Analysis Flow

**User asks**: "Analyze sales performance"

**System executes**:

| Step | Action | Output |
|------|--------|--------|
| 1 | Classify intent | `analysis` (multi-step exploration) |
| 2 | Load schema | 8 columns: date, product, region, revenue, quantity, customer, category, status |
| 3 | Plan operations | Filter → Aggregate → Trend → Top → Anomaly |
| 4 | Execute: Total revenue | $2.4M total, 12,340 orders |
| 5 | Execute: Monthly trend | Revenue: Jan $780K → Feb $820K → Mar $800K |
| 6 | Execute: Top products | Product A ($450K), Product B ($380K), Product C ($290K) |
| 7 | Execute: Regional split | North 42%, South 28%, West 20%, East 10% |
| 8 | Detect anomalies | March dip: -2.4% MoM despite seasonal expectation of +5% |
| 9 | Generate charts | Line (trend), Bar (by product), Pie (by region), KPI cards |
| 10 | Generate narrative | Executive summary with findings, anomalies, recommendations |
| 11 | Suggest follow-ups | "What caused the March dip?", "Compare to Q1 2025", "Forecast Q2" |

---

# PHASE 6: DASHBOARD PLATFORM

## Dashboard Builder UX Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DASHBOARD BUILDER FLOW                            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ STEP 1: CREATE DASHBOARD                                    │    │
│  │                                                              │    │
│  │  [+ New Dashboard]  or  [AI: Generate Dashboard]             │    │
│  │                                                              │    │
│  │  Manual: Blank canvas with widget palette                    │    │
│  │  AI:     Select data source → auto-generate layout           │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                              │                                      │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │ STEP 2: WIDGET PALETTE (Drag & Drop)                        │    │
│  │                                                              │    │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ │    │
│  │  │ KPI │ │ Bar │ │Line │ │ Pie │ │Table│ │ Heat│ │Fore-│ │    │
│  │  │Card │ │Chart│ │Chart│ │Chart│ │     │ │ map │ │cast │ │    │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ │    │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                          │    │
│  │  │Gauge│ │Scat-│ │Area │ │ Map │                           │    │
│  │  │     │ │ ter │ │Chart│ │     │                           │    │
│  │  └─────┘ └─────┘ └─────┘ └─────┘                          │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                              │                                      │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │ STEP 3: WIDGET CONFIGURATION                                │    │
│  │                                                              │    │
│  │  ┌─ Data Tab ──────────────────────────────────────────┐    │    │
│  │  │ Data Source:  [Dropdown: sources]                    │    │    │
│  │  │ X-Axis:       [Dropdown: columns]                   │    │    │
│  │  │ Y-Axis:       [Dropdown: columns] + Aggregation     │    │    │
│  │  │ Group By:     [Dropdown: columns]                   │    │    │
│  │  │ Filters:      [Add filter conditions]               │    │    │
│  │  │ Sort:         [Column + Direction]                  │    │    │
│  │  │ Limit:        [Number of records]                   │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │                                                              │    │
│  │  ┌─ Style Tab ─────────────────────────────────────────┐    │    │
│  │  │ Title:        [Text input]                          │    │    │
│  │  │ Colors:       [Color palette selector]              │    │    │
│  │  │ Legend:       [Position / Hide]                     │    │    │
│  │  │ Labels:       [Show / Hide / Format]                │    │    │
│  │  │ Size:         [Grid units: 1x1 to 4x4]             │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                              │                                      │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │ STEP 4: CANVAS LAYOUT (Grid-based)                          │    │
│  │                                                              │    │
│  │  ┌──────────────┬──────────────┬──────────────┐             │    │
│  │  │   KPI: $2.4M │  KPI: 12,340 │  KPI: +15%  │             │    │
│  │  │   Revenue    │  Orders      │  Growth      │             │    │
│  │  ├──────────────┴──────────────┼──────────────┤             │    │
│  │  │                             │              │             │    │
│  │  │   📈 Revenue Trend          │  🥧 Regional │             │    │
│  │  │   (Line Chart, 2x2)        │  Split       │             │    │
│  │  │                             │  (Pie, 1x2)  │             │    │
│  │  ├──────────────┬──────────────┴──────────────┤             │    │
│  │  │              │                             │             │    │
│  │  │  📊 Top      │   📋 Detail Table           │             │    │
│  │  │  Products    │   (2x1)                     │             │    │
│  │  │  (Bar, 1x1)  │                             │             │    │
│  │  └──────────────┴─────────────────────────────┘             │    │
│  │                                                              │    │
│  │  Grid: 12-column responsive                                  │    │
│  │  Widgets: Resizable + Draggable                              │    │
│  │  Auto-save: Every 5 seconds                                  │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                              │                                      │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │ STEP 5: SHARING & INTERACTIVITY                             │    │
│  │                                                              │    │
│  │  Sharing Options:                                            │    │
│  │  ├── Team: Share within workspace (role-based)               │    │
│  │  ├── Public Link: Anyone with link can view (read-only)      │    │
│  │  ├── Embed: iframe embed code for websites                   │    │
│  │  └── Schedule: Auto-email as PDF at intervals                │    │
│  │                                                              │    │
│  │  Interactive Features:                                       │    │
│  │  ├── Global Filters: Date range, category, region            │    │
│  │  ├── Cross-Filter: Click chart → filters other widgets       │    │
│  │  ├── Drill-Down: Click bar → expand to sub-categories        │    │
│  │  ├── Hover Tooltips: Rich data on hover                      │    │
│  │  └── Auto-Refresh: Configurable interval (1min - 24hr)       │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## Dashboard Data Model

```
Dashboard
├── id (UUID)
├── workspace_id (FK)
├── title
├── description
├── created_by (FK → User)
├── layout (JSONB)         # Grid positions of all widgets
├── global_filters (JSONB) # Date range, category filters
├── is_public (bool)
├── public_slug (unique)
├── embed_allowed (bool)
├── auto_refresh_seconds (int, nullable)
├── created_at
├── updated_at
└── widgets (relationship)

DashboardWidget
├── id (UUID)
├── dashboard_id (FK)
├── widget_type (enum: kpi, bar, line, pie, table, heatmap, ...)
├── source_id (FK → Source)
├── config (JSONB)         # x_axis, y_axis, aggregation, filters, colors
├── position (JSONB)       # {x, y, w, h} grid coordinates
├── title
└── order (int)
```

---

# PHASE 7: REPORTING PLATFORM

## Report Generation Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REPORTING PLATFORM                                │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ REPORT CREATION MODES                                        │    │
│  │                                                              │    │
│  │  1. AI Auto-Report                                           │    │
│  │     Select source → AI generates full executive report       │    │
│  │                                                              │    │
│  │  2. Template-Based                                           │    │
│  │     Choose template → Map data fields → Generate             │    │
│  │                                                              │    │
│  │  3. Dashboard-to-Report                                      │    │
│  │     Select dashboard → Export as formatted report            │    │
│  │                                                              │    │
│  │  4. Custom Builder                                           │    │
│  │     Add sections manually: text, charts, tables, KPIs        │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                              │                                      │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │ REPORT TEMPLATES                                             │    │
│  │                                                              │    │
│  │  ├── Executive Summary    (1 page: KPIs + key findings)      │    │
│  │  ├── Sales Report         (multi-page: trends, products)     │    │
│  │  ├── Financial Report     (P&L, revenue, expenses)           │    │
│  │  ├── Operations Report    (efficiency, SLAs, incidents)      │    │
│  │  ├── Marketing Report     (campaigns, funnel, attribution)   │    │
│  │  ├── Custom Template      (user-defined sections)            │    │
│  │  └── White Label          (custom logo, colors, headers)     │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                              │                                      │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │ EXPORT PIPELINE (Celery Worker)                              │    │
│  │                                                              │    │
│  │  1. Fetch data from source(s)                                │    │
│  │  2. Execute analytics queries                                │    │
│  │  3. Generate chart images (matplotlib / ECharts SSR)          │    │
│  │  4. Generate AI narrative (LLM)                              │    │
│  │  5. Render document:                                         │    │
│  │     ├── PDF:  ReportLab + WeasyPrint                         │    │
│  │     ├── DOCX: python-docx                                    │    │
│  │     ├── PPTX: python-pptx                                    │    │
│  │     └── XLSX: openpyxl (data + charts)                       │    │
│  │  6. Upload to S3                                             │    │
│  │  7. Notify user (in-app + email)                             │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                              │                                      │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │ SCHEDULING ENGINE                                            │    │
│  │                                                              │    │
│  │  ┌──────────────────────────────────────────────┐           │    │
│  │  │ Schedule Configuration                        │           │    │
│  │  │ ├── Frequency: Daily / Weekly / Monthly       │           │    │
│  │  │ ├── Time:      09:00 UTC (configurable)      │           │    │
│  │  │ ├── Day:       Monday / 1st of month          │           │    │
│  │  │ ├── Format:    PDF / DOCX / PPTX / XLSX      │           │    │
│  │  │ ├── Recipients: [email list]                  │           │    │
│  │  │ └── Enabled:   true/false                     │           │    │
│  │  └──────────────────────────────────────────────┘           │    │
│  │                                                              │    │
│  │  Backend: APScheduler (in-process) or Celery Beat           │    │
│  │  Storage: PostgreSQL (job definitions + run history)          │    │
│  │  Delivery: SendGrid / AWS SES with attachment                │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## White Label Report Configuration

```json
{
    "branding": {
        "logo_url": "https://s3.../tenant-logo.png",
        "company_name": "Acme Corp",
        "primary_color": "#1a73e8",
        "secondary_color": "#34a853",
        "font_family": "Inter",
        "header_text": "Confidential - Internal Use Only",
        "footer_text": "Generated by Acme Analytics Platform"
    }
}
```

---

# PHASE 8: KNOWLEDGE HUB

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       KNOWLEDGE HUB                                  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ DOCUMENT INGESTION PIPELINE                                  │    │
│  │                                                              │    │
│  │  Source          Parser              Chunker      Embedder   │    │
│  │  ┌─────┐       ┌──────────┐        ┌────────┐   ┌────────┐ │    │
│  │  │ PDF │──────▶│pdfplumber│───────▶│Semantic│──▶│OpenAI  │ │    │
│  │  └─────┘       └──────────┘        │Chunker │   │text-   │ │    │
│  │  ┌─────┐       ┌──────────┐        │        │   │embed-  │ │    │
│  │  │DOCX │──────▶│python-   │───────▶│  512   │──▶│ding-3- │ │    │
│  │  └─────┘       │docx      │        │ tokens │   │small   │ │    │
│  │  ┌─────┐       └──────────┘        │  per   │   └───┬────┘ │    │
│  │  │PPTX │──────▶python-pptx────────▶│ chunk  │       │      │    │
│  │  └─────┘                           │  50    │       │      │    │
│  │  ┌─────┐       ┌──────────┐        │overlap │       ▼      │    │
│  │  │ TXT │──────▶│ raw text │───────▶│        │  ┌────────┐  │    │
│  │  └─────┘       └──────────┘        └────────┘  │ChromaDB│  │    │
│  │  ┌─────┐       ┌──────────┐                    │   or   │  │    │
│  │  │ Web │──────▶│Trafilat- │─────────────────▶  │Pinecone│  │    │
│  │  │ URL │       │ura       │                    └────────┘  │    │
│  │  └─────┘       └──────────┘                                │    │
│  │  ┌───────┐     ┌──────────┐                                │    │
│  │  │Notion │────▶│Notion API│─────────────────────────────▶  │    │
│  │  └───────┘     └──────────┘                                │    │
│  │  ┌───────────┐ ┌──────────┐                                │    │
│  │  │Confluence │▶│Atlassian │─────────────────────────────▶  │    │
│  │  └───────────┘ │API       │                                │    │
│  │                └──────────┘                                │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ RAG QUERY PIPELINE                                           │    │
│  │                                                              │    │
│  │  User Question                                               │    │
│  │       │                                                      │    │
│  │       ▼                                                      │    │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────────────────┐   │    │
│  │  │ Embed    │───▶│ Vector   │───▶│ Rerank (top-k=5)     │   │    │
│  │  │ Question │    │ Search   │    │ Cross-encoder model   │   │    │
│  │  └──────────┘    └──────────┘    └──────────┬───────────┘   │    │
│  │                                              │               │    │
│  │                                              ▼               │    │
│  │                                  ┌──────────────────────┐   │    │
│  │                                  │ LLM Generation       │   │    │
│  │                                  │                      │   │    │
│  │                                  │ System: You are an   │   │    │
│  │                                  │ analyst. Answer using │   │    │
│  │                                  │ ONLY the provided    │   │    │
│  │                                  │ context. Cite sources.│   │    │
│  │                                  │                      │   │    │
│  │                                  │ Context: [chunks]    │   │    │
│  │                                  │ Question: [user q]   │   │    │
│  │                                  └──────────┬───────────┘   │    │
│  │                                              │               │    │
│  │                                              ▼               │    │
│  │                                  ┌──────────────────────┐   │    │
│  │                                  │ Response with        │   │    │
│  │                                  │ source citations     │   │    │
│  │                                  │ [1] doc.pdf, p.12    │   │    │
│  │                                  │ [2] report.docx, §3  │   │    │
│  │                                  └──────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ TEAM KNOWLEDGE BASE                                          │    │
│  │                                                              │    │
│  │  ├── Collections (folders of related documents)              │    │
│  │  ├── Shared access (workspace-level permissions)             │    │
│  │  ├── Auto-sync (re-index on document update)                 │    │
│  │  ├── Search across all collections                           │    │
│  │  └── Chat with multiple documents simultaneously             │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## Knowledge Hub Data Model

```
KnowledgeCollection
├── id (UUID)
├── workspace_id (FK)
├── name ("Q4 Board Reports", "Product Specs")
├── description
├── created_by (FK → User)
└── documents (relationship)

KnowledgeDocument
├── id (UUID)
├── collection_id (FK)
├── name (original filename)
├── source_type (enum: pdf, docx, pptx, txt, url, notion, confluence)
├── source_url (for web sources)
├── file_path (S3 path)
├── chunk_count (int)
├── status (enum: processing, ready, error)
├── last_synced_at
└── metadata (JSONB: page count, word count, etc.)
```

---

# PHASE 9: DATA CLEANING ENGINE

## AI-Powered Data Cleaning Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA CLEANING ENGINE                              │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ STEP 1: AUTO-PROFILING (on upload)                           │    │
│  │                                                              │    │
│  │  For each column, compute:                                   │    │
│  │  ├── Data type (inferred vs declared)                        │    │
│  │  ├── Null count / null percentage                            │    │
│  │  ├── Unique count / cardinality                              │    │
│  │  ├── Min / Max / Mean / Median / StdDev (numeric)            │    │
│  │  ├── Min length / Max length / Pattern (string)              │    │
│  │  ├── Date range / Format consistency (datetime)              │    │
│  │  └── Distribution histogram (top 10 values)                  │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                              │                                      │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │ STEP 2: ISSUE DETECTION                                     │    │
│  │                                                              │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │ Rule-Based Detectors                                 │    │    │
│  │  │ ├── Duplicates: exact + fuzzy matching (fuzzywuzzy)  │    │    │
│  │  │ ├── Missing Values: null, empty, "N/A", "null", "-" │    │    │
│  │  │ ├── Invalid Emails: regex + MX record validation     │    │    │
│  │  │ ├── Invalid Phones: country-specific format check    │    │    │
│  │  │ ├── Invalid URLs: URL parsing + optional HEAD check  │    │    │
│  │  │ ├── Type Mismatches: "123" in string column          │    │    │
│  │  │ ├── Date Format Inconsistency: mixed DD/MM vs MM/DD │    │    │
│  │  │ └── Encoding Issues: mojibake detection              │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │                                                              │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │ Statistical Detectors                                │    │    │
│  │  │ ├── Outliers: IQR method + Z-score (configurable)   │    │    │
│  │  │ ├── Skewness: Flag heavily skewed distributions      │    │    │
│  │  │ ├── Constant Columns: Zero variance detection       │    │    │
│  │  │ └── High Cardinality: Flag columns with >90% unique │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │                                                              │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │ AI-Powered Detectors                                 │    │    │
│  │  │ ├── Semantic Duplicates: "NY" vs "New York"         │    │    │
│  │  │ ├── Category Standardization: "Male"/"M"/"male"     │    │    │
│  │  │ └── Relationship Validation: ZIP ↔ City mismatch    │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                              │                                      │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │ STEP 3: ISSUE REPORT                                        │    │
│  │                                                              │    │
│  │  Data Quality Score: 72/100                                  │    │
│  │                                                              │    │
│  │  ┌────────────────┬──────┬──────────┬────────────────────┐  │    │
│  │  │ Issue          │Count │ Severity │ Suggested Fix      │  │    │
│  │  ├────────────────┼──────┼──────────┼────────────────────┤  │    │
│  │  │ Duplicate rows │  234 │ High     │ Remove duplicates  │  │    │
│  │  │ Missing emails │   56 │ Medium   │ Flag for review    │  │    │
│  │  │ Invalid dates  │   12 │ High     │ Auto-parse         │  │    │
│  │  │ Outliers       │    8 │ Low      │ Cap / Review       │  │    │
│  │  │ Encoding issue │    3 │ Medium   │ Re-encode UTF-8    │  │    │
│  │  └────────────────┴──────┴──────────┴────────────────────┘  │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                              │                                      │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │ STEP 4: RESOLUTION                                          │    │
│  │                                                              │    │
│  │  Mode A: AUTO-FIX (one-click)                               │    │
│  │  ├── Apply all high-confidence fixes automatically           │    │
│  │  ├── Show before/after preview                               │    │
│  │  └── Undo button (keeps original)                            │    │
│  │                                                              │    │
│  │  Mode B: MANUAL REVIEW                                      │    │
│  │  ├── Row-by-row review interface                             │    │
│  │  ├── Accept / Reject / Edit each suggestion                  │    │
│  │  └── Bulk actions for similar issues                         │    │
│  │                                                              │    │
│  │  Mode C: VALIDATION RULES                                   │    │
│  │  ├── Define custom rules per column                          │    │
│  │  ├── Regex patterns, range checks, lookup lists              │    │
│  │  └── Rules persist and run on future uploads                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## Cleaning Operations

| Operation | Method | Confidence |
|-----------|--------|------------|
| Remove exact duplicates | Hash-based dedup | 100% |
| Remove fuzzy duplicates | Levenshtein distance ≥ 90% | 85-99% |
| Fill missing numerics | Mean / Median / Mode (user choice) | N/A |
| Fill missing categoricals | Mode or "Unknown" | N/A |
| Fix date formats | dateutil parser + format inference | 95% |
| Standardize categories | LLM-powered normalization | 90% |
| Remove outliers | IQR (1.5x) or Z-score (>3) | N/A |
| Fix encoding | chardet + ftfy library | 98% |
| Trim whitespace | Strip leading/trailing + normalize | 100% |
| Validate emails | Regex + optional MX check | 99% |

---

# PHASE 10: AUTOMATION PLATFORM

## Workflow Engine Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AUTOMATION PLATFORM                               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ VISUAL WORKFLOW BUILDER (No-Code)                            │    │
│  │                                                              │    │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐              │    │
│  │  │ TRIGGER  │───▶│  STEP 1  │───▶│  STEP 2  │───▶ ...      │    │
│  │  │          │    │          │    │          │              │    │
│  │  └──────────┘    └──────────┘    └──────────┘              │    │
│  │                                                              │    │
│  │  Available Triggers:                                         │    │
│  │  ├── Manual (run now)                                        │    │
│  │  ├── Schedule (cron expression)                              │    │
│  │  ├── File Upload (new file in source)                        │    │
│  │  ├── Webhook (external HTTP call)                            │    │
│  │  ├── Data Change (threshold alert)                           │    │
│  │  └── Connector Sync (after data refresh)                     │    │
│  │                                                              │    │
│  │  Available Steps (Node Types):                               │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │ DATA NODES                                           │    │    │
│  │  │ ├── Upload File (CSV, Excel, JSON, etc.)             │    │    │
│  │  │ ├── Query Database (run SQL / NL query)              │    │    │
│  │  │ ├── Fetch API (GET/POST external API)                │    │    │
│  │  │ └── Select Source (existing data source)             │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │ TRANSFORM NODES                                      │    │    │
│  │  │ ├── Clean Data (run cleaning pipeline)               │    │    │
│  │  │ ├── Filter Rows (condition builder)                  │    │    │
│  │  │ ├── Merge Datasets (join, union, append)             │    │    │
│  │  │ ├── Aggregate (group by + sum/avg/count)             │    │    │
│  │  │ ├── Add Column (formula / AI-generated)              │    │    │
│  │  │ └── Pivot / Unpivot                                  │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │ AI NODES                                             │    │    │
│  │  │ ├── AI Analysis (ask a question about data)          │    │    │
│  │  │ ├── Generate Dashboard                               │    │    │
│  │  │ ├── Generate Report (PDF/DOCX/PPTX)                 │    │    │
│  │  │ ├── Generate Insights                                │    │    │
│  │  │ └── Forecast (predict next N periods)                │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │ OUTPUT NODES                                         │    │    │
│  │  │ ├── Export File (CSV, Excel, PDF)                    │    │    │
│  │  │ ├── Send Email (with attachment)                     │    │    │
│  │  │ ├── Send Slack Message                               │    │    │
│  │  │ ├── Send Teams Message                               │    │    │
│  │  │ ├── Save to Source (create new data source)          │    │    │
│  │  │ ├── Webhook (POST result to URL)                     │    │    │
│  │  │ └── Update Dashboard (refresh widgets)               │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │ LOGIC NODES                                          │    │    │
│  │  │ ├── Condition (if/else branching)                    │    │    │
│  │  │ ├── Loop (for each row / batch)                      │    │    │
│  │  │ ├── Delay (wait N minutes/hours)                     │    │    │
│  │  │ └── Error Handler (retry / notify on failure)        │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ EXAMPLE WORKFLOW: Weekly Sales Report                        │    │
│  │                                                              │    │
│  │  [Schedule: Every Monday 9am]                                │    │
│  │       │                                                      │    │
│  │       ▼                                                      │    │
│  │  [Query: PostgreSQL → "SELECT * FROM orders                  │    │
│  │         WHERE created_at >= NOW() - INTERVAL '7 days'"]      │    │
│  │       │                                                      │    │
│  │       ▼                                                      │    │
│  │  [Clean Data: Remove nulls, fix formats]                     │    │
│  │       │                                                      │    │
│  │       ▼                                                      │    │
│  │  [AI Analysis: "Summarize this week's sales performance"]    │    │
│  │       │                                                      │    │
│  │       ▼                                                      │    │
│  │  [Generate Dashboard: Auto KPIs + charts]                    │    │
│  │       │                                                      │    │
│  │       ▼                                                      │    │
│  │  [Generate Report: PDF executive report]                     │    │
│  │       │                                                      │    │
│  │       ▼                                                      │    │
│  │  [Email: Send to team@company.com with PDF attachment]       │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## Workflow Execution Engine

```
Backend: Celery + Redis
├── Each workflow step = one Celery task
├── Steps chained via Celery canvas (chain, chord, group)
├── State stored in PostgreSQL (WorkflowRun model)
├── Status: pending → running → step_N → completed / failed
├── Retry: configurable per-step (max 3 retries, exponential backoff)
├── Timeout: configurable per-step (default 5 minutes)
├── Logging: Each step logs input/output for debugging
└── Notifications: On completion, failure, or timeout
```

## Workflow Data Model

```
Workflow
├── id (UUID)
├── workspace_id (FK)
├── name
├── description
├── trigger_type (enum: manual, schedule, webhook, upload, threshold)
├── trigger_config (JSONB)
├── steps (JSONB array of step definitions)
├── is_active (bool)
├── created_by (FK → User)
├── created_at
└── updated_at

WorkflowRun
├── id (UUID)
├── workflow_id (FK)
├── status (enum: pending, running, completed, failed, cancelled)
├── started_at
├── completed_at
├── step_results (JSONB: per-step status + output)
├── error_message (text, nullable)
└── triggered_by (manual / schedule / webhook)
```

---

# PHASE 11: AI INSIGHTS ENGINE

## Proactive Insights Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AI INSIGHTS ENGINE                                │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ INSIGHT DETECTION (Background Workers)                       │    │
│  │                                                              │    │
│  │  Runs on schedule (configurable: hourly / daily / weekly)    │    │
│  │                                                              │    │
│  │  For each connected data source:                             │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │ 1. TREND DETECTION                                   │    │    │
│  │  │    ├── Calculate period-over-period changes           │    │    │
│  │  │    ├── Flag: >10% increase or decrease               │    │    │
│  │  │    └── Example: "Revenue dropped 15% vs last week"   │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │ 2. ANOMALY DETECTION                                 │    │    │
│  │  │    ├── Statistical: Z-score, IQR-based               │    │    │
│  │  │    ├── ML: Isolation Forest for multivariate          │    │    │
│  │  │    └── Example: "Unusual spike in API errors today"  │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │ 3. THRESHOLD ALERTS                                  │    │    │
│  │  │    ├── User-defined: "Alert if inventory < 100"      │    │    │
│  │  │    ├── AI-suggested: Auto-detect important KPIs      │    │    │
│  │  │    └── Example: "Inventory for Product X is at 12"   │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │ 4. PATTERN RECOGNITION                               │    │    │
│  │  │    ├── Seasonality detection                          │    │    │
│  │  │    ├── Correlation discovery                          │    │    │
│  │  │    └── Example: "Sales peak every Friday at 3pm"     │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │ 5. AI NARRATIVE GENERATION                           │    │    │
│  │  │    ├── LLM summarizes findings in plain English       │    │    │
│  │  │    ├── Prioritizes by business impact                 │    │    │
│  │  │    └── Suggests actions                               │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                              │                                      │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │ NOTIFICATION DELIVERY                                       │    │
│  │                                                              │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │    │
│  │  │ In-App   │ │  Email   │ │  Slack   │ │  Teams   │       │    │
│  │  │ Bell     │ │ Digest   │ │ Webhook  │ │ Webhook  │       │    │
│  │  │ Badge    │ │ (SES)    │ │ (Bot)    │ │ (Bot)    │       │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │    │
│  │                                                              │    │
│  │  Delivery Rules:                                             │    │
│  │  ├── Critical:  Immediate (all channels)                     │    │
│  │  ├── High:      Within 1 hour (email + in-app)               │    │
│  │  ├── Medium:    Daily digest (email)                          │    │
│  │  └── Low:       In-app only (next login)                     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ INSIGHTS FEED (UI)                                           │    │
│  │                                                              │    │
│  │  ┌─ Today ──────────────────────────────────────────────┐   │    │
│  │  │ 🔴 CRITICAL: Revenue dropped 15% vs last Monday      │   │    │
│  │  │    Affected: North region, Product Line A             │   │    │
│  │  │    [View Details] [Dismiss] [Create Alert Rule]       │   │    │
│  │  │                                                       │   │    │
│  │  │ 🟡 WARNING: Customer churn rate increased to 8.2%     │   │    │
│  │  │    Up from 5.1% last month. Top reason: pricing       │   │    │
│  │  │    [View Details] [Dismiss]                            │   │    │
│  │  │                                                       │   │    │
│  │  │ 🟢 POSITIVE: API response time improved by 23%        │   │    │
│  │  │    After infrastructure changes deployed Thursday      │   │    │
│  │  │    [View Details] [Dismiss]                            │   │    │
│  │  └───────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## Alert Configuration Model

```
AlertRule
├── id (UUID)
├── workspace_id (FK)
├── name ("Revenue Drop Alert")
├── source_id (FK → Source)
├── condition_type (enum: threshold, change_pct, anomaly, custom)
├── condition_config (JSONB)
│   ├── column: "revenue"
│   ├── operator: "decrease_pct"
│   ├── value: 10
│   └── window: "7d"
├── severity (enum: critical, high, medium, low)
├── channels (JSONB: ["email", "slack"])
├── recipients (JSONB: [user_ids / emails / webhook_urls])
├── cooldown_minutes (int: don't re-alert within N minutes)
├── is_active (bool)
└── created_by (FK → User)
```

---

# PHASE 12: FORECASTING & PREDICTIONS

## ML Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                  FORECASTING & PREDICTION ENGINE                     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ FORECASTING MODELS                                           │    │
│  │                                                              │    │
│  │  ┌───────────────────────────────────────────────────┐      │    │
│  │  │ Time-Series Forecasting                            │      │    │
│  │  │                                                    │      │    │
│  │  │ Models (auto-selected based on data):              │      │    │
│  │  │ ├── Prophet (Facebook) — seasonal decomposition    │      │    │
│  │  │ ├── ARIMA/SARIMA — statistical baseline            │      │    │
│  │  │ ├── Exponential Smoothing (Holt-Winters)          │      │    │
│  │  │ ├── XGBoost — tabular features + time features     │      │    │
│  │  │ └── Linear Regression — simple trend projection    │      │    │
│  │  │                                                    │      │    │
│  │  │ Use Cases:                                         │      │    │
│  │  │ ├── Revenue Forecasting (next 30/60/90 days)       │      │    │
│  │  │ ├── Sales Forecasting (by product/region)          │      │    │
│  │  │ ├── Inventory Forecasting (reorder point)          │      │    │
│  │  │ └── Demand Prediction (seasonal patterns)          │      │    │
│  │  └───────────────────────────────────────────────────┘      │    │
│  │                                                              │    │
│  │  ┌───────────────────────────────────────────────────┐      │    │
│  │  │ Classification Models                              │      │    │
│  │  │                                                    │      │    │
│  │  │ Models:                                            │      │    │
│  │  │ ├── XGBoost Classifier                             │      │    │
│  │  │ ├── Random Forest                                  │      │    │
│  │  │ └── Logistic Regression (baseline)                │      │    │
│  │  │                                                    │      │    │
│  │  │ Use Cases:                                         │      │    │
│  │  │ ├── Customer Churn Prediction                      │      │    │
│  │  │ ├── Lead Scoring                                   │      │    │
│  │  │ └── Risk Classification                            │      │    │
│  │  └───────────────────────────────────────────────────┘      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ AUTO-ML PIPELINE                                             │    │
│  │                                                              │    │
│  │  1. Data Preparation                                         │    │
│  │     ├── Auto-detect time column and target variable          │    │
│  │     ├── Handle missing values (forward fill / interpolation) │    │
│  │     ├── Feature engineering (day_of_week, month, lag, etc.)  │    │
│  │     └── Train/test split (80/20 or time-based)               │    │
│  │                                                              │    │
│  │  2. Model Selection                                          │    │
│  │     ├── Run multiple models in parallel                      │    │
│  │     ├── Evaluate: MAPE, RMSE, MAE                            │    │
│  │     └── Auto-select best performer                           │    │
│  │                                                              │    │
│  │  3. Forecast Generation                                      │    │
│  │     ├── Point forecast (expected value)                      │    │
│  │     ├── Confidence intervals (80%, 95%)                      │    │
│  │     └── Scenario analysis (best/worst/likely)                │    │
│  │                                                              │    │
│  │  4. Output                                                   │    │
│  │     ├── Interactive chart with confidence bands              │    │
│  │     ├── Tabular predictions (downloadable)                   │    │
│  │     ├── AI narrative explaining the forecast                 │    │
│  │     └── Accuracy metrics + model explanation                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ TECHNOLOGY STACK                                             │    │
│  │                                                              │    │
│  │  ├── scikit-learn (classification, regression)               │    │
│  │  ├── prophet (time-series, Facebook)                         │    │
│  │  ├── statsmodels (ARIMA, Holt-Winters)                       │    │
│  │  ├── xgboost (gradient boosting)                             │    │
│  │  ├── pandas + numpy (data manipulation)                      │    │
│  │  └── matplotlib / plotly (chart generation for reports)      │    │
│  │                                                              │    │
│  │  Execution: Celery workers (CPU-intensive tasks)             │    │
│  │  Caching: Redis (cache trained models for re-use)            │    │
│  │  Storage: S3 (serialized models via joblib)                  │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## Forecast API

```
POST /api/v1/forecast
{
    "source_id": "uuid",
    "time_column": "date",
    "target_column": "revenue",
    "periods": 30,
    "frequency": "daily",
    "group_by": "region",          // optional: forecast per group
    "confidence_level": 0.95
}

Response:
{
    "model_used": "prophet",
    "accuracy": {
        "mape": 4.2,
        "rmse": 12345.67
    },
    "forecast": [
        {"date": "2026-07-01", "predicted": 45000, "lower": 41000, "upper": 49000},
        {"date": "2026-07-02", "predicted": 46200, "lower": 41800, "upper": 50600},
        ...
    ],
    "chart_spec": { ... },
    "narrative": "Revenue is projected to grow 8% over the next 30 days..."
}
```

---

# PHASE 13: ENTERPRISE FEATURES

## Audit & Compliance Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ENTERPRISE FEATURES                               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 1. AUDIT LOGS                                                │    │
│  │                                                              │    │
│  │  Every action logged with:                                   │    │
│  │  ├── Timestamp (UTC)                                         │    │
│  │  ├── User ID + Email                                         │    │
│  │  ├── Action (create, read, update, delete, export, query)    │    │
│  │  ├── Resource Type (source, dashboard, report, user, etc.)   │    │
│  │  ├── Resource ID                                             │    │
│  │  ├── IP Address                                              │    │
│  │  ├── User Agent                                              │    │
│  │  ├── Request Details (sanitized, no secrets)                 │    │
│  │  └── Result (success / failure + reason)                     │    │
│  │                                                              │    │
│  │  Storage: Separate audit_logs table (append-only)            │    │
│  │  Retention: Configurable (default 2 years)                   │    │
│  │  Export: CSV/JSON export for compliance auditors              │    │
│  │  Search: Full-text search + filters by user/action/date      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 2. ACTIVITY TRACKING                                         │    │
│  │                                                              │    │
│  │  ├── User login/logout times                                 │    │
│  │  ├── Feature usage analytics (which tools used most)         │    │
│  │  ├── Query frequency per user                                │    │
│  │  ├── Data access patterns                                    │    │
│  │  └── Session duration                                        │    │
│  │                                                              │    │
│  │  Internal dashboard for workspace admins                     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 3. DATA LINEAGE                                              │    │
│  │                                                              │    │
│  │  Track data flow:                                            │    │
│  │  Source → Upload → Clean → Transform → Dashboard → Report    │    │
│  │                                                              │    │
│  │  ├── Visual lineage graph (DAG)                              │    │
│  │  ├── Impact analysis: "What breaks if I delete this source?" │    │
│  │  └── Versioned: track schema changes over time               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 4. DATASET VERSIONING                                        │    │
│  │                                                              │    │
│  │  ├── Every upload creates a new version                      │    │
│  │  ├── Diff viewer: compare versions side-by-side              │    │
│  │  ├── Rollback: restore previous version                      │    │
│  │  ├── Storage: S3 with versioned keys                         │    │
│  │  └── Metadata: row count, column changes, upload timestamp   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 5. SECURITY MONITORING                                       │    │
│  │                                                              │    │
│  │  ├── Failed login attempts (lockout after 5)                 │    │
│  │  ├── Suspicious activity detection                           │    │
│  │  │   ├── Login from new IP/location                          │    │
│  │  │   ├── Bulk data export                                    │    │
│  │  │   └── After-hours access                                  │    │
│  │  ├── API key rotation reminders                              │    │
│  │  └── Security event notifications to admins                  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 6. COMPLIANCE FRAMEWORK                                      │    │
│  │                                                              │    │
│  │  GDPR:                                                       │    │
│  │  ├── Right to erasure (delete all user data)                 │    │
│  │  ├── Data export (download all personal data)                │    │
│  │  ├── Consent management                                      │    │
│  │  ├── Data processing agreements (DPA)                        │    │
│  │  └── EU data residency option                                │    │
│  │                                                              │    │
│  │  HIPAA:                                                      │    │
│  │  ├── PHI encryption at rest (AES-256)                        │    │
│  │  ├── PHI encryption in transit (TLS 1.3)                     │    │
│  │  ├── Access logging for all PHI                              │    │
│  │  ├── BAA (Business Associate Agreement)                      │    │
│  │  └── Automatic PHI detection and redaction                   │    │
│  │                                                              │    │
│  │  SOC 2:                                                      │    │
│  │  ├── Security policies and procedures                        │    │
│  │  ├── Availability monitoring (99.9% SLA)                     │    │
│  │  ├── Processing integrity (data validation)                  │    │
│  │  ├── Confidentiality (encryption, access controls)           │    │
│  │  └── Privacy (data handling policies)                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## Audit Log Model

```
AuditLog
├── id (BIGINT, auto-increment)
├── workspace_id (FK)
├── user_id (FK → User, nullable for system events)
├── action (enum: create, read, update, delete, login, logout, export, query, share)
├── resource_type (enum: source, dashboard, report, user, workspace, connector, workflow)
├── resource_id (UUID, nullable)
├── details (JSONB: action-specific metadata)
├── ip_address (inet)
├── user_agent (text)
├── status (enum: success, failure)
├── failure_reason (text, nullable)
├── created_at (timestamptz, indexed)
└── INDEX: (workspace_id, created_at DESC) for fast queries
```

---

# PHASE 14: BILLING & MONETIZATION

## Pricing Strategy

### Recommended Pricing Tiers

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PRICING PLANS                                   │
│                                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐│
│  │    FREE      │ │     PRO      │ │   BUSINESS   │ │ ENTERPRISE ││
│  │              │ │              │ │              │ │            ││
│  │   $0/mo      │ │  $29/user/mo │ │ $79/user/mo  │ │  Custom    ││
│  │              │ │  ($24 annual)│ │ ($66 annual) │ │  pricing   ││
│  │              │ │              │ │              │ │            ││
│  │ ● 1 user     │ │ ● Up to 5    │ │ ● Up to 50   │ │ ● Unlimited││
│  │ ● 3 sources  │ │   users      │ │   users      │ │   users    ││
│  │ ● 100MB      │ │ ● 20 sources │ │ ● Unlimited  │ │ ● Unlimited││
│  │   storage    │ │ ● 5GB        │ │   sources    │ │   storage  ││
│  │ ● 50 AI      │ │   storage    │ │ ● 50GB       │ │ ● Dedicated││
│  │   queries/mo │ │ ● 500 AI     │ │   storage    │ │   infra    ││
│  │ ● Basic      │ │   queries/mo │ │ ● 5000 AI    │ │ ● SSO/SAML ││
│  │   charts     │ │ ● All chart  │ │   queries/mo │ │ ● Audit    ││
│  │ ● CSV export │ │   types      │ │ ● All export │ │   logs     ││
│  │ ● Community  │ │ ● PDF/Excel  │ │   formats    │ │ ● SLA 99.9%││
│  │   support    │ │   export     │ │ ● Connectors │ │ ● Dedicated││
│  │              │ │ ● 3 dash-    │ │ ● Automations│ │   support  ││
│  │              │ │   boards     │ │ ● Forecasting│ │ ● Custom   ││
│  │              │ │ ● Email      │ │ ● Scheduled  │ │   contracts││
│  │              │ │   support    │ │   reports    │ │ ● HIPAA/   ││
│  │              │ │ ● Knowledge  │ │ ● Knowledge  │ │   SOC2     ││
│  │              │ │   Hub (5     │ │   Hub (unltd)│ │ ● On-prem  ││
│  │              │ │   docs)      │ │ ● Priority   │ │   option   ││
│  │              │ │              │ │   support    │ │            ││
│  │              │ │              │ │ ● White label│ │            ││
│  │              │ │              │ │   reports    │ │            ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘│
│                                                                     │
│  Add-ons:                                                           │
│  ├── Extra AI Credits:  $10 per 500 queries                         │
│  ├── Extra Storage:     $5 per 10GB                                 │
│  ├── Extra Users:       Per-user rate of current plan               │
│  ├── API Access:        $49/mo (for external integrations)          │
│  └── Custom Connectors: $199/mo per connector                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Revenue Projections (Year 1)

| Quarter | Free Users | Pro | Business | Enterprise | MRR |
|---------|-----------|-----|----------|------------|-----|
| Q1 | 500 | 50 | 10 | 1 | $4,240 |
| Q2 | 2,000 | 200 | 40 | 3 | $13,780 |
| Q3 | 5,000 | 500 | 100 | 8 | $36,850 |
| Q4 | 10,000 | 1,000 | 250 | 15 | $78,250 |

**Year 1 ARR Target**: ~$940K

### Billing Implementation

```
┌─────────────────────────────────────────────────────────────────┐
│                    BILLING ARCHITECTURE                          │
│                                                                 │
│  ┌──────────┐     ┌──────────────┐     ┌──────────────────┐   │
│  │ Frontend │────▶│  Billing     │────▶│ Stripe / Razor-  │   │
│  │ Checkout │     │  Service     │     │ pay Gateway      │   │
│  └──────────┘     └──────┬───────┘     └────────┬─────────┘   │
│                          │                       │             │
│                          ▼                       │             │
│                  ┌──────────────┐                │             │
│                  │  PostgreSQL  │                │             │
│                  │  ┌────────┐  │    Webhooks    │             │
│                  │  │ plans  │  │◄───────────────┘             │
│                  │  │ subs   │  │                              │
│                  │  │invoices│  │  Events:                     │
│                  │  │ usage  │  │  ├── invoice.paid            │
│                  │  └────────┘  │  ├── subscription.updated    │
│                  └──────────────┘  ├── subscription.cancelled  │
│                                    └── payment.failed          │
│                                                                │
│  Usage Tracking:                                               │
│  ├── AI queries counted per request (Redis counter)            │
│  ├── Storage calculated nightly (S3 inventory)                 │
│  ├── User count tracked real-time                              │
│  └── Overage billing at end of billing period                  │
└─────────────────────────────────────────────────────────────────┘
```

## Billing Data Model

```
Plan
├── id
├── name (free, pro, business, enterprise)
├── price_monthly (cents)
├── price_annual (cents)
├── max_users
├── max_sources
├── max_storage_gb
├── max_ai_queries_monthly
├── features (JSONB: feature flags)
└── is_active

Subscription
├── id (UUID)
├── workspace_id (FK)
├── plan_id (FK)
├── stripe_subscription_id
├── status (active, past_due, cancelled, trialing)
├── current_period_start
├── current_period_end
├── trial_end (nullable)
└── cancelled_at (nullable)

UsageRecord
├── id
├── workspace_id (FK)
├── metric (enum: ai_queries, storage_bytes, api_calls)
├── value (bigint)
├── recorded_at (date)
└── INDEX: (workspace_id, metric, recorded_at)
```

---

# PHASE 15: MODERN UI/UX REDESIGN

## Navigation Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DATAQUERY AI PLATFORM                             │
│                                                                     │
│  ┌─── Top Bar ──────────────────────────────────────────────────┐   │
│  │ [Logo]  DataQuery AI    🔍 Search...    [🔔 3] [👤 Bharat ▾] │   │
│  │                         Workspace: Acme Corp ▾               │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ Sidebar ─┐ ┌─ Main Content Area ─────────────────────────────┐ │
│  │           │ │                                                  │ │
│  │ 🏠 Home   │ │  (Dynamic based on sidebar selection)           │ │
│  │           │ │                                                  │ │
│  │ ANALYTICS │ │  Home → Insights feed + recent activity          │ │
│  │ 📊 Excel  │ │  Excel → Upload + NL query interface            │ │
│  │ 🗄️ SQL    │ │  SQL → Connected DB query interface              │ │
│  │ 🔌 API    │ │  API → Endpoint analytics                       │ │
│  │           │ │                                                  │ │
│  │ AI ASSIST │ │                                                  │ │
│  │ 💬 Data   │ │                                                  │ │
│  │ 📄 Docs   │ │                                                  │ │
│  │           │ │                                                  │ │
│  │ VISUALIZE │ │                                                  │ │
│  │ 📈 Boards │ │                                                  │ │
│  │ 📋 Reports│ │                                                  │ │
│  │           │ │                                                  │ │
│  │ DATA      │ │                                                  │ │
│  │ 🧹 Clean  │ │                                                  │ │
│  │ 🔗 Connect│ │                                                  │ │
│  │ 📁 Sets   │ │                                                  │ │
│  │           │ │                                                  │ │
│  │ AUTOMATE  │ │                                                  │ │
│  │ ⚡ Flows  │ │                                                  │ │
│  │ ⏰ Jobs   │ │                                                  │ │
│  │           │ │                                                  │ │
│  │ ──────── │ │                                                  │ │
│  │ 👥 Team   │ │                                                  │ │
│  │ 💳 Billing│ │                                                  │ │
│  │ ⚙️ Settings│ │                                                 │ │
│  └───────────┘ └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Screen Descriptions

### 1. Home / Command Center

```
┌─────────────────────────────────────────────────────────────────┐
│  Good morning, Bharat 👋                                        │
│                                                                 │
│  ┌─── AI Insights ──────────────────────────────────────────┐  │
│  │ 🔴 Revenue down 12% this week — North region impacted    │  │
│  │ 🟡 3 data sources have stale data (>7 days old)          │  │
│  │ 🟢 Dashboard "Sales Overview" viewed 47 times this week  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ Quick Actions ──────┐ ┌─ Recent Activity ────────────────┐│
│  │ [📤 Upload Data]      │ │ ● Ran query on sales.csv  2m ago ││
│  │ [💬 Ask AI]            │ │ ● Updated Sales Dashboard  1h    ││
│  │ [📊 New Dashboard]    │ │ ● Generated Q2 Report      3h    ││
│  │ [📄 New Report]       │ │ ● Cleaned customer_data    1d    ││
│  └───────────────────────┘ └──────────────────────────────────┘│
│                                                                 │
│  ┌─ Pinned Dashboards ─────────────────────────────────────┐   │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │   │
│  │ │ Sales    │ │ Finance  │ │ Ops      │ │ +        │    │   │
│  │ │ Overview │ │ Summary  │ │ Metrics  │ │ Add      │    │   │
│  │ │ $2.4M ↑  │ │ $890K ↓  │ │ 99.2% ↑  │ │          │    │   │
│  │ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2. AI Chat Interface (Chat with Data)

```
┌─────────────────────────────────────────────────────────────────┐
│  Chat with Data                        Source: sales_2026.csv ▾ │
│                                                                 │
│  ┌─ Chat Area ─────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │  You: Show me monthly revenue trends for Q1              │   │
│  │                                                          │   │
│  │  AI: Here's the revenue trend for Q1 2026:               │   │
│  │                                                          │   │
│  │  ┌──────────────────────────────────────┐               │   │
│  │  │  📈 Revenue Trend (Line Chart)       │               │   │
│  │  │  Jan: $780K → Feb: $820K → Mar: $800K│               │   │
│  │  └──────────────────────────────────────┘               │   │
│  │                                                          │   │
│  │  Key findings:                                           │   │
│  │  • Total Q1 revenue: $2.4M                              │   │
│  │  • Feb was the strongest month (+5.1% MoM)              │   │
│  │  • March showed a slight dip (-2.4% MoM)               │   │
│  │                                                          │   │
│  │  Suggested follow-ups:                                   │   │
│  │  [What caused the March dip?]                           │   │
│  │  [Compare to Q1 2025]                                   │   │
│  │  [Forecast Q2 revenue]                                  │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 💬 Ask a question about your data...            [Send ▶] │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Dashboard Builder

```
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard Builder — Sales Overview          [Save] [Share] [...│
│                                                                 │
│  ┌─ Toolbar ───────────────────────────────────────────────┐   │
│  │ [+ Widget ▾]  [📅 Date Range ▾]  [🔍 Filter ▾]  [↻]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────┐┌────────┐┌────────┐┌────────┐                     │
│  │ $2.4M  ││ 12,340 ││ +15%   ││ $194   │                     │
│  │Revenue ││ Orders ││ Growth ││  AOV   │                     │
│  │  ↑ 8%  ││  ↑ 12% ││ vs LY  ││ ↓ 3%  │                     │
│  └────────┘└────────┘└────────┘└────────┘                     │
│                                                                 │
│  ┌─────────────────────────┐┌──────────────────────┐           │
│  │                         ││                      │           │
│  │   📈 Revenue by Month   ││   🥧 Revenue by      │           │
│  │   (Line Chart)          ││   Region (Pie)       │           │
│  │                         ││                      │           │
│  │   [Interactive chart]    ││   [Interactive chart] │           │
│  │                         ││                      │           │
│  └─────────────────────────┘└──────────────────────┘           │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │                                                   │          │
│  │   📊 Top Products by Revenue (Bar Chart)          │          │
│  │   [Interactive chart]                             │          │
│  │                                                   │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Data Connectors

```
┌─────────────────────────────────────────────────────────────────┐
│  Data Connectors                               [+ New Connection│
│                                                                 │
│  ┌─ Active Connections ────────────────────────────────────┐   │
│  │                                                          │   │
│  │ ┌─────────────────────────────────────────────────────┐ │   │
│  │ │ 🐘 PostgreSQL — Production DB                       │ │   │
│  │ │ Status: ● Connected  |  Last sync: 2h ago           │ │   │
│  │ │ Tables: 24  |  Rows: 1.2M  |  [Sync Now] [Edit]    │ │   │
│  │ └─────────────────────────────────────────────────────┘ │   │
│  │                                                          │   │
│  │ ┌─────────────────────────────────────────────────────┐ │   │
│  │ │ 📊 Google Sheets — Sales Tracker                    │ │   │
│  │ │ Status: ● Connected  |  Last sync: 15m ago          │ │   │
│  │ │ Sheets: 3   |  Rows: 8.4K  |  [Sync Now] [Edit]    │ │   │
│  │ └─────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─ Available Connectors ──────────────────────────────────┐   │
│  │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │   │
│  │ │MySQL│ │Mongo│ │Snow-│ │ S3  │ │Sales│ │ Hub │      │   │
│  │ │     │ │DB   │ │flake│ │     │ │force│ │Spot │      │   │
│  │ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Design System Specifications

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Background | #FFFFFF | #0F172A |
| Surface | #F8FAFC | #1E293B |
| Primary | #3B82F6 (Blue) | #60A5FA |
| Success | #10B981 | #34D399 |
| Warning | #F59E0B | #FBBF24 |
| Error | #EF4444 | #F87171 |
| Text Primary | #0F172A | #F1F5F9 |
| Text Secondary | #64748B | #94A3B8 |
| Border | #E2E8F0 | #334155 |
| Font Family | Inter (UI), JetBrains Mono (code) | Same |
| Border Radius | 8px (cards), 6px (buttons), 4px (inputs) | Same |
| Shadows | 0 1px 3px rgba(0,0,0,0.1) | 0 1px 3px rgba(0,0,0,0.3) |

### Responsive Breakpoints

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Mobile | < 768px | Sidebar hidden (hamburger), single column |
| Tablet | 768-1024px | Sidebar collapsed (icons only), 2 columns |
| Desktop | 1024-1440px | Full sidebar, 3 columns |
| Large | > 1440px | Full sidebar, 4 columns, wider charts |

### Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation (all interactive elements)
- Screen reader labels (aria-label, aria-describedby)
- Focus indicators (visible focus rings)
- Color contrast ratio ≥ 4.5:1 for text
- Motion: respect `prefers-reduced-motion`
- Font scaling: rem-based sizing, no fixed px for text

---

# PHASE 16: PRODUCT ROADMAP

## Phase 1: Foundation (Days 1-30)

*Goal: Unify the existing product into a cohesive platform*

| Feature | Business Value | Complexity | Effort | Revenue Impact | Priority |
|---------|---------------|-----------|--------|---------------|----------|
| UI Redesign (new nav + layout) | 9/10 | Medium | 2 weeks | High — first impression | P0 |
| Workspace model (multi-tenant DB) | 8/10 | High | 2 weeks | High — enables teams | P0 |
| OAuth (Google + Microsoft) | 7/10 | Low | 3 days | Medium — reduces signup friction | P0 |
| RBAC (5 roles) | 7/10 | Medium | 1 week | Medium — enterprise requirement | P0 |
| Dashboard persistence (save/load) | 8/10 | Low | 3 days | High — core feature gap | P0 |
| Dark mode | 5/10 | Low | 2 days | Low — nice-to-have | P1 |
| Invite team members | 7/10 | Low | 3 days | High — viral growth | P0 |

**Deliverable**: Unified platform with auth, workspaces, and redesigned UI.

## Phase 2: Growth Features (Days 31-90)

*Goal: Add features that drive conversion from free to paid*

| Feature | Business Value | Complexity | Effort | Revenue Impact | Priority |
|---------|---------------|-----------|--------|---------------|----------|
| Database connectors (PostgreSQL, MySQL) | 9/10 | Medium | 2 weeks | Very High — unlocks enterprise | P0 |
| Dashboard builder (drag-drop) | 9/10 | High | 3 weeks | Very High — core differentiator | P0 |
| Stripe billing integration | 10/10 | Medium | 1 week | Critical — enables revenue | P0 |
| Scheduled reports (email) | 8/10 | Medium | 1 week | High — retention driver | P0 |
| Knowledge Hub (RAG + vector DB) | 8/10 | High | 2 weeks | High — unique differentiator | P1 |
| Data cleaning (auto-fix) | 7/10 | Medium | 1 week | Medium — productivity feature | P1 |
| AI insights (proactive alerts) | 7/10 | High | 2 weeks | High — engagement driver | P1 |
| API for external integrations | 6/10 | Medium | 1 week | Medium — platform play | P2 |

**Deliverable**: Revenue-generating platform with billing, connectors, and dashboard builder.

## Phase 3: Enterprise Ready (Months 4-6)

*Goal: Land first enterprise customers*

| Feature | Business Value | Complexity | Effort | Revenue Impact | Priority |
|---------|---------------|-----------|--------|---------------|----------|
| SSO / SAML | 9/10 | High | 2 weeks | Very High — enterprise gate | P0 |
| Audit logs | 8/10 | Medium | 1 week | High — compliance requirement | P0 |
| Forecasting (Prophet + XGBoost) | 8/10 | High | 3 weeks | High — premium feature | P0 |
| Automation workflows | 8/10 | Very High | 4 weeks | High — stickiness | P1 |
| More connectors (Snowflake, S3, MongoDB) | 7/10 | Medium | 3 weeks | High — broader market | P1 |
| White label reports | 6/10 | Medium | 1 week | Medium — agency use case | P1 |
| SCIM provisioning | 5/10 | Medium | 1 week | Medium — enterprise ops | P2 |
| Data lineage | 6/10 | High | 2 weeks | Medium — governance | P2 |

**Deliverable**: Enterprise-ready platform with SSO, audit logs, forecasting, and automation.

## Phase 4: Scale & Moat (Months 7-12)

*Goal: Build competitive moat and scale to $1M ARR*

| Feature | Business Value | Complexity | Effort | Revenue Impact | Priority |
|---------|---------------|-----------|--------|---------------|----------|
| Embedded analytics (iframe SDK) | 8/10 | Medium | 2 weeks | High — new revenue stream | P0 |
| Business app connectors (Salesforce, HubSpot) | 8/10 | High | 4 weeks | High — market expansion | P0 |
| Mobile responsive app | 7/10 | Medium | 3 weeks | Medium — executive users | P1 |
| Marketplace (community templates) | 7/10 | High | 4 weeks | Medium — ecosystem | P1 |
| Real-time data streaming | 6/10 | Very High | 4 weeks | Medium — advanced use case | P2 |
| On-premise deployment option | 8/10 | Very High | 6 weeks | High — regulated industries | P2 |
| Multi-language support (i18n) | 5/10 | Medium | 2 weeks | Medium — global market | P2 |
| HIPAA compliance | 7/10 | High | 4 weeks | High — healthcare vertical | P2 |
| SOC 2 certification | 8/10 | Very High | 8 weeks | Very High — enterprise trust | P1 |
| Custom AI model training | 6/10 | Very High | 6 weeks | Medium — power users | P3 |

**Deliverable**: Scaled platform with embedded analytics, broad connectivity, mobile, and compliance certifications.

## Priority Scoring Formula

```
Priority Score = (Business Value × 0.3) + (Revenue Impact × 0.3) +
                 (1/Complexity × 0.2) + (1/Effort × 0.2)

Scale: 1-10 for each dimension
P0: Score ≥ 8 — Must have, do immediately
P1: Score 6-8 — Should have, plan for next sprint
P2: Score 4-6 — Nice to have, backlog
P3: Score < 4 — Future consideration
```

## Key Milestones

```
Month 1:  ✅ Unified platform with new UI + workspaces + OAuth
Month 2:  ✅ Dashboard builder + first 2 DB connectors
Month 3:  ✅ Stripe billing live → first paying customers
Month 4:  ✅ SSO + audit logs → enterprise pilot customers
Month 5:  ✅ Forecasting + automation workflows
Month 6:  ✅ Enterprise GA → first enterprise contracts
Month 9:  ✅ Embedded analytics + business connectors
Month 12: ✅ SOC 2 certified → $1M ARR target
```

---

# APPENDIX: MIGRATION STRATEGY

## From Current State to Target

### Frontend Migration: React → Angular 20+

| Phase | Action | Timeline |
|-------|--------|----------|
| 1 | Set up Angular project alongside React | Week 1 |
| 2 | Migrate shared components (navbar, sidebar, charts) | Week 2-3 |
| 3 | Migrate auth flow (login, signup, OAuth) | Week 3 |
| 4 | Migrate tool pages (one per day, 8 total) | Week 4-5 |
| 5 | Migrate workspace views | Week 5 |
| 6 | Add NgRx state management | Week 6 |
| 7 | QA, testing, cutover | Week 7 |

### Backend Evolution: Monolith → Modular Monolith → Services

| Phase | Architecture | When |
|-------|-------------|------|
| Current | Single FastAPI app | Now |
| Phase 2 | Modular monolith (routers as modules, Celery for async) | Month 2-3 |
| Phase 3 | Extract auth + billing as separate services | Month 6 |
| Phase 4 | Extract AI engine + connectors as services | Month 9-12 |

### Database Migration: SQLite → PostgreSQL

| Step | Action |
|------|--------|
| 1 | Add Alembic for migrations |
| 2 | Create PostgreSQL schema matching current models |
| 3 | Add multi-tenant schema support |
| 4 | Migrate existing data (pg_dump compatible export) |
| 5 | Switch DATABASE_URL to PostgreSQL |
| 6 | Add connection pooling (pgbouncer) |

---

*This blueprint is a living document. Update it as features ship and priorities evolve.*
