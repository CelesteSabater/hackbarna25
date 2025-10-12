import os
import time
import uuid
from flask import Flask, request, jsonify, render_template_string
import requests

# Llegeix FAL_KEY de la variable d'entorn (has d'haver-la posat prÃ¨viament)
FAL_KEY = os.environ.get('FAL_KEY')
if not FAL_KEY:
    raise RuntimeError("FAL_KEY no trobada. Posa-la com a variable d'entorn.")
# PUBLIC_URL (opcional) - si vols forÃ§ar, posa-la a la sessiÃ³ amb $env:PUBLIC_URL
PUBLIC_URL = os.environ.get('PUBLIC_URL')
ENDPOINT_ID = "veed/fabric-1.0"
BASE_URL = "https://queue.fal.run"
HEADERS = {"Authorization": f"Key {FAL_KEY}", "Content-Type": "application/json"}

app = Flask(__name__, static_folder="static")
UPLOAD_DIR = os.path.join(app.static_folder, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

INDEX_HTML = """<!doctype html>
<html>
<head><meta charset="utf-8"><title>Mini demo VEED - audio + foto</title></head>
<body>
<h3>Puja una foto i un fitxer d'audio</h3>
<form id="form">
<div>
<label>Ã€udio (mp3/wav/...):</label><br>
<input type="file" id="audio" name="audio" accept="audio/*" />
</div>
<div>
<label>Foto (jpg/png):</label><br>
<input type="file" id="image" name="image" accept="image/*" />
</div>
<div style="margin-top:10px;">
<button type="button" id="send">Genera vÃ­deo</button>
</div>
</form>
<div id="status" style="margin-top:10px"></div>
<div id="video" style="margin-top:10px"></div>
<script>
document.getElementById('send').addEventListener('click', async () => {
    const audioInput = document.getElementById('audio');
    const imageInput = document.getElementById('image');
    if (!audioInput.files.length) { alert('Puja un fitxer d\\'Ã udio'); return; }
    if (!imageInput.files.length) { alert('Puja una imatge'); return; }
    const fd = new FormData();
    fd.append('audio', audioInput.files[0]);
    fd.append('image', imageInput.files[0]);
    document.getElementById('status').innerText = 'Enviant...';
    document.getElementById('video').innerHTML = '';
    try {
        const resp = await fetch('/generate', { method: 'POST', body: fd });
        const data = await resp.json();
        if (!resp.ok) {
            document.getElementById('status').innerText = 'Error: ' + (data.error || JSON.stringify(data));
            return;
        }
        document.getElementById('status').innerText = 'Generado. Cargando vÃ­deo...';
        const v = document.createElement('video');
        v.width = 640;
        v.controls = true;
        v.src = data.video_url;
        document.getElementById('video').appendChild(v);
        document.getElementById('status').innerText = 'Listo!';
    } catch (e) {
        document.getElementById('status').innerText = 'Error: ' + e;
    }
});
</script>
</body>
</html>
"""

@app.route("/")
def index():
    return render_template_string(INDEX_HTML)

ALLOWED_AUDIO_EXT = {'.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'}

@app.route("/generate", methods=["POST"])
def generate():
    img = request.files.get("image")
    audio = request.files.get("audio")
    if not img or not audio:
        return jsonify({"error": "Falta imagen o audio"}), 400

    uid = str(uuid.uuid4())

    # guardar imagen
    img_ext = os.path.splitext(img.filename)[1] or ".jpg"
    img_filename = f"{uid}{img_ext}"
    img_path = os.path.join(UPLOAD_DIR, img_filename)
    img.save(img_path)

    # guardar audio (no transformem res)
    audio_ext = os.path.splitext(audio.filename)[1].lower() or ".mp3"
    # si no tÃ© extensiÃ³ coneguda, acceptem igualment, perÃ² recomanem usar mp3/wav
    audio_filename = f"{uid}{audio_ext}"
    audio_path = os.path.join(UPLOAD_DIR, audio_filename)
    audio.save(audio_path)

    # Construir URLs que FAL ha de poder descarregar: REQUEREIX que PUBLIC_URL sigui pÃºblica (ngrok)
    base = PUBLIC_URL if PUBLIC_URL else request.host_url.rstrip("/")
    image_url = f"{base}/static/uploads/{img_filename}"
    audio_url = f"{base}/static/uploads/{audio_filename}"

    payload = {"image_url": image_url, "audio_url": audio_url, "resolution": "480p"}

    try:
        resp = requests.post(f"{BASE_URL}/{ENDPOINT_ID}", headers=HEADERS, json=payload)
        resp.raise_for_status()
    except Exception as e:
        return jsonify({"error": "Error al enviar job a FAL", "detail": str(e), "payload": payload}), 500

    data = resp.json()
    request_id = data.get("request_id")
    status = data.get("status", "")

    # poll del status
    max_wait = 180
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
            return jsonify({"error": "Error consultando estado", "detail": str(e)}), 500

    if status != "COMPLETED":
        return jsonify({"error": "GeneraciÃ³n fallida o timeout", "status": status}), 500

    try:
        result_resp = requests.get(f"{BASE_URL}/{ENDPOINT_ID}/requests/{request_id}", headers=HEADERS)
        result_resp.raise_for_status()
        result = result_resp.json()
        video_url = result.get("video", {}).get("url")
        if not video_url:
            return jsonify({"error": "No se devolviÃ³ video_url", "result": result}), 500
        return jsonify({"video_url": video_url})
    except Exception as e:
        return jsonify({"error": "Error al obtener resultado", "detail": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
