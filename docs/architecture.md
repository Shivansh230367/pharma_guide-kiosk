# System Architecture

## Overview

The Self-Service Pharma Inquiry & Alternative Discovery Kiosk is a
touchscreen-oriented web application designed for pharmacy environments.

The system allows customers to:

- Search medicines using approximate/fuzzy matching
- View medicine composition
- Check current stock availability
- Discover alternative brands with the same composition
- Compare prices and potential savings

Authorized pharmacy staff can additionally:

- Search the medicine inventory
- Update stock quantities
- Update shelf locations
- Update medicine prices
- Maintain controlled access through authentication
- Generate audit records for inventory changes

## Architecture

```text
                    ┌─────────────────────┐
                    │   Touchscreen User  │
                    │      / Kiosk        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    React + Vite     │
                    │   Tailwind CSS UI   │
                    └──────────┬──────────┘
                               │ REST API
                               ▼
                    ┌─────────────────────┐
                    │  Node.js + Express  │
                    │    Backend API      │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
          ┌─────────────────┐   ┌─────────────────┐
          │ Search Engine   │   │ Staff/Auth      │
          │ PostgreSQL      │   │ Authorization   │
          │ pg_trgm         │   │ Audit Logging   │
          └────────┬────────┘   └────────┬────────┘
                   │                     │
                   └──────────┬──────────┘
                              ▼
                    ┌─────────────────────┐
                    │    PostgreSQL DB    │
                    │                     │
                    │ compositions       │
                    │ medicines           │
                    │ inventory           │
                    │ staff               │
                    │ audit logs          │
                    └─────────────────────┘
