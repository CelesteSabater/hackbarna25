# create_project.ps1
# Creates VONAGE_CLIENT project with client-only demo (Web Speech API + face-api.js)
# Usage: save as create_project.ps1, run in PowerShell:
#   .\create_project.ps1

$projDir = "VONAGE_CLIENT"
if (-not (Test-Path $projDir)) { New-Item -ItemType Directory -Path $projDir | Out-Null }
Set-Location $projDir

# requirements.txt (optional for start.ps1 server)
@'
# (Requirements are optional for client-only demo; included if you want to serve with Python)
# Not strictly required to run the client-only demo, but helpful.
flask
python-dotenv
'@ | Out-File -Encoding UTF8 requirements.txt

# README.md
@'
VONAGE_CLIENT - Client-only Demo
================================

This project is a client-only demo (no external API keys required).
It records a short video from your camera, performs in-browser:
- Speech-to-text using the Web Speech API (Chrome recommended)
- Face analysis (age, gender, emotion) using face-api.js (TensorFlow.js)

How to run:
1) Option A (quick): open index.html directly in Chrome (some browsers restrict getUserMedia on file://)
2) Option B (recommended): serve folder and open http://localhost:8000
   - PowerShell: python -m http.server 8000
   - Or run the included start.ps1

Notes:
- Models for face-api.js are loaded from a public CDN; first load may be slow.
- For best results, use Chrome desktop.
'@ | Out-File -Encoding UTF8 README.md

# index.html (client-only)
@'
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>VONAGE CLIENT — Record / Upload (DEBUG)</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { font-family: Arial, Helvetica, sans-serif; margin: 20px; }
    video { border: 1px solid #ccc; display:block; margin-bottom:10px; }
    #controls > button { margin-right: 8px; }
    .box { background:#fff; padding:10px; border:1px solid #ddd; margin-top:10px; }
    pre { white-space: pre-wrap; }
  </style>
</head>
<body>
  <h2>VONAGE CLIENT — Record or Upload (Client-only)</h2>

  <video id="preview" autoplay muted width="480" height="360"></video>
  <div id="controls">
    <button id="startBtn">Start recording</button>
    <button id="stopBtn" disabled>Stop</button>
    <button id="analyzeBtn" disabled>Analyze last frame</button>
  </div>

  <div class="box">
    <strong>Live transcript (Web Speech API)</strong>
    <div id="transcript" style="min-height:40px"></div>
  </div>

  <div class="box">
    <strong>Face analysis (face-api.js)</strong>
    <div id="faceResult" style="min-height:40px"></div>
  </div>

  <div class="box">
    <strong>Debug / logs</strong>
    <pre id="log" style="height:120px;overflow:auto"></pre>
  </div>

  <!-- face-api.js from CDN -->
  <script src="https://unpkg.com/face-api.js@0.22.2/dist/face-api.min.js"></script>

  <script>
  const LOG = (s) => { const p = document.getElementById('log'); p.textContent += s + "\\n"; p.scrollTop = p.scrollHeight; };

  const preview = document.getElementById('preview');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const transcriptDiv = document.getElementById('transcript');
  const faceResult = document.getElementById('faceResult');

  let mediaRecorder, recordedBlobs;
  let recognition, finalTranscript="";

  async function loadModels() {
    LOG("Loading face-api models (may take a few seconds) ...");
    const modelUrl = "https://justadudewhohacks.github.io/face-api.js/models/";
    await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
    await faceapi.nets.ageGenderNet.loadFromUri(modelUrl);
    await faceapi.nets.faceExpressionNet.loadFromUri(modelUrl);
    LOG("Models loaded.");
  }

  async function init() {
    await loadModels();
    try {
      const s = await navigator.mediaDevices.getUserMedia({video:true, audio:true});
      preview.srcObject = s;
      LOG("Camera ready.");
    } catch (e) {
      LOG("Camera error: " + e);
      alert("Allow camera/microphone access.");
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      LOG("Web Speech API not supported in this browser.");
      recognition = null;
    } else {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        transcriptDiv.textContent = (finalTranscript + interim).trim();
      };
      recognition.onerror = (e) => LOG("SpeechRecognition error: " + e.error);
      LOG("SpeechRecognition ready.");
    }
  }

  startBtn.addEventListener('click', async () => {
    recordedBlobs = [];
    transcriptDiv.innerText = "";
    finalTranscript = "";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({video:true, audio:true});
      preview.srcObject = stream;
      let mimeType = '';
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) mimeType = 'video/webm;codecs=vp9,opus';
      else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) mimeType = 'video/webm;codecs=vp8,opus';
      else if (MediaRecorder.isTypeSupported('video/webm')) mimeType = 'video/webm';
      mediaRecorder = mimeType ? new MediaRecorder(stream, {mimeType}) : new MediaRecorder(stream);
      mediaRecorder.ondataavailable = e => { if (e.data && e.data.size) recordedBlobs.push(e.data); LOG('chunk size: ' + (e.data?e.data.size:0)); };
      mediaRecorder.onstop = () => {
        let total = recordedBlobs.reduce((s,b)=>s+(b.size||0),0);
        LOG('Total recorded bytes=' + total);
        analyzeBtn.disabled = false;
      };
      mediaRecorder.start(500);
      LOG("Recording started.");
      if (recognition) { try { recognition.start(); LOG("SpeechRecognition started."); } catch(e){LOG("SR start error:"+e);} }
      startBtn.disabled = true; stopBtn.disabled = false;
    } catch (e) { LOG("start error: "+e); alert(e); }
  });

  stopBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (recognition) try{ recognition.stop(); }catch(e){LOG("SR stop:"+e);}
    startBtn.disabled = false; stopBtn.disabled = true;
  });

  analyzeBtn.addEventListener('click', async () => {
    analyzeBtn.disabled = true;
    const canvas = document.createElement('canvas');
    canvas.width = preview.videoWidth || 640;
    canvas.height = preview.videoHeight || 480;
    canvas.getContext('2d').drawImage(preview, 0, 0, canvas.width, canvas.height);
    const detection = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions()).withAgeAndGender().withFaceExpressions();
    LOG("Face detection: " + (detection? "found":"none"));
    let faceDesc = null;
    if (detection) {
      faceDesc = {
        age: Math.round(detection.age),
        gender: detection.gender,
        genderProbability: Number(detection.genderProbability.toFixed(2)),
        expressions: detection.expressions ? Object.fromEntries(Object.entries(detection.expressions).map(([k,v])=>[k, Number(v.toFixed(2))])) : null
      };
    }
    const currentTranscript = transcriptDiv.textContent || "";
    let healthDesc = "";
    if (faceDesc) healthDesc += `Estimated age ${faceDesc.age}. Detected ${faceDesc.gender} (p=${faceDesc.genderProbability}). `;
    if (currentTranscript.toLowerCase().includes("tired")|| currentTranscript.toLowerCase().includes("sleep")) {
      healthDesc += "User mentions tiredness — suggest rest and hydration.";
    } else {
      healthDesc += "General suggestion: balanced diet, hydration, and regular sleep.";
    }
    transcriptDiv.innerText = currentTranscript;
    faceResult.innerText = JSON.stringify(faceDesc, null, 2);
    document.getElementById('description').innerText = healthDesc;
    analyzeBtn.disabled = false;
  });

  window.addEventListener('load', init);
  async function init(){ LOG("Loading models..."); try { const modelUrl="https://justadudewhohacks.github.io/face-api.js/models/"; await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl); await faceapi.nets.ageGenderNet.loadFromUri(modelUrl); await faceapi.nets.faceExpressionNet.loadFromUri(modelUrl); LOG("Models loaded."); } catch(e){LOG("Models load failed: "+e);} try{ const s = await navigator.mediaDevices.getUserMedia({video:true,audio:true}); preview.srcObject = s; LOG("Camera ready."); } catch(e){LOG("Camera denied: "+e);} }
  </script>
</body>
</html>
'@ | Out-File -Encoding UTF8 index.html

# start.ps1 - serve folder with python http.server
@'
# start.ps1
# Serves the current folder on http://localhost:8000
python -m http.server 8000
'@ | Out-File -Encoding UTF8 start.ps1

Write-Host "VONAGE_CLIENT created in $(Get-Location)."
Write-Host "Run .\\start.ps1 and open http://localhost:8000 in Chrome."