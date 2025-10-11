# create_project.ps1
# Crea l'estructura mínima del projecte VEED demo (Windows PowerShell)
$proj = "veed_fabric_demo"
Write-Host "Creant projecte en .\$proj ..."
if (-not (Test-Path $proj)) { New-Item -ItemType Directory -Path $proj | Out-Null }
Set-Location $proj

# requirements.txt
@"
Flask
requests
gTTS
python-dotenv
pydub
"@ | Out-File -Encoding UTF8 requirements.txt

# app.py - AFegeix cache efímer, trim d'audio (opcional), resolució 480p
@'
import os
import time
import uuid
import hashlib
import shutil
import tempfile
import atexit
from flask import Flask, request, jsonify, render_template_string, send_file, abort
from gtts import gTTS
import requests

# ---- Config / Llegir variables d'entorn ----
FAL_KEY = os.environ.get("FAL_KEY")
if not FAL_KEY:
    raise RuntimeError("FAL_KEY no trobada a les variables d'entorn. Posa-la abans d'executar l'app.")

# PUBLIC_URL (ngrok) - opcional: pots posar-lo a la sessió PowerShell abans d'arrencar
PUBLIC_URL = os.environ.get("PUBLIC_URL")  # ex: https://abcd.ngrok-free.dev

ENDPOINT_ID = "veed/fabric-1.0"
BASE_URL = "https://queue.fal.run"
HEADERS = {"Authorization": f"Key {FAL_KEY}", "Content-Type": "application/json"}

# ---- Flask app i rutes estàtiques ----
app = Flask(__name__, static_folder="static")
UPLOAD_DIR = os.path.join(app.static_folder, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ---- Cache efímer en temps d'execució ----
CACHE = {}  # key -> local path (mp4)
CACHE_DIR = tempfile.mkdtemp(prefix="veed_cache_")
atexit.register(lambda: shutil.rmtree(CACHE_DIR, ignore_errors=True))

def make_key_from_file_and_text(image_path, text):
    h = hashlib.sha256()
    with open(image_path, "rb") as f:
        h.update(f.read())
    h.update(text.encode("utf-8"))
    return h.hexdigest()

# ---- Frontend minimal ----
INDEX_HTML = """<!doctype html>
<html>
<head><meta charset="utf-8"><title>VEED Fabric Demo</title></head>
<body>
  <h3>Demo: puja foto i escriu text</h3>
  <form id="form">
    <div><textarea id="text" rows="4" cols="60">Hola equip!</textarea></div>
    <div><input type="file" id="image" accept="image/*"/></div>
    <div><button type="button" id="send">Play</button></div>
  </form>
  <div id="status"></div>
  <div id="video"></div>
<script>
document.getElementById('send').addEventListener('click', async () => {
  const text = document.getElementById('text').value.trim();
  const image = document.getElementById('image').files[0];
  if (!text) { alert('Escriu un text'); return; }
  if (!image) { alert('Puja una imatge'); return; }
  const fd = new FormData();
  fd.append('text', text);
  fd.append('image', image);
  document.getElementById('status').innerText = 'Enviant...';
  const resp = await fetch('/generate', { method: 'POST', body: fd });
  const data = await resp.json();
  if (!resp.ok) {
    document.getElementById('status').innerText = 'Error: ' + (data.error || JSON.stringify(data));
    return;
  }
  document.getElementById('status').innerText = 'Generat. Carregant vídeo...';
  const v = document.createElement('video');
  v.controls = true;
  v.width = 640;
  v.src = data.video_url;
  document.getElementById('video').innerHTML = '';
  document.getElementById('video').appendChild(v);
  if (data.cached) {
    document.getElementById('status').innerText = 'Vídeo servit des de cache (instantani).';
  } else {
    document.getElementById('status').innerText = 'Vídeo generat (nou).';
  }
});
</script>
</body>
</html>
"""

@app.route("/")
def index():
    return render_template_string(INDEX_HTML)

# Ruta per servir vídeos cachejats per key
@app.route("/cached/<key>")
def serve_cached(key):
    path = CACHE.get(key)
    if not path or not os.path.exists(path):
        return abort(404)
    return send_file(path, mimetype="video/mp4")

# ---- Endpoint principal: genera o retorna cache ----
@app.route("/generate", methods=["POST"])
def generate():
    text = request.form.get("text", "").strip()
    img = request.files.get("image")
    if not text or not img:
        return jsonify({"error": "Falta texto o imagen"}), 400

    uid = str(uuid.uuid4())
    img_ext = os.path.splitext(img.filename)[1] or ".jpg"
    img_filename = f"{uid}{img_ext}"
    img_path = os.path.join(UPLOAD_DIR, img_filename)
    img.save(img_path)

    # clau cache
    key = make_key_from_file_and_text(img_path, text)
    # si cache existeix i fitxer existeix -> retornar URL cached
    if key in CACHE and os.path.exists(CACHE[key]):
        base = PUBLIC_URL if PUBLIC_URL else request.host_url.rstrip("/")
        public_url = f"{base}/cached/{key}"
        return jsonify({"video_url": public_url, "cached": True})

    # 1) generar mp3 amb gTTS
    mp3_filename = f"{uid}.mp3"
    mp3_path = os.path.join(UPLOAD_DIR, mp3_filename)
    try:
        tts = gTTS(text, lang="es")
        tts.save(mp3_path)
    except Exception as e:
        return jsonify({"error": "Error generant TTS", "detail": str(e)}), 500

    # 2) trim audio a 10s (opcional: pydub + ffmpeg)
    MAX_MS = 10000  # 10s
    try:
        from pydub import AudioSegment
        audio = AudioSegment.from_file(mp3_path)
        if len(audio) > MAX_MS:
            audio = audio[:MAX_MS]
            audio.export(mp3_path, format="mp3")
    except Exception as e:
        # si falla pydub o no hi ha ffmpeg, continuem amb el mp3 original
        print("pydub trim ignored:", e)

    # 3) construir URLs públiques perquè FAL pugui descarregar
    base = PUBLIC_URL if PUBLIC_URL else request.host_url.rstrip("/")
    image_url = f"{base}/static/uploads/{img_filename}"
    audio_url = f"{base}/static/uploads/{mp3_filename}"

    # 4) enviar job a FAL amb resolució 480p
    payload = {"image_url": image_url, "audio_url": audio_url, "resolution": "480p"}
    try:
        resp = requests.post(f"{BASE_URL}/{ENDPOINT_ID}", headers=HEADERS, json=payload)
        resp.raise_for_status()
    except Exception as e:
        return jsonify({"error": "Error enviant job a FAL", "detail": str(e), "payload": payload}), 500

    data = resp.json()
    request_id = data.get("request_id")
    status = data.get("status", "")

    # 5) polling (síncron, timeout controlat)
    max_wait = 180  # segons (ajusta si vols)
    waited = 0
    interval = 2
    while status not in ("COMPLETED", "FAILED") and waited < max_wait:
        time.sleep(interval)
        waited += interval
        try:
            status_resp = requests.get(f"{BASE_URL}/{ENDPOINT_ID}/requests/{request_id}/status",
                                       headers=HEADERS, params={"logs": 1})
            status_resp.raise_for_status()
            status = status_resp.json().get("status", status)
        except Exception as e:
            return jsonify({"error": "Error consultant estat", "detail": str(e)}), 500

    if status != "COMPLETED":
        return jsonify({"error": "Generació fallida o timeout", "status": status}), 500

    # 6) obtenir resultat i descarregar mp4 a cache efimer
    try:
        result_resp = requests.get(f"{BASE_URL}/{ENDPOINT_ID}/requests/{request_id}", headers=HEADERS)
        result_resp.raise_for_status()
        result = result_resp.json()
        video_url = result.get("video", {}).get("url")
        if not video_url:
            return jsonify({"error": "No s'ha retornat video_url", "result": result}), 500
    except Exception as e:
        return jsonify({"error": "Error obtenint resultat", "detail": str(e)}), 500

    cached_path = os.path.join(CACHE_DIR, f"{key}.mp4")
    try:
        with requests.get(video_url, stream=True) as r:
            r.raise_for_status()
            with open(cached_path, "wb") as f:
                shutil.copyfileobj(r.raw, f)
    except Exception as e:
        return jsonify({"error": "Error descarregant video", "detail": str(e)}), 500

    # guardar a cache en memòria
    CACHE[key] = cached_path

    public_cached_url = f"{base}/cached/{key}"
    return jsonify({"video_url": public_cached_url, "cached": False})

if __name__ == "__main__":
    # Executa a 0.0.0.0 perquè ngrok pugui fer el túnel
    app.run(host="0.0.0.0", port=5000, debug=True)
'@ | Out-File -Encoding UTF8 app.py

# crear static/uploads
if (-not (Test-Path "static\uploads")) { New-Item -ItemType Directory -Force -Path static\uploads | Out-Null }

# .env.example
@"
# Copia aquest fitxer a .env i posa la teva clau FAL_KEY si vols (opcional)
# FAL_KEY=la_teva_clau_fal_aqui
# PUBLIC_URL opcional (es pot posar per sessió o deixar que start detecti)
# PUBLIC_URL=https://<la_teva_ngrok_url>
"@ | Out-File -Encoding UTF8 .env.example

# start.ps1 (robust)
@'
# start.ps1 - versió robusta per PowerShell
Write-Host "Working dir: $PSScriptRoot"
Set-Location $PSScriptRoot

# Crear venv si no existeix
if (-Not (Test-Path .\venv)) {
    Write-Host 'Creant virtualenv...'
    py -3 -m venv .\venv
}

# Activar venv per la sessió actual
$activatePath = Join-Path $PSScriptRoot 'venv\Scripts\Activate.ps1'

# Permetre execució temporal dins la sessió
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

if (Test-Path $activatePath) {
    try {
        & "$activatePath"
        Write-Host "venv activat."
    } catch {
        Write-Warning "No s'ha pogut executar Activate.ps1 automàticament. Activa manualment amb:"
        Write-Host "  .\venv\Scripts\Activate.ps1"
    }
} else {
    Write-Warning "No s'ha trobat Activate.ps1 a: $activatePath"
}

# Instal·lar requirements si existeix
$req = Join-Path $PSScriptRoot 'requirements.txt'
if (Test-Path $req) {
    python -m pip install --upgrade pip
    pip install -r $req
} else {
    Write-Warning "requirements.txt no trobat a: $req"
}

# Intentar detectar PUBLIC_URL des de ngrok (API local)
$public = $null
try {
    $t = Invoke-RestMethod -UseBasicParsing -Uri 'http://127.0.0.1:4040/api/tunnels' -ErrorAction Stop
    if ($t.tunnels.Count -gt 0) {
        $public = $t.tunnels[0].public_url
        $env:PUBLIC_URL = $public
        Write-Host "PUBLIC_URL detectada automàticament: $public"
    }
} catch {
    # no passa res, seguim
}

# Si no s'ha detectat PUBLIC_URL, mostrem la comanda exacta per copiar/pegar
if (-not $public) {
    Write-Host ''
    Write-Host "No s'ha detectat PUBLIC_URL automàticament. Si ngrok està executant-se, copia la URL que mostra i assigna-la a la sessió:"
    Write-Host 'Exemple (copiar/pegar exactament a PowerShell):'
    Write-Host '$env:PUBLIC_URL = "https://trichogynial-kayce-nondevotional.ngrok-free.dev"'
    Write-Host ''
    Write-Host "Nota: substitueix la URL per la teva si és diferent. NO afegeixis una barra final '/'"
    Write-Host ''
}

# Comprovar FAL_KEY
Write-Host 'Comprovant si FAL_KEY està disponible a la sessió...'
py -c "import os; print('FAL_KEY OK' if os.getenv('FAL_KEY') else 'FAL_KEY MISSING')"

Write-Host ''
Write-Host "Ara s''arrencarà Flask (python app.py)."
Write-Host "Si PUBLIC_URL no està definida, l'app usarà request.host_url, però FAL no podrà accedir als fitxers si no és pública."
Write-Host ''

# Arrencar Flask
python (Join-Path $PSScriptRoot 'app.py')
'@ | Out-File -Encoding UTF8 start.ps1

# README.txt
@"
README - VEED Fabric demo (Windows)
==================================
Passos ràpids per fer la demo:
1) Obre una finestra PowerShell i arrenca ngrok (mantingues-la oberta):
ngrok http 5000
Observa la sortida i copia la URL pública https que mostra a 'Forwarding'.
Exemple: https://trichogynial-kayce-nondevotional.ngrok-free.dev
2) Obre UNA NOVA finestra PowerShell i entra al directori del projecte:
cd <ruta_on_has_creat_el_projecte>\veed_fabric_demo
3) (Opcional) Assigna la PUBLIC_URL a la sessió (copia la URL que ngrok et dóna). Exemple:
$env:PUBLIC_URL = "https://trichogynial-kayce-nondevotional.ngrok-free.dev"
Alternativament start.ps1 intentarà detectar-la automàticament si ngrok ja està corrent.
4) Comprova que FAL_KEY està disponible:
echo $env:FAL_KEY
5) Executa start.ps1 per crear/activar el venv, instal·lar deps i arrencar l'app:
.\start.ps1
6) Obre la PUBLIC_URL al navegador i fes la demo: puja una foto, escriu un text curt i prem Play.
Notes:
- Cada generació consumeix crèdit a fal.ai. Prova amb textos curts i resolució 480p.
- No comparteixis la teva FAL_KEY públicament.
"@ | Out-File -Encoding UTF8 README.txt

Write-Host "Projecte creat a: $(Get-Location)"
Write-Host "Llegeix README.txt per passos 1..6 i executa ngrok abans de llançar start.ps1 si vols que es detecti PUBLIC_URL automàticament."