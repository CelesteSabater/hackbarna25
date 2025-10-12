# start.ps1 - versiÃ³ robusta per PowerShell
Write-Host "Working dir: $PSScriptRoot"
Set-Location $PSScriptRoot
# Crear venv si no existeix
if (-Not (Test-Path .\venv)) {
    Write-Host "Creant virtualenv..."
    py -3 -m venv .\venv
}
# Activar venv per la sessiÃ³ actual
$activatePath = Join-Path $PSScriptRoot "venv\Scripts\Activate.ps1"
# Permetre execuciÃ³ temporal dins la sessiÃ³
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
if (Test-Path $activatePath) {
    try {
        & "$activatePath"
        Write-Host "venv activat."
    } catch {
        Write-Warning "No s'ha pogut executar Activate.ps1 automÃ ticament. Activa manualment amb:"
        Write-Host "  .\venv\Scripts\Activate.ps1"
    }
} else {
    Write-Warning "No s'ha trobat Activate.ps1 a: $activatePath"
}
# InstalÂ·lar requirements si existeix
$req = Join-Path $PSScriptRoot "requirements.txt"
if (Test-Path $req) {
    python -m pip install --upgrade pip
    pip install -r $req
} else {
    Write-Warning "requirements.txt no trobat a: $req"
}
# Intentar detectar PUBLIC_URL des de ngrok (API lokal)
$public = $null
try {
    $t = Invoke-RestMethod -UseBasicParsing -Uri "http://127.0.0.1:4040/api/tunnels" -ErrorAction Stop
    if ($t.tunnels.Count -gt 0) {
        $public = $t.tunnels[0].public_url
        $env:PUBLIC_URL = $public
        Write-Host "PUBLIC_URL detectada automÃ ticament: $public"
    }
} catch {
    # no passa res, seguim
}
# Si no s'ha detectat PUBLIC_URL, mostrem la comanda exacta per copiar/pegar
if (-not $public) {
    Write-Host ""
    Write-Host "No s'ha detectat PUBLIC_URL automÃ ticament. Si ngrok estÃ  executant-se, copia la URL que mostra i assigna-la a la sessiÃ³:"
    Write-Host 'Exemple (copiar/pegar exactament a PowerShell):'
    Write-Host '$env:PUBLIC_URL = "https://trichogynial-kayce-nondevotional.ngrok-free.dev"'
    Write-Host ""
    Write-Host "Nota: substitueix la URL per la teva si Ã©s diferent. NO afegeixis una barra final '/'"
    Write-Host ""
}
# Comprovar FAL_KEY
Write-Host "Comprovant si FAL_KEY estÃ  disponible a la sessiÃ³..."
py -c "import os; print('FAL_KEY OK' if os.getenv('FAL_KEY') else 'FAL_KEY MISSING')"
Write-Host ""
Write-Host "Ara s''arrencarÃ  Flask (python app.py)."
Write-Host "Si PUBLIC_URL no estÃ  definida, l'app usarÃ  request.host_url, perÃ² FAL no podrÃ  accedir als fitxers si no Ã©s pÃºblica."
Write-Host ""
# Arrencar Flask
python (Join-Path $PSScriptRoot "app.py")
