# Android Build ve Çalıştırma Script'i
# PowerShell'de çalıştır: .\build-android.ps1

Write-Host "🚀 Android Build Başlatılıyor..." -ForegroundColor Green

# Proje dizinine git
Set-Location $PSScriptRoot

# Metro bundler'ı arka planda başlat (opsiyonel - run-android otomatik başlatır)
# Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start"

# Android build ve yükleme
Write-Host "📱 Android uygulaması derleniyor ve cihaza yükleniyor..." -ForegroundColor Yellow
npm run android

# Alternatif: Sadece derleme (yükleme yok)
# cd android
# .\gradlew assembleDebug
# cd ..

Write-Host "✅ İşlem tamamlandı!" -ForegroundColor Green

