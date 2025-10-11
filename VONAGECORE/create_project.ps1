# create_project.ps1
# Create minimal VONAGE_PROJECT that records video client-side, does client STT (Web Speech API),
# simple face heuristics (brightness/center variance), posts to Flask server which can send SMS via Vonage.
# Usage: save as create_project.ps1 and run in PowerShell.

$projDir = "VONAGE_PROJECT"
if (-not (Test-Path $projDir)) { New-Item -ItemType Directory -Path $projDir | Out-Null }
Set-Location $projDir

# requirements.txt
@'
flask
vonage
python-dotenv
'@ | Out-File -Encoding UTF8 requirements.txt

# .env.example
@'
# COPY to .env and fill values (do NOT commit .env)
VONAGE_API_KEY=
VONAGE_API_SECRET=
VONAGE_FROM=+34XXXXXXXXX
'@ | Out-File -Encoding UTF8 .env.example

# README.md
@'
VONAGE_PROJECT - Minimal demo (Client STT + simple face heuristics + Vonage SMS)
===========================================================================
- Client records video and uses Web Speech API for live speech-to-text.
- Client computes a simple face heuristic (brightness + center variance) locally.
- Client sends transcript + face_info to server (/analyze).
- Server returns a short non-diagnostic suggestion and optionally sends an SMS via Vonage.
- No external ML APIs required.

Run:
1) Copy .env.example -> .env and set VONAGE_API_KEY, VONAGE_API_SECRET, VONAGE_FROM (if you want SMS).
2) Run ".\start.ps1"
3) Open http://localhost:5000 in Chrome, allow camera/microphone, Start/Stop, then Analyze.
'@ | Out-File -Encoding UTF8 README.md

# index.html (client-side STT + simple face heuristics)
@'
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>VONAGE_PROJECT - Minimal Demo</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; max-width: 900px; }
    video { border: 1px solid #ccc; display:block; margin-bottom:10px; }
    .row { margin: 8px 0; }
    .box { background:#fff; padding:10px; border:1px solid #ddd; margin-top:10px;}
    pre { white-space: pre-wrap; }
  </style>
</head>
<body>
  <h2>VONAGE_PROJECT — Record and get transcript + simple face description</h2>

  <video id="preview" autoplay muted width="480" height="360"></video>
  <div class="row">
    <button id="startBtn">Start recording</button>
    <button id="stopBtn" disabled>Stop</button>
    <button id="analyzeBtn" disabled>Analyze frame</button>
  </div>

  <div class="row">
    <input type="file" id="fileInput" accept="video/*">
    <button id="sendFile">Send file</button>
  </div>

  <div class="row">
    <input type="text" id="phone" placeholder="+34XXXXXXXXX (optional SMS)">
  </div>

  <div class="box"><strong>Transcript</strong><div id="transcript" style="min-height:40px"></div></div>
  <div class="box"><strong>Face info (simple)</strong><div id="faceInfo" style="min-height:40px"></div></div>
  <div class="box"><strong>Suggestion</strong><div id="suggestion" style="min-height:40px"></div></div>
  <div class="box"><strong>Debug log</strong><pre id="log" style="height:150px;overflow:auto;"></pre></div>

<script>
const log = (s) => { const p=document.getElementById("log"); p.textContent += s + "\n"; p.scrollTop = p.scrollHeight; };
const preview = document.getElementById("preview");
const startBtn = document.getElementById("startBtn"), stopBtn = document.getElementById("stopBtn"), analyzeBtn = document.getElementById("analyzeBtn");
const transcriptDiv = document.getElementById("transcript"), faceInfoDiv = document.getElementById("faceInfo"), suggestionDiv = document.getElementById("suggestion");

let mediaRecorder, recordedBlobs;
let recognition, finalTranscript="";

async function init() {
  try {
    const s = await navigator.mediaDevices.getUserMedia({video:true, audio:true});
    preview.srcObject = s;
    log("Camera ready");
  } catch (e) {
    log("Camera error: " + e);
    alert("Allow camera/microphone access.");
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { log("Web Speech API not supported in this browser. Use Chrome."); recognition = null; }
  else {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + " ";
        else interim += event.results[i][0].transcript;
      }
      transcriptDiv.textContent = (finalTranscript + interim).trim();
    };
    recognition.onerror = (e) => log("SpeechRecognition error: " + e.error);
    log("SpeechRecognition ready");
  }
}

startBtn.onclick = async () => {
  recordedBlobs = [];
  finalTranscript = ""; transcriptDiv.textContent=""; suggestionDiv.textContent=""; faceInfoDiv.textContent="";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({video:true, audio:true});
    preview.srcObject = stream;
    let mime = '';
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) mime='video/webm;codecs=vp9,opus';
    else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) mime='video/webm;codecs=vp8,opus';
    else if (MediaRecorder.isTypeSupported('video/webm')) mime='video/webm';
    mediaRecorder = mime ? new MediaRecorder(stream, {mimeType:mime}) : new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => { if (e.data && e.data.size) recordedBlobs.push(e.data); log("chunk size: " + (e.data?e.data.size:0)); };
    mediaRecorder.onstop = () => {
      const total = recordedBlobs.reduce((s,b)=>s+(b.size||0),0);
      log("Recording stopped. total bytes=" + total);
      analyzeBtn.disabled = false;
    };
    mediaRecorder.start(500);
    log("Recording started");
    if (recognition) { try{ recognition.start(); log("SpeechRecognition started"); }catch(e){log("SR start error:"+e);} }
    startBtn.disabled = true; stopBtn.disabled = false;
  } catch (e) { log("start error: "+e); alert(e); }
};

stopBtn.onclick = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  if (recognition) try{ recognition.stop(); }catch(e){log("SR stop:"+e);}
  startBtn.disabled = false; stopBtn.disabled = true;
};

analyzeBtn.onclick = async () => {
  analyzeBtn.disabled = true;
  // capture frame
  const canvas = document.createElement('canvas');
  canvas.width = preview.videoWidth || 640;
  canvas.height = preview.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(preview, 0, 0, canvas.width, canvas.height);
  // compute brightness and center variance as simple face heuristic
  const data = ctx.getImageData(0,0,canvas.width,canvas.height).data;
  let total=0, count=0;
  // center box
  const cx = Math.floor(canvas.width/3), cy = Math.floor(canvas.height/3), cw = Math.floor(canvas.width/3), ch = Math.floor(canvas.height/3);
  let centerVals = [];
  for(let y=cy; y<cy+ch; y++){
    for(let x=cx; x<cx+cw; x++){
      const i = (y*canvas.width + x)*4;
      const r = data[i], g = data[i+1], b = data[i+2];
      const lum = 0.2126*r + 0.7152*g + 0.0722*b;
      total += lum; count++;
      if(x>=cx && x<cx+cw && y>=cy && y<cy+ch) centerVals.push(lum);
    }
  }
  const avg = total/count;
  const meanCenter = centerVals.reduce((s,v)=>s+v,0)/centerVals.length;
  const variance = centerVals.reduce((s,v)=>s+Math.abs(v-meanCenter),0)/centerVals.length;
  const faceLikely = variance > 10; // heuristic threshold
  const faceInfo = { brightness: Math.round(avg), center_variance: Number(variance.toFixed(2)), faceLikely: faceLikely };
  faceInfoDiv.textContent = JSON.stringify(faceInfo, null, 2);

  const transl = transcriptDiv.textContent || "";
  let suggestion = "";
  if (faceLikely) suggestion += "Face likely present. ";
  if (avg < 60) suggestion += "Low light detected — improve lighting. ";
  if (transl.toLowerCase().includes("tired")||transl.toLowerCase().includes("sleep")) suggestion += "User mentions tiredness — suggest rest and hydration.";
  if (!suggestion) suggestion = "No specific issues detected; suggest balanced diet, hydration and regular sleep.";
  suggestionDiv.textContent = suggestion;

  // post to server for optional SMS
  const phone = document.getElementById('phone').value.trim();
  try {
    const body = { transcript: transl, face_info: faceInfo, phone: phone };
    const res = await fetch('/analyze', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body) });
    const j = await res.json();
    log("Server response: " + JSON.stringify(j));
  } catch(e) { log("Server post error: "+e); }

  analyzeBtn.disabled = false;
};

document.getElementById('sendFile').addEventListener('click', () => {
  alert("Client-only demo: use Record -> Analyze for local processing (no server upload).");
});

window.addEventListener('load', init);
async function init(){ try{ log("Init: ready."); preview.srcObject = await navigator.mediaDevices.getUserMedia({video:true,audio:true}); log("Camera ready"); } catch(e){ log("Camera error:"+e); } }
</script>
</body>
</html>
'@ | Out-File -Encoding UTF8 index.html

# app.py - minimal server to accept analyze POST and send SMS via Vonage
@'
import os
from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv
import vonage

load_dotenv()
VONAGE_API_KEY = os.getenv("VONAGE_API_KEY")
VONAGE_API_SECRET = os.getenv("VONAGE_API_SECRET")
VONAGE_FROM = os.getenv("VONAGE_FROM")

app = Flask(__name__)

def send_sms(to, text):
    if not (VONAGE_API_KEY and VONAGE_API_SECRET and VONAGE_FROM):
        return {"error":"Vonage not configured"}
    try:
        client = vonage.Client(key=VONAGE_API_KEY, secret=VONAGE_API_SECRET)
        sms = vonage.Sms(client)
        resp = sms.send_message({"from": VONAGE_FROM, "to": to, "text": text})
        return resp
    except Exception as e:
        return {"error": str(e)}

@app.route("/")
def index():
    return send_from_directory(".", "index.html")

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json() or {}
    transcript = data.get("transcript", "")
    face_info = data.get("face_info", {})
    # simple heuristic suggestion server-side (same as client)
    suggestion = ""
    if face_info.get("faceLikely"):
        suggestion += "Face likely present. "
    if face_info.get("brightness") and face_info.get("brightness") < 60:
        suggestion += "Low light detected — improve lighting. "
    t = (transcript or "").lower()
    if "tired" in t or "sleep" in t:
        suggestion += "User mentions tiredness — suggest rest and hydration."
    if not suggestion:
        suggestion = "No specific issues detected; suggest balanced diet, hydration and regular sleep."

    phone = data.get("phone")
    sms_resp = None
    if phone:
        sms_resp = send_sms(phone, suggestion)

    return jsonify({"transcript": transcript, "face_info": face_info, "suggestion": suggestion, "sms": sms_resp})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
'@ | Out-File -Encoding UTF8 app.py

# start.ps1 - create venv and run Flask dev server
@'
py -3 -m venv venv
.\venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
python app.py
'@ | Out-File -Encoding UTF8 start.ps1

Write-Host "VONAGE_PROJECT (minimal) created in $(Get-Location)."
Write-Host "Run .\\start.ps1 to start the Flask server, or open index.html directly in Chrome for client-only demo."