@echo off
echo ===================================================
echo   CarbonCompass GCP Deployment
echo ===================================================
echo.
echo Setting active project to carbon-500112...
call gcloud config set project carbon-500112

echo.
echo Triggering deployment to Google Cloud Run (asia-south1)...
call gcloud run deploy carbon-compass --source . --region asia-south1 --allow-unauthenticated --set-env-vars=JWT_SECRET=secure_production_secret_key_change_me_later

echo.
echo Deployment finished!
pause
