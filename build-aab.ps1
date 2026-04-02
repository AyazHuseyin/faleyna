# Android AAB (App Bundle) Build Script
# Dahili test için release AAB dosyası oluşturur

Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
cd android
.\gradlew clean

Write-Host "📦 Building Release AAB..." -ForegroundColor Green
.\gradlew bundleRelease

Write-Host "✅ Build completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 AAB dosyası konumu:" -ForegroundColor Cyan
Write-Host "   android\app\build\outputs\bundle\release\app-release.aab" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Dahili test için Play Console'a yükleyebilirsin!" -ForegroundColor Green

cd ..

