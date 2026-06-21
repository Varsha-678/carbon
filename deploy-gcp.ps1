# Set GCP Project ID
$PROJECT_ID = "carbon1-500115"

Write-Host "Setting active GCP project to $PROJECT_ID..." -ForegroundColor Green
gcloud config set project $PROJECT_ID

Write-Host "Deploying CarbonCompass to Google Cloud Run..." -ForegroundColor Green
Write-Host "This will upload source code, build the container image in the cloud via Google Cloud Build, and deploy to Cloud Run." -ForegroundColor Green

# Trigger deployment
gcloud run deploy carbon-compass --source . --region asia-south1 --allow-unauthenticated --set-env-vars=JWT_SECRET=secure_production_secret_key_change_me_later

Write-Host "Deployment completed!" -ForegroundColor Green
