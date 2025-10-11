# create_project.ps1
$projDir = "VONAGE_PROJECT"
if (-not (Test-Path $projDir)) { New-Item -ItemType Directory -Path $projDir | Out-Null }
Set-Location $projDir

# requirements.txt
@'
flask
python-dotenv
requests
openai
vonage
opencv-python-headless
ffmpeg-python
deepface
numpy
'@ | Out-File -Encoding UTF8 requirements.txt

# .env.example
@'
# COPY to .env and fill values (do NOT commit .env)
VONAGE_API_KEY=
VONAGE_API_SECRET=
VONAGE_FROM=+34XXXXXXXXX
OPENAI_API_KEY=
OPENAI_MODEL=chatgpt5_mini
'@ | Out-File -Encoding UTF8 .env.example

# index.html (debug recorder + UI)
@'
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>VONAGE PROJECT — Record / Upload (DEBUG)</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    #preview { border: 1px solid #ccc; display:block; margin-bottom: 10px; }
    #out { white-space: pre-wrap; background:#f7f7f7; padding:10px; border-radius:6px; margin-top:10px; }
    #transcript, #description { background:#fff; padding:10px; border:1px solid #ddd; min-height:40px; margin-bottom:10px; }
  </style>
</head>
<body>
  <h2>VONAGE PROJECT — Record or Upload (DEBUG)</h2>

  <video id="preview" autoplay muted width="360" height="270"></video><br>
  <button id="start">Start recording</button>
  <button id="stop" disabled>Stop</button>
  <input type="file" id="fileInput" accept="video/*"><br><br>

  <input type="text" id="phone" placeholder="+34XXXXXXXXX (optional SMS)"><br><br>
  <button id="sendFile">Send file</button>

  <div><strong>Transcript</strong></div>
  <div id="transcript"></div>

  <div><strong>Health / Face Description</strong></div>
  <div id="description"></div>

  <div><strong>Debug / Raw JSON</strong></div>
  <pre id="out"></pre>

<script>
let mediaRecorder, recordedBlobs;
const preview = document.getElementById('preview');
const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');
const out = document.getElementById('out');
const transcriptDiv = document.getElementById('transcript');
const descDiv = document.getElementById('description');

startBtn.onclick = async () => {
  recordedBlobs = [];
  transcriptDiv.innerText = "";
  descDiv.innerText = "";
  out.innerText = "";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({video:true, audio:true});
    preview.srcObject = stream;
    let mimeType = '';
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) mimeType = 'video/webm;codecs=vp9,opus';
    else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) mimeType = 'video/webm;codecs=vp8,opus';
    else if (MediaRecorder.isTypeSupported('video/webm')) mimeType = 'video/webm';
    mediaRecorder = mimeType ? new MediaRecorder(stream, {mimeType}) : new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => { if (e.data && e.data.size) recordedBlobs.push(e.data); console.log('chunk size', e.data ? e.data.size : 0); };
    mediaRecorder.onstop = async () => {
      let total = recordedBlobs.reduce((s,b)=>s+(b.size||0),0);
      console.log('Total recorded bytes=', total);
      if (total === 0) {
        out.innerText = 'Recording produced 0 bytes. Try a different browser or check permissions.';
        return;
      }
      const blob = new Blob(recordedBlobs, {type: mimeType || 'video/webm'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'debug_record.webm'; a.textContent = 'Download recorded clip (debug)';
      document.body.appendChild(a);
      const file = new File([blob], 'record.webm', {type: blob.type});
      await uploadFileObject(file);
    };
    mediaRecorder.start();
    startBtn.disabled = true; stopBtn.disabled = false;
  } catch (err) {
    out.innerText = 'Could not access camera/microphone: ' + err;
  }
};

stopBtn.onclick = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  preview.srcObject && preview.srcObject.getTracks().forEach(t => t.stop());
  startBtn.disabled = false; stopBtn.disabled = true;
};

document.getElementById('sendFile').onclick = () => {
  const f = document.getElementById('fileInput').files[0];
  if (!f) { alert('Choose file or record first'); return; }
  uploadFileObject(f);
};

async function uploadFileObject(file) {
  const phone = document.getElementById('phone').value.trim();
  const fd = new FormData();
  fd.append('video', file, file.name);
  if (phone) fd.append('phone', phone);
  out.innerText = 'Uploading...';
  try {
    const resp = await fetch('/upload_video', { method: 'POST', body: fd });
    const j = await resp.json();
    if (!resp.ok) {
      out.innerText = 'Error: ' + JSON.stringify(j, null, 2);
      return;
    }
    transcriptDiv.innerText = j.transcript || '';
    descDiv.innerText = j.health_description || '';
    out.innerText = JSON.stringify(j.debug || j, null, 2);
  } catch (e) {
    out.innerText = 'Upload failed: ' + e;
  }
}
</script>
</body>
</html>
'@ | Out-File -Encoding UTF8 index.html

# app.py (final with sanitize and debug)
@'
import os
import uuid
import subprocess
from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL") or "gpt-3.5-turbo"
VONAGE_API_KEY = os.getenv("VONAGE_API_KEY")
VONAGE_API_SECRET = os.getenv("VONAGE_API_SECRET")
VONAGE_FROM = os.getenv("VONAGE_FROM")

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 250 * 1024 * 1024

def run_cmd(cmd):
    proc = subprocess.run(cmd, capture_output=True, text=True)
    return proc.returncode, proc.stdout, proc.stderr

def ffmpeg_extract_audio(video_path, out_wav):
    cmd = ["ffmpeg", "-y", "-i", video_path, "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", out_wav]
    rc, out, err = run_cmd(cmd)
    if rc != 0:
        raise RuntimeError(err or out)
    return True

def ffmpeg_extract_frame(video_path, out_jpg, t=1):
    cmd = ["ffmpeg", "-y", "-ss", str(t), "-i", video_path, "-frames:v", "1", out_jpg]
    rc, out, err = run_cmd(cmd)
    if rc != 0:
        raise RuntimeError(err or out)
    return True

def transcribe_openai(audio_path):
    if not OPENAI_API_KEY:
        return None, None
    try:
        import openai
        openai.api_key = OPENAI_API_KEY
        with open(audio_path, "rb") as f:
            res = openai.Audio.transcribe("whisper-1", f)
        text = res.get("text") if isinstance(res, dict) else str(res)
        return text, res
    except Exception as e:
        return None, {"error": str(e)}

def analyze_face(image_path):
    try:
        from deepface import DeepFace
        res = DeepFace.analyze(img_path=image_path, actions=["age","gender","emotion"], enforce_detection=False)
        if isinstance(res, list) and res:
            res = res[0]
        return {
            "age": res.get("age"),
            "gender": res.get("gender"),
            "emotion": res.get("dominant_emotion") or res.get("emotion")
        }, res
    except Exception as e:
        return None, {"error": str(e)}

def gpt_description(face_attrs, transcript):
    if not OPENAI_API_KEY:
        return None, None
    try:
        import openai
        openai.api_key = OPENAI_API_KEY
        prompt = (
            "You are a cautious assistant. Given face attributes and a transcript, "
            "produce a short non-diagnostic wellness suggestion (2-3 sentences) focusing on wellness.\n\n"
            f"Face attributes: {face_attrs}\nTranscript: {transcript}\nSuggestion:"
        )
        resp = openai.ChatCompletion.create(
            model=OPENAI_MODEL,
            messages=[{"role":"user","content":prompt}],
            max_tokens=120,
            temperature=0.7
        )
        text = resp["choices"][0]["message"]["content"].strip()
        return text, resp
    except Exception as e:
        return None, {"error": str(e)}

def heuristic_description(face_attrs, transcript):
    parts = []
    if face_attrs:
        if face_attrs.get("age"):
            try: parts.append(f"Estimated age: {int(face_attrs['age'])}.")
            except: parts.append(f"Estimated age: {face_attrs['age']}.")
        if face_attrs.get("emotion"):
            parts.append(f"Detected emotion: {face_attrs['emotion']}.")
    t = (transcript or "").lower()
    if "tired" in t or "sleep" in t: parts.append("Mentions tiredness — consider rest and hydration.")
    if "skin" in t or "acne" in t or "breakout" in t: parts.append("Mentions skin concerns — suggest gentle skincare and hydration.")
    if not parts: parts.append("No obvious concerns detected; suggest balanced diet, hydration, and good sleep.")
    return " ".join(parts)

def send_sms_vonage(to_number, text):
    if not (VONAGE_API_KEY and VONAGE_API_SECRET and VONAGE_FROM):
        return {"error": "Vonage not configured"}
    try:
        import vonage
        client = vonage.Client(key=VONAGE_API_KEY, secret=VONAGE_API_SECRET)
        sms = vonage.Sms(client)
        resp = sms.send_message({"from": VONAGE_FROM, "to": to_number, "text": text})
        return resp
    except Exception as e:
        return {"error": str(e)}

def sanitize(obj):
    try:
        import numpy as _np
    except Exception:
        _np = None

    def _conv(o):
        if o is None or isinstance(o, (bool, int, float, str)):
            return o
        if _np is not None and isinstance(o, _np.generic):
            try:
                return o.item()
            except:
                try:
                    return float(o)
                except:
                    return str(o)
        if _np is not None and isinstance(o, _np.ndarray):
            try:
                return o.tolist()
            except:
                return [ _conv(x) for x in o ]
        if hasattr(o, "tolist") and callable(o.tolist) and not isinstance(o, (str, bytes)):
            try:
                return o.tolist()
            except:
                pass
        if isinstance(o, dict):
            return { str(k): _conv(v) for k,v in o.items() }
        if isinstance(o, (list, tuple)):
            return [ _conv(x) for x in o ]
        try:
            import dataclasses
            if dataclasses.is_dataclass(o):
                return _conv(dataclasses.asdict(o))
        except Exception:
            pass
        try:
            import pandas as _pd
            if isinstance(o, _pd.Timestamp):
                return str(o)
            if isinstance(o, _pd.Series):
                return _conv(o.to_list())
            if isinstance(o, _pd.DataFrame):
                return _conv(o.to_dict(orient="records"))
        except Exception:
            pass
        return str(o)
    return _conv(obj)

@app.route("/")
def index():
    return send_from_directory(".", "index.html")

@app.route("/upload_video", methods=["POST"])
def upload_video():
    if "video" not in request.files:
        return jsonify({"error": "no video provided"}), 400

    vid = request.files["video"]
    phone = request.form.get("phone")
    uid = uuid.uuid4().hex
    vpath = os.path.join(UPLOAD_DIR, f"{uid}.webm")
    vid.save(vpath)

    debug = {"vpath": vpath}
    try:
        debug["vsize"] = os.path.getsize(vpath)
    except:
        debug["vsize"] = None

    if debug["vsize"] == 0:
        return jsonify({"error": "uploaded file is empty (0 bytes)", "debug": debug}), 400

    mp4path = os.path.join(UPLOAD_DIR, f"{uid}.mp4")
    rc, out, err = run_cmd(["ffmpeg", "-y", "-i", vpath, mp4path])
    debug["conv_returncode"] = rc
    debug["conv_stderr"] = err
    if rc != 0:
        mp4path = vpath

    wav = os.path.join(UPLOAD_DIR, f"{uid}.wav")
    try:
        ffmpeg_extract_audio(mp4path, wav)
        debug["wav_path"] = wav
        debug["wav_size"] = os.path.getsize(wav)
    except Exception as e:
        debug["audio_error"] = str(e)
        return jsonify({"error": "audio extraction failed", "debug": debug}), 500

    transcript, raw_trans = transcribe_openai(wav)
    debug["raw_transcribe"] = sanitize(raw_trans)

    if not transcript:
        transcript = "(no transcript)"

    jpg = os.path.join(UPLOAD_DIR, f"{uid}.jpg")
    face_attrs = None
    raw_deep = None
    try:
        ffmpeg_extract_frame(mp4path, jpg, t=1)
        debug["jpg_path"] = jpg
        debug["jpg_size"] = os.path.getsize(jpg)
        face_attrs, raw_deep = analyze_face(jpg)
        debug["raw_deepface"] = sanitize(raw_deep)
    except Exception as e:
        debug["frame_face_error"] = str(e)

    health_desc, raw_gpt = gpt_description(face_attrs, transcript)
    debug["raw_gpt"] = sanitize(raw_gpt)
    if not health_desc:
        health_desc = heuristic_description(face_attrs, transcript)

    sanitized_face = sanitize(face_attrs)

    result = {
        "transcript": transcript,
        "face_attributes": sanitized_face,
        "health_description": health_desc,
        "debug": debug
    }

    if phone:
        sms_text = f"Suggestion: {health_desc[:200]}"
        sms_resp = send_sms_vonage(phone, sms_text)
        result["sms"] = sms_resp

    return jsonify(result)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)