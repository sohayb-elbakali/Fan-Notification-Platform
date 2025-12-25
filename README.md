# CAN 2025 Fan Notification Platform

Plateforme multi-cloud de notifications pour les fans de la CAN 2025.

## Architecture Multi-Cloud

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    GCP (Conteneurs + CI/CD)                  │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│   │  │  Artifact   │  │  Cloud Run  │  │    Cloud Build      │  │   │
│   │  │  Registry   │─▶│  Frontend   │  │    (CI/CD)          │  │   │
│   │  │             │  │  Backend    │  │                     │  │   │
│   │  └─────────────┘  └──────┬──────┘  └─────────────────────┘  │   │
│   └──────────────────────────┼──────────────────────────────────┘   │
│                              │                                       │
│   ┌──────────────────────────▼──────────────────────────────────┐   │
│   │                    AZURE (Base de données)                   │   │
│   │                 ┌─────────────────────┐                      │   │
│   │                 │   Azure SQL DB      │                      │   │
│   │                 │  (fans, teams,      │                      │   │
│   │                 │   matches, outbox)  │                      │   │
│   │                 └─────────────────────┘                      │   │
│   └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│   ┌──────────────────────────▼──────────────────────────────────┐   │
│   │                  AWS (Events + Notifications)                │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│   │  │ EventBridge │─▶│   Lambda    │─▶│       SES           │  │   │
│   │  │  (Bus)      │  │  (Handler)  │  │     (Email)         │  │   │
│   │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│   └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

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
│       └── services/outbox.js
├── frontend/                 # Frontend Next.js (GCP Cloud Run)
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   └── app/
│       ├── page.js           # Homepage
│       ├── teams/page.js     # Gestion équipes
│       ├── fans/page.js      # Gestion fans
│       ├── matches/page.js   # Gestion matchs + buts
│       └── alerts/page.js    # Alertes
├── database/                 # Azure SQL Schema
│   ├── schema.sql
│   └── seed.sql
├── lambda/                   # AWS Lambda
│   ├── handler.py
│   └── requirements.txt
├── aws/                      # AWS CloudFormation
│   └── cloudformation.json
└── cloudbuild.yaml          # GCP CI/CD Pipeline
```

## Quickstart Local

### 1. Backend API
```bash
cd api
npm install
cp .env.example .env
npm run dev
```

### 2. Frontend
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

### Déploiement automatique
Le pipeline Cloud Build se déclenche sur push vers `main`:
```bash
git push origin main
```

## Configuration AWS

### 1. Créer la stack CloudFormation
```bash
aws cloudformation create-stack \
  --stack-name can2025-notifications \
  --template-body file://aws/cloudformation.json \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters \
    ParameterKey=BackendApiUrl,ParameterValue=https://your-backend.run.app \
    ParameterKey=SesFromEmail,ParameterValue=noreply@yourdomain.com
```

### 2. Vérifier email SES
```bash
aws ses verify-email-identity --email-address noreply@yourdomain.com
```

## Événements

| Type | Déclencheur | Notification |
|------|-------------|--------------|
| `match.scheduled` | Création match | Email avec date/heure/stade |
| `goal.scored` | Ajout but | Email avec score |
| `alert.published` | Publication alerte | Email d'alerte |

## Répartition des Tâches (5 membres)

| Membre | Responsabilité | Livrables |
|--------|---------------|-----------|
| 1 | GCP Artifact Registry | Repository, naming, push/pull |
| 2 | GCP Cloud Run | Déploiement backend + frontend |
| 3 | Pipeline CI/CD | cloudbuild.yaml, triggers |
| 4 | Azure SQL Database | Schema, migration, outbox |
| 5 | AWS Events + Notifications | EventBridge, Lambda, SES |

## Démo (5-7 minutes)

1. **Push commit** → Cloud Build déploie automatiquement
2. **Créer fans** + abonnements via interface
3. **Créer match** → event `match.scheduled` → email
4. **Ajouter but** → event `goal.scored` → email  
5. **Publier alerte** → event `alert.published` → email
