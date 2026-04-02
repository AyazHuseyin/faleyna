# Android Studio'yu Açma Script'i
# PowerShell'de çalıştır: .\open-android-studio.ps1

Write-Host "🔧 Android Studio açılıyor..." -ForegroundColor Green

# Proje dizinine git
Set-Location $PSScriptRoot

# Android Studio'yu aç (android klasörünü aç)
$androidStudioPath = "C:\Program Files\Android\Android Studio\bin\studio64.exe"
$androidProjectPath = Join-Path $PSScriptRoot "android"

if (Test-Path $androidStudioPath) {
    Start-Process $androidStudioPath -ArgumentList $androidProjectPath
    Write-Host "✅ Android Studio açıldı!" -ForegroundColor Green
} else {
    Write-Host "❌ Android Studio bulunamadı!" -ForegroundColor Red
    Write-Host "Manuel olarak Android Studio'yu açıp 'android' klasörünü açın." -ForegroundColor Yellow
    
    # Alternatif: Windows'ta varsayılan uygulama ile aç
    Start-Process $androidProjectPath
}

