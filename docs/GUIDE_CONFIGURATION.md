# CAN 2025 Fan Notification Platform
## Guide de Configuration Complet

---

## 1. Prérequis

### Comptes Cloud
- **GCP** - [console.cloud.google.com](https://console.cloud.google.com)
- **Azure** - [portal.azure.com](https://portal.azure.com)
- **AWS** - [console.aws.amazon.com](https://console.aws.amazon.com) (région: **eu-west-3 Paris**)

### Outils
```bash
node --version   # v18+
docker --version
gcloud --version
aws --version
```

---

## 2. Configuration Locale

### Backend API (Port 8080)
```bash
cd api
npm install
copy .env.example .env
npm run dev
```

### Notify Service (Port 9001)
```bash
cd notify-service
npm install
copy .env.example .env
npm run dev
```

### Frontend (Port 3000)
```bash
cd frontend
npm install
npm run dev
```

---

## 3. Azure SQL Database

1. Créer serveur SQL: `can2025-server`
2. Créer base: `can2025db`
3. Configurer Firewall (Allow Azure services + votre IP)
4. Exécuter `database/schema.sql`

**Credentials à noter:**
```
Server: can2025-server.database.windows.net
Database: can2025db
User: can2025admin
Password: ***
```

---

## 4. GCP - Configuration

### 4.1 Projet et APIs

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

### 4.2 Artifact Registry

```bash
gcloud artifacts repositories create can2025 \
  --repository-format=docker \
  --location=europe-west1

gcloud auth configure-docker europe-west1-docker.pkg.dev
```

### 4.3 Créer les Secrets

```bash
# Azure SQL
echo -n "can2025-server.database.windows.net" | gcloud secrets create azure-db-server --data-file=-
echo -n "can2025db" | gcloud secrets create azure-db-name --data-file=-
echo -n "can2025admin" | gcloud secrets create azure-db-user --data-file=-
echo -n "VOTRE_PASSWORD" | gcloud secrets create azure-db-password --data-file=-

# Token partagé
echo -n "VOTRE_TOKEN_SECRET" | gcloud secrets create notify-token --data-file=-

# Placeholders (à mettre à jour)
echo -n "https://placeholder" | gcloud secrets create backend-api-url --data-file=-

# Email Configuration (Gmail)
echo -n "smtp.gmail.com" | gcloud secrets create smtp-host --data-file=-
echo -n "587" | gcloud secrets create smtp-port --data-file=-
echo -n "votre-email@gmail.com" | gcloud secrets create smtp-user --data-file=-
echo -n "votre-app-password" | gcloud secrets create smtp-pass --data-file=-
```

### 4.4 Permissions Secrets

```bash
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')

for secret in azure-db-server azure-db-name azure-db-user azure-db-password notify-token lambda-function-url backend-api-url smtp-host smtp-port smtp-user smtp-pass; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

---

## 5. AWS Lambda (eu-west-3)

### 5.1 Créer le Rôle IAM

```powershell
# PowerShell
@"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }
  ]
}
"@ | Out-File -Encoding utf8 trust-policy.json

aws iam create-role `
  --role-name can2025-lambda-role `
  --assume-role-policy-document file://trust-policy.json `
  --no-cli-pager

aws iam attach-role-policy `
  --role-name can2025-lambda-role `
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole `
  --no-cli-pager
```

### 5.2 Créer la Lambda

```powershell
cd lambda

# Créer le zip
Compress-Archive -Path handler.py -DestinationPath function.zip -Force

# Obtenir Role ARN
$ROLE_ARN = aws iam get-role --role-name can2025-lambda-role --query 'Role.Arn' --output text --no-cli-pager

# Créer Lambda
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
```

### 5.3 Variables d'environnement

```powershell
aws lambda update-function-configuration `
  --function-name can2025-event-processor `
  --environment "Variables={GCP_NOTIFY_URL=https://can2025-notify-service-xxxxx.run.app/notify,GCP_NOTIFY_TOKEN=VOTRE_TOKEN_SECRET}" `
  --region eu-west-3 `
  --no-cli-pager
```

### 5.4 Function URL

```powershell
aws lambda create-function-url-config `
  --function-name can2025-event-processor `
  --auth-type NONE `
  --region eu-west-3 `
  --no-cli-pager

aws lambda add-permission `
  --function-name can2025-event-processor `
  --statement-id FunctionURLAllowPublicAccess `
  --action lambda:InvokeFunctionUrl `
  --principal "*" `
  --function-url-auth-type NONE `
  --region eu-west-3 `
  --no-cli-pager

# Obtenir URL
aws lambda get-function-url-config `
  --function-name can2025-event-processor `
  --query 'FunctionUrl' `
  --output text `
  --region eu-west-3 `
  --no-cli-pager
```

---

## 6. Déploiement GCP

### 6.1 Build et Push Images

```bash
PROJECT_ID=$(gcloud config get-value project)

# notify-service
cd notify-service
docker build -t europe-west1-docker.pkg.dev/$PROJECT_ID/can2025/notify-service:latest .
docker push europe-west1-docker.pkg.dev/$PROJECT_ID/can2025/notify-service:latest

# backend
cd ../api
docker build -t europe-west1-docker.pkg.dev/$PROJECT_ID/can2025/backend:latest .
docker push europe-west1-docker.pkg.dev/$PROJECT_ID/can2025/backend:latest

# frontend (nécessite l'URL du backend au build)
# Récupérer l'URL backend d'abord ou utiliser un placeholder si 1er déploiement
export BACKEND_URL="https://can2025-backend-xxxxx.run.app" 
cd ../frontend
docker build \
  --build-arg NEXT_PUBLIC_API_URL=$BACKEND_URL \
  -t europe-west1-docker.pkg.dev/$PROJECT_ID/can2025/frontend:latest .
docker push europe-west1-docker.pkg.dev/$PROJECT_ID/can2025/frontend:latest
```

### 6.2 Deploy notify-service

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

> ⚠️ **Noter l'URL** et mettre à jour Lambda `GCP_NOTIFY_URL`

### 6.3 Mettre à jour Secret Lambda URL

```bash
echo -n "https://xxxxx.lambda-url.eu-west-3.on.aws/" | gcloud secrets versions add lambda-function-url --data-file=-
```

### 6.4 Deploy Backend

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

> ⚠️ **Noter l'URL Backend**

### 6.5 Mettre à jour Secret Backend URL

```bash
echo -n "https://can2025-backend-xxxxx.run.app" | gcloud secrets versions add backend-api-url --data-file=-
```

### 6.6 Deploy Frontend

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

## 7. Vérification

### Logs
```bash
# GCP
gcloud run logs read can2025-notify-service --region europe-west1
gcloud run logs read can2025-backend --region europe-west1

# AWS
aws logs tail /aws/lambda/can2025-event-processor --follow --region eu-west-3 --no-cli-pager
```

### Test notify-service
```bash
curl -X POST https://can2025-notify-service-xxxxx.run.app/notify \
  -H "Content-Type: application/json" \
  -H "X-Notify-Token: VOTRE_TOKEN_SECRET" \
  -d '{"channel":"sms","recipients":["+212xxx"],"message":"Test","eventType":"test"}'
```

---

## 8. Récapitulatif Secrets

| Secret | Valeur | Utilisé par |
|--------|--------|-------------|
| azure-db-server | xxx.database.windows.net | Backend |
| azure-db-name | can2025db | Backend |
| azure-db-user | can2025admin | Backend |
| azure-db-password | *** | Backend |
| lambda-function-url | https://xxxxx.lambda-url.eu-west-3.on.aws/ | Backend |
| notify-token | shared-token | notify-service, Lambda |
| backend-api-url | https://can2025-backend-xxx.run.app | Frontend |

---

## 9. Ordre de Déploiement

1. ✅ Azure SQL Database
2. ✅ GCP Secrets (créer tous)
3. ✅ AWS Lambda Role + Function
4. ✅ Build & Push images
5. ✅ Deploy notify-service → mettre à jour Lambda env
6. ✅ Activer Function URL → mettre à jour secret lambda-function-url
7. ✅ Deploy Backend → mettre à jour secret backend-api-url
8. ✅ Deploy Frontend

---

**Bonne configuration ! 🚀**
