# CAN 2025 Fan Notification Platform

Plateforme multi-cloud de notifications pour les fans de la CAN 2025.

## Architecture Multi-Cloud

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ARCHITECTURE                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │                    GCP (Cloud Run + Secret Manager)                       │  │
│   │                                                                           │  │
│   │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐       │  │
│   │  │  Artifact       │    │  Secret         │    │  Cloud Run      │       │  │
│   │  │  Registry       │───▶│  Manager        │───▶│  Services       │       │  │
│   │  │  (Images)       │    │  (Secrets)      │    │                 │       │  │
│   │  └─────────────────┘    └─────────────────┘    └────────┬────────┘       │  │
│   │                                                          │                │  │
│   │         ┌────────────────────────────────────────────────┼────────┐      │  │
│   │         │                                                │        │      │  │
│   │         ▼                                                ▼        ▼      │  │
│   │  ┌─────────────┐         ┌─────────────────┐    ┌─────────────┐         │  │
│   │  │  Frontend   │────────▶│  Backend API    │    │ notify-svc  │         │  │
│   │  │  (Next.js)  │         │  (Node.js)      │    │ (Node.js)   │         │  │
│   │  │  :3000      │         │  :8080          │    │ :8080       │         │  │
│   │  └─────────────┘         └────────┬────────┘    └──────▲──────┘         │  │
│   │                                   │                     │                │  │
│   └───────────────────────────────────┼─────────────────────┼────────────────┘  │
│                                       │                     │                    │
│                                       │ (1)                 │ (3)                │
│                                       ▼                     │                    │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │                    AZURE (Database)                                       │  │
│   │                 ┌─────────────────────┐                                   │  │
│   │                 │   Azure SQL DB      │                                   │  │
│   │                 │  (fans, teams,      │                                   │  │
│   │                 │   matches, goals)   │                                   │  │
│   │                 └─────────────────────┘                                   │  │
│   └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│                                       │ (2)                                      │
│                                       ▼                                          │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │                  AWS Lambda (eu-west-3 Paris)                             │  │
│   │  ┌─────────────────────────────────────────────────────────────────────┐ │  │
│   │  │         Lambda: can2025-event-processor                             │ │  │
│   │  │         (Function URL enabled)                                      │ │  │
│   │  │                                                                      │ │  │
│   │  │  Env Variables:                      Calls GCP notify-service       │ │  │
│   │  │  - GCP_NOTIFY_URL                    via HTTP POST                  │ │  │
│   │  │  - GCP_NOTIFY_TOKEN                                                 │ │  │
│   │  └─────────────────────────────────────────────────────────────────────┘ │  │
│   └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Structure du Projet

```
Fan-Notification-Platform/
├── api/                      # Backend Node.js (GCP Cloud Run)
├── notify-service/           # Notification Service (GCP Cloud Run)
├── frontend/                 # Frontend Next.js (GCP Cloud Run)
├── lambda/                   # AWS Lambda Event Processor
├── database/                 # Azure SQL Schema
└── docs/                     # Documentation
```

---

## 🚀 Déploiement Manuel - Guide Étape par Étape

### Étape 1: Prérequis

```bash
# Vérifier les outils
gcloud --version
aws --version
docker --version
```

### Étape 2: Configurer GCP

```bash
# Se connecter
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Activer les APIs
gcloud services enable run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com

# Créer Artifact Registry
gcloud artifacts repositories create can2025 \
  --repository-format=docker \
  --location=europe-west1 \
  --description="CAN 2025 Docker images"

# Configurer Docker pour GCP
gcloud auth configure-docker europe-west1-docker.pkg.dev
```

### Étape 3: Créer les Secrets GCP

```bash
# Azure SQL
echo -n "YOUR_DB_SERVER.database.windows.net" | gcloud secrets create azure-db-server --data-file=-
echo -n "YOUR_DB_NAME" | gcloud secrets create azure-db-name --data-file=-
echo -n "YOUR_DB_USER" | gcloud secrets create azure-db-user --data-file=-
echo -n "YOUR_DB_PASSWORD" | gcloud secrets create azure-db-password --data-file=-

# Token partagé (générer un UUID ou string aléatoire)
echo -n "YOUR_SHARED_SECRET_TOKEN" | gcloud secrets create notify-token --data-file=-

# Lambda URL (placeholder, on met à jour après)
echo -n "https://xxxxx.lambda-url.eu-west-3.on.aws/" | gcloud secrets create lambda-function-url --data-file=-

# Backend URL (placeholder, on met à jour après)
echo -n "https://placeholder.run.app" | gcloud secrets create backend-api-url --data-file=-

# Email Configuration (Gmail)
echo -n "smtp.gmail.com" | gcloud secrets create smtp-host --data-file=-
echo -n "587" | gcloud secrets create smtp-port --data-file=-
echo -n "votre-email@gmail.com" | gcloud secrets create smtp-user --data-file=-
echo -n "votre-app-password" | gcloud secrets create smtp-pass --data-file=-
```

### Étape 4: Donner accès aux Secrets

```bash
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')

for secret in azure-db-server azure-db-name azure-db-user azure-db-password notify-token lambda-function-url backend-api-url smtp-host smtp-port smtp-user smtp-pass; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

### Étape 5: Build et Push Images

```bash
PROJECT_ID=$(gcloud config get-value project)

# 1. Build et push notify-service
cd notify-service
docker build -t europe-west1-docker.pkg.dev/$PROJECT_ID/can2025/notify-service:latest .
docker push europe-west1-docker.pkg.dev/$PROJECT_ID/can2025/notify-service:latest

# 2. Build et push backend
cd ../api
docker build -t europe-west1-docker.pkg.dev/$PROJECT_ID/can2025/backend:latest .
docker push europe-west1-docker.pkg.dev/$PROJECT_ID/can2025/backend:latest

# 3. Build et push frontend (nécessite l'URL du backend au build)
# Récupérer l'URL backend d'abord ou utiliser un placeholder
export BACKEND_URL="https://can2025-backend-xxxxx.run.app" 
cd ../frontend
docker build \
  --build-arg NEXT_PUBLIC_API_URL=$BACKEND_URL \
  -t europe-west1-docker.pkg.dev/$PROJECT_ID/can2025/frontend:latest .
docker push europe-west1-docker.pkg.dev/$PROJECT_ID/can2025/frontend:latest
```

### Étape 6: Deploy notify-service

```bash
gcloud run deploy can2025-notify-service \
  --image europe-west1-docker.pkg.dev/$PROJECT_ID/can2025/notify-service:latest \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --set-secrets "NOTIFY_TOKEN=notify-token:latest,SMTP_HOST=smtp-host:latest,SMTP_PORT=smtp-port:latest,SMTP_USER=smtp-user:latest,SMTP_PASS=smtp-pass:latest" \
  --set-env-vars "NODE_ENV=production,LOG_LEVEL=info"
```

**⚠️ Noter l'URL du service** (ex: `https://can2025-notify-service-xxxxx.run.app`)

### Étape 7: Configurer AWS Lambda (eu-west-3)

```powershell
# PowerShell - Créer le zip
cd lambda
Compress-Archive -Path handler.py -DestinationPath function.zip -Force

# Obtenir le Role ARN
$ROLE_ARN = aws iam get-role --role-name can2025-lambda-role --query 'Role.Arn' --output text --no-cli-pager

# Créer la Lambda (eu-west-3)
aws lambda create-function `
  --function-name can2025-event-processor `
  --runtime python3.9 `
  --handler handler.lambda_handler `
  --role $ROLE_ARN `
  --zip-file fileb://function.zip `
  --timeout 30 `
  --memory-size 128 `
  --region eu-west-3 `
  --no-cli-pager

# Configurer variables d'environnement (remplacer l'URL notify-service)
aws lambda update-function-configuration `
  --function-name can2025-event-processor `
  --environment "Variables={GCP_NOTIFY_URL=https://can2025-notify-service-xxxxx.run.app/notify,GCP_NOTIFY_TOKEN=YOUR_SHARED_SECRET_TOKEN}" `
  --region eu-west-3 `
  --no-cli-pager

# Activer Function URL
aws lambda create-function-url-config `
  --function-name can2025-event-processor `
  --auth-type NONE `
  --region eu-west-3 `
  --no-cli-pager

# Ajouter permission publique
aws lambda add-permission `
  --function-name can2025-event-processor `
  --statement-id FunctionURLAllowPublicAccess `
  --action lambda:InvokeFunctionUrl `
  --principal "*" `
  --function-url-auth-type NONE `
  --region eu-west-3 `
  --no-cli-pager

# Obtenir l'URL Lambda
aws lambda get-function-url-config --function-name can2025-event-processor --query 'FunctionUrl' --output text --region eu-west-3 --no-cli-pager
```

**⚠️ Noter l'URL Lambda** (ex: `https://xxxxx.lambda-url.eu-west-3.on.aws/`)

### Étape 8: Mettre à jour le Secret Lambda URL

```bash
echo -n "https://xxxxx.lambda-url.eu-west-3.on.aws/" | gcloud secrets versions add lambda-function-url --data-file=-
```

### Étape 9: Deploy Backend

```bash
gcloud run deploy can2025-backend \
  --image europe-west1-docker.pkg.dev/$PROJECT_ID/can2025/backend:latest \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --set-secrets "DB_SERVER=azure-db-server:latest,DB_NAME=azure-db-name:latest,DB_USER=azure-db-user:latest,DB_PASSWORD=azure-db-password:latest,LAMBDA_FUNCTION_URL=lambda-function-url:latest" \
  --set-env-vars "NODE_ENV=production"
```

**⚠️ Noter l'URL du backend** (ex: `https://can2025-backend-xxxxx.run.app`)

### Étape 10: Mettre à jour le Secret Backend URL

```bash
echo -n "https://can2025-backend-xxxxx.run.app" | gcloud secrets versions add backend-api-url --data-file=-
```

### Étape 11: Deploy Frontend

```bash
gcloud run deploy can2025-frontend \
  --image europe-west1-docker.pkg.dev/$PROJECT_ID/can2025/frontend:latest \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi
```

---

## Vérification

```bash
# Logs notify-service
gcloud run logs read can2025-notify-service --region europe-west1

# Logs backend
gcloud run logs read can2025-backend --region europe-west1

# Logs Lambda
aws logs tail /aws/lambda/can2025-event-processor --follow --region eu-west-3 --no-cli-pager
```

---

## Ports

| Service | Port Local | Port Cloud Run |
|---------|------------|----------------|
| Frontend | 3000 | 3000 |
| Backend API | 8080 | 8080 |
| Notify Service | 9001 | 8080 |

---

## Répartition des Tâches (5 membres)

| Membre | Responsabilité |
|--------|---------------|
| 1 | GCP Artifact Registry (Étapes 2, 5) |
| 2 | GCP Cloud Run + Secret Manager (Étapes 3, 4, 6, 9, 11) |
| 3 | AWS Lambda + Function URL (Étape 7) |
| 4 | Azure SQL Database |
| 5 | Frontend + Intégration |
