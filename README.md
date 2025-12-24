# CAN 2025 Fan Notification Platform

Multi-cloud platform for managing CAN 2025 fan notifications using **Azure**, **AWS**, and **Google Cloud**.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     AZURE       │     │      AWS        │     │      GCP        │
│  ─────────────  │     │  ─────────────  │     │  ─────────────  │
│  App Service    │────▶│  Lambda         │────▶│  BigQuery       │
│  (Node.js API)  │     │  (Events)       │     │  (Analytics)    │
│                 │     │                 │     │                 │
│  SQL Database   │     │  SES (Email)    │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Quick Start

### 1. Install Dependencies
```bash
cd api
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Run Locally (Development)
```bash
npm run dev
```

### 4. Test API
```bash
# Health check
curl http://localhost:3000/health

# Create a team
curl -X POST http://localhost:3000/teams \
  -H "Content-Type: application/json" \
  -d '{"name": "Lions de l Atlas", "country": "Maroc"}'
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /fans | Register a fan |
| POST | /fans/:id/teams | Subscribe to team |
| POST | /teams | Create team |
| POST | /matches | Create match → triggers notification |
| POST | /matches/:id/goals | Add goal → triggers notification |
| POST | /alerts | Publish alert → triggers notification |

## Project Structure

```
├── api/                 # Azure App Service (Node.js)
│   ├── src/
│   │   ├── index.js     # Entry point
│   │   ├── config/      # Database config
│   │   ├── routes/      # API endpoints
│   │   └── services/    # Outbox service
├── database/            # SQL schemas
├── lambda/              # AWS Lambda (coming)
└── bigquery/            # GCP queries (coming)
```

## Events

- `match.scheduled` - When a match is created
- `goal.scored` - When a goal is added
- `alert.published` - When an alert is published

## License

MIT
