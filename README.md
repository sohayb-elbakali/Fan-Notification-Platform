# CAN 2025 Fan Notification Platform

Plateforme multi-cloud de notifications pour les fans de la CAN 2025.

## Architecture Multi-Cloud

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ARCHITECTURE                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │                    GCP (Backend + Notify Service)                         │  │
│   │  ┌─────────────────┐         ┌───────────────────┐                       │  │
│   │  │  Cloud Run      │─────────│  Cloud Run        │                       │  │
│   │  │  Backend API    │         │  notify-service   │                       │  │
│   │  │                 │         │  (SMS/Email)      │                       │  │
│   │  └────────┬────────┘         └───────────────────┘                       │  │
│   │           │                           ▲                                   │  │
│   │           │ Admin adds goal           │ HTTP POST                        │  │
│   └───────────┼───────────────────────────┼──────────────────────────────────┘  │
│               │                           │                                      │
│               │ (1) Write to DB           │ (3) Notify                          │
│               ▼                           │                                      │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │                    AZURE (Database)                                       │  │
│   │                 ┌─────────────────────┐                                   │  │
│   │                 │   Azure SQL DB      │                                   │  │
│   │                 │  (fans, teams,      │                                   │  │
│   │                 │   matches, goals)   │                                   │  │
│   │                 └─────────────────────┘                                   │  │
│   └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│               │ (2) Call Function URL                                           │
│               ▼                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │                  AWS (Event Processor Lambda)                             │  │
│   │  ┌─────────────────────────────────────────────────────────────────────┐ │  │
│   │  │         Lambda: can2025-event-processor                             │ │  │
│   │  │         (Function URL enabled)                                      │ │  │
│   │  │                                                                      │ │  │
│   │  │  Receives:                        Calls:                            │ │  │
│   │  │  {                                POST to GCP notify-service        │ │  │
│   │  │    "type": "goal.scored",         with SMS payload                  │ │  │
│   │  │    "matchId": "M123",                                               │ │  │
│   │  │    "minute": 63,                                                    │ │  │
│   │  │    "score": {"A":2,"B":1},                                          │ │  │
│   │  │    "recipients": ["+212..."]                                        │ │  │
│   │  │  }                                                                  │ │  │
│   │  └─────────────────────────────────────────────────────────────────────┘ │  │
│   └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Workflow

1. **Admin Action**: Admin adds a goal via the frontend
2. **Backend (GCP)**: 
   - Writes goal data to Azure SQL
   - Calls AWS Lambda Function URL with event payload
3. **Lambda (AWS)**: 
   - Processes the event
   - Calls GCP Cloud Run notify-service via HTTP POST
4. **notify-service (GCP)**:
   - Validates `X-Notify-Token` header
   - Logs the SMS payload
   - Stores notification (optional)
   - Returns 200 OK

## Structure du Projet

```
Fan-Notification-Platform/
├── api/                      # Backend Node.js (GCP Cloud Run)
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── config/database.js
│       ├── routes/
│       │   ├── matches.js     # Calls Lambda on goal add
│       │   └── ...
│       └── services/
│           └── lambda.js      # Lambda Function URL client
├── notify-service/           # GCP Cloud Run Notify Service
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js          # Express server
│       └── handlers/
│           └── notify.js      # SMS notification handler
├── frontend/                 # Frontend Next.js (GCP Cloud Run)
│   ├── Dockerfile
│   ├── package.json
│   └── app/
│       ├── page.js           # Homepage
│       ├── teams/page.js     # Team management
│       ├── fans/page.js      # Fan management
│       ├── matches/page.js   # Match management + goals
│       └── alerts/page.js    # Alerts
├── database/                 # Azure SQL Schema
│   ├── schema.sql
│   └── seed.sql
├── lambda/                   # AWS Lambda Event Processor
│   ├── handler.py
│   └── requirements.txt
└── cloudbuild.yaml          # GCP CI/CD Pipeline
```

## Configuration des Services

### A) AWS Lambda: `can2025-event-processor`

#### Créer la Lambda avec Function URL

```bash
# Créer la fonction Lambda
aws lambda create-function \
  --function-name can2025-event-processor \
  --runtime python3.9 \
  --handler handler.lambda_handler \
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-execution-role \
  --zip-file fileb://lambda/function.zip

# Activer Function URL
aws lambda create-function-url-config \
  --function-name can2025-event-processor \
  --auth-type NONE \
  --cors '{
    "AllowOrigins": ["*"],
    "AllowMethods": ["POST"],
    "AllowHeaders": ["Content-Type", "Authorization"]
  }'
```

#### Variables d'environnement Lambda

| Variable | Description | Exemple |
|----------|-------------|---------|
| `GCP_NOTIFY_URL` | URL du service notify sur GCP | `https://notify-service-xxxxx.run.app/notify` |
| `GCP_NOTIFY_TOKEN` | Token partagé pour authentification | `your-shared-secret-token` |

#### Payload reçu par Lambda

```json
{
  "type": "goal.scored",
  "matchId": "M123",
  "minute": 63,
  "score": {"A": 2, "B": 1},
  "recipients": ["+2126xxxxxxxx", "+33xxxxxxxxx"]
}
```

### B) GCP Cloud Run: `notify-service`

Un micro-service qui :
- Valide le header `X-Notify-Token`
- Log le payload SMS
- Stocke la notification (optionnel)
- Retourne 200 OK

#### Payload envoyé au notify-service

```json
{
  "channel": "sms",
  "recipients": ["+2126xxxxxxxx"],
  "message": "BUT! Maroc 2-1 à 63'.",
  "eventType": "goal.scored",
  "timestamp": "2025-01-15T15:30:00Z"
}
```

#### Variables d'environnement notify-service

| Variable | Description | Exemple |
|----------|-------------|---------|
| `NOTIFY_TOKEN` | Token pour validation des requêtes | `your-shared-secret-token` |
| `LOG_LEVEL` | Niveau de log | `info` |

### C) Backend GCP Cloud Run

Quand l'admin ajoute un but :
1. Écriture dans Azure SQL
2. Appel de la Lambda Function URL avec le payload minimal

#### Variables d'environnement Backend

| Variable | Description | Exemple |
|----------|-------------|---------|
| `LAMBDA_FUNCTION_URL` | URL de la Lambda AWS | `https://xxxxx.lambda-url.eu-west-1.on.aws/` |
| `DB_SERVER` | Serveur Azure SQL | `can2025-server.database.windows.net` |
| `DB_NAME` | Nom de la base | `can2025db` |
| `DB_USER` | Utilisateur | `can2025admin` |
| `DB_PASSWORD` | Mot de passe | `***` |

## Quickstart Local

### 1. Backend API
```bash
cd api
npm install
cp .env.example .env
# Éditer .env avec vos configurations
npm run dev
```

### 2. Notify Service
```bash
cd notify-service
npm install
cp .env.example .env
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

## Déploiement GCP

### Prérequis
1. Créer un projet GCP
2. Activer les APIs: Cloud Run, Artifact Registry, Cloud Build
3. Créer un dépôt Artifact Registry:
```bash
gcloud artifacts repositories create can2025 \
  --repository-format=docker \
  --location=europe-west1
```

### Déployer notify-service
```bash
cd notify-service
gcloud run deploy notify-service \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars "NOTIFY_TOKEN=your-shared-secret"
```

### Déployer le Backend
```bash
cd api
gcloud run deploy can2025-backend \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars "LAMBDA_FUNCTION_URL=https://xxxxx.lambda-url.eu-west-1.on.aws/"
```

### Déploiement automatique
Le pipeline Cloud Build se déclenche sur push vers `main`:
```bash
git push origin main
```

## Configuration AWS

### 1. Créer la Lambda avec Function URL
```bash
# Créer le package
cd lambda
zip -r function.zip handler.py

# Créer la fonction
aws lambda create-function \
  --function-name can2025-event-processor \
  --runtime python3.9 \
  --handler handler.lambda_handler \
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-execution-role \
  --zip-file fileb://function.zip \
  --environment "Variables={GCP_NOTIFY_URL=https://notify-service-xxxxx.run.app/notify,GCP_NOTIFY_TOKEN=your-secret}"

# Activer Function URL
aws lambda create-function-url-config \
  --function-name can2025-event-processor \
  --auth-type NONE
```

### 2. Obtenir l'URL de la Function
```bash
aws lambda get-function-url-config \
  --function-name can2025-event-processor
```

## Événements

| Type | Déclencheur | Notification |
|------|-------------|--------------|
| `match.scheduled` | Création match | SMS avec date/heure/stade |
| `goal.scored` | Ajout but | SMS avec score |
| `match.ended` | Fin du match | SMS avec score final |

## Répartition des Tâches (5 membres)

| Membre | Responsabilité | Livrables |
|--------|---------------|-----------|
| 1 | GCP Artifact Registry | Repository, naming, push/pull |
| 2 | GCP Cloud Run (Backend + notify-service) | Déploiement des 2 services |
| 3 | Pipeline CI/CD | cloudbuild.yaml, triggers |
| 4 | Azure SQL Database | Schema, migration, connexion |
| 5 | AWS Lambda + Function URL | Lambda, configuration, tests |

## Démo (5-7 minutes)

1. **Push commit** → Cloud Build déploie automatiquement
2. **Créer fans** + abonnements via interface
3. **Créer match** → event `match.scheduled` → SMS notification
4. **Ajouter but** → event `goal.scored` → SMS notification
5. **Montrer les logs** Lambda et notify-service

## Sécurité

- Communication inter-services sécurisée via token partagé (`X-Notify-Token`)
- Lambda Function URL avec CORS configuré
- Azure SQL avec firewall et connexion chiffrée
