 # Architecture Document — ETL-Style Layered Design

This document describes an ETL-style layered architecture (inspired by the provided diagram) and maps components to a practical implementation approach.

## Overview

The architecture follows a layered ETL (Extract → Transform → Load) pattern with clear separation of concerns: a controller accepts input (file upload or request), an ETL service orchestrates parsing and analysis, analyzers compute statistics, results are persisted to a repository, and server-side templates or JSON endpoints render charts consumed by a frontend.

```mermaid
flowchart TD
  A[User / Client] -->|Upload CSV / Request| B(ETL Controller)
  B --> C(ETL Service)
  C --> D[CSV Parser Utility]
  C --> E[Data Analyzer Factory]
  E --> F[Numeric / Categorical Analyzer]
  F --> G[Math Engine (e.g. Commons Math)]
  C --> H[Repository (JPA / ORM)]
  H --> I[(Relational DB - MySQL / Postgres)]
  H --> J[Server Templates (Thymeleaf) or JSON]
  J --> K[Chart.js Frontend]
```

## Components & Responsibilities

- **ETL Controller** — accepts uploads, validates input, enqueues or runs jobs.
- **ETL Service** — orchestrates parse → analyze → persist → respond; chooses analysis strategy.
- **CSV Parser Utility** — streaming parser, header normalization, type inference, cleansing.
- **Data Analyzer Factory** — instantiates analyzers per column/dataset.
- **Numeric / Categorical Analyzers** — compute aggregates (mean, median, histograms, counts).
- **Math Engine** — robust numeric library for stable aggregates (Commons Math or equivalent).
- **Repository (JPA / ORM layer)** — persist dataset metadata, summaries, and visualization payloads.
- **Presentation** — server templates or JSON endpoints; frontend visualizes with Chart.js.

## Data Flow (detailed)

1. Client uploads CSV to the `ETL Controller`.
2. `ETL Service` streams the file to `CSV Parser` to avoid memory spikes.
3. For each column, `Data Analyzer Factory` selects an analyzer; analyzers compute incremental aggregates.
4. On completion, `ETL Service` persists `Dataset`, `ColumnSummary`, and `AnalysisJob` via the repository.
5. Results are served to a result page (server-rendered or SPA) and visualized with Chart.js.

## Persistence (example models)

```prisma
model AnalysisJob {
  id        String   @id @default(uuid())
  status    String
  createdAt DateTime @default(now())
  dataset   Dataset?
}

model Dataset {
  id        String   @id @default(uuid())
  name      String
  rows      Int
  columns   ColumnSummary[]
}

model ColumnSummary {
  id         String @id @default(uuid())
  dataset    Dataset @relation(fields: [datasetId], references: [id])
  datasetId  String
  name       String
  type       String
  statsJson  Json
}
```

## Mapping to this repository (suggested files)

- `app/api/etl/upload/route.ts` — upload controller
- `lib/etl/service.ts` — ETL orchestration
- `lib/etl/csvParser.ts` — streaming CSV parser
- `lib/etl/factory.ts` — analyzer factory
- `lib/etl/analyzers/numeric.ts` — numeric analyzer
- `lib/db.ts` — persistence helpers (Prisma)
- `prisma/` — add `AnalysisJob`, `Dataset`, `ColumnSummary` models
- `app/results/[id]/page.tsx` — results page (Chart.js)

## Performance & Reliability

- Stream CSVs to avoid OOM.
- For very large files, implement sampling and async job queues.
- Persist compact visualization JSON to speed client rendering.

## Next steps I can implement for you

1. Add skeleton ETL files and a streaming CSV parser.
2. Add Prisma models and a migration for analysis tables.
3. Implement a simple numeric analyzer and a results page.

Tell me which step to start and I'll create a short plan and implement it.
