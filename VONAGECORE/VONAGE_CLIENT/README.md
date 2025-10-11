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
