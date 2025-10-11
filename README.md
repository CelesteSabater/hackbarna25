# \# VIBE SHOPPING — by Celeste, Xavi \& Joan 🚀

# 

# We are Team Adderit.

# 

# Intro: we are building an application that understands human language, observes your face, learns your habits, and speaks a natural-language purchase suggestion back to you — a new way to shop. This demo shows the core of that pipeline: capture (photo + text), synthesize voice, and produce a talking video prototype using VEED (via fal.ai).

# 

# ---

# 

# \## 🔧 Tech \& Integrations (overview)

# \- 1) n8n integration — TO-DO ⬜  

# \- 2) Vonage integration — TO-DO ⬜  

# \- 3) Norrsken integration — TO-DO ⬜  

# \- 4) Glovo API / MCP integration — TO-DO ⬜  

# \- 5) VEED / FAL API integration — implemented ✅

# 

# ---

# 

# \## 5) VEED / FAL API integration (what’s inside `LIPCORE`) 🎬

# 

# This folder contains the working prototype that turns image + text into a talking video via fal.ai’s VEED Fabric model.

# 

# What is included

# \- `app.py` — Flask backend (core pipeline):

# &nbsp; - Accepts an uploaded face image and input text.

# &nbsp; - Generates TTS audio (gTTS).

# &nbsp; - Exposes image + audio on a public URL (ngrok for local demos).

# &nbsp; - Enqueues a VEED job on fal.ai (fabric-1.0), polls status, downloads the resulting MP4.

# &nbsp; - Implements an ephemeral session cache so repeated identical requests are instant (saves cost/time).

# &nbsp; - Supports both synchronous and asynchronous job flows (background thread + /status endpoint).

# \- `requirements.txt` — Python dependencies (Flask, requests, gTTS; pydub optional).

# \- `start.ps1` — Windows helper script: creates/activates venv, installs deps, tries to detect ngrok public URL, then starts the Flask app.

# \- `static/uploads/` — uploaded images and generated mp3s (served so VEED can fetch them).

# \- temp/ephemeral cache (inside a temp folder or `static/cache/`) — cached mp4 outputs for the session.

# \- `README.txt` — short quick-run instructions.

# \- `create\_project.ps1` — (if present) scaffolding script used to generate the project during setup.

# 

# Key behaviors \& optimizations

# \- Default render resolution set to `480p` to reduce cost and speed up renders.

# \- Optional audio trimming (~8–10s) to reduce processing time/cost.

# \- Ephemeral cache: same image+text in the same session returns a cached MP4 instantly (great for demos).

# \- Asynchronous flow: create job, return job\_id, client polls `/status/<job\_id>`; final video appears automatically when ready.

# 

# Important notes

# \- fal.ai must be able to download your image/audio via public URL. For local demos use ngrok and set `PUBLIC\_URL` to your ngrok HTTPS URL.

# \- Each VEED generation consumes fal.ai credits — test with short text and 480p to save credits.

# \- Do NOT commit `FAL\_KEY` or other secrets to git. Use environment variables and `.gitignore`.

# 

# Example payload sent to fal.ai

# ```json

# {

# &nbsp; "image\_url": "https://<your-ngrok>/static/uploads/<image>.jpg",

# &nbsp; "audio\_url": "https://<your-ngrok>/static/uploads/<audio>.mp3",

# &nbsp; "resolution": "480p"

# }

# ```

# 

# ---

# 

# \## ▶ Quick demo (short)

# 1\. Start ngrok:  

# &nbsp;  `ngrok http 5000` → copy the HTTPS forwarding URL (e.g. `https://abcd1234.ngrok-free.dev`)  

# 2\. In a new shell, set session PUBLIC\_URL:  

# &nbsp;  ```powershell

# &nbsp;  $env:PUBLIC\_URL = "https://abcd1234.ngrok-free.dev"

# &nbsp;  ```  

# 3\. Ensure `FAL\_KEY` is available (environment variable).  

# 4\. Run app (first run will create venv and install deps):  

# &nbsp;  ```powershell

# &nbsp;  .\\start.ps1

# &nbsp;  ```  

# 5\. Open the ngrok URL in browser → upload a photo, enter text, press Play.  

# &nbsp;  - Browser can play immediate TTS for instant UX; final VEED-rendered video will appear when ready.  

# &nbsp;  - Repeat identical requests during the session are fast via cache.

# 

# ---

# 

# \## 💡 Demo tips

# \- Pre-render a few common suggestions for instant playback.

# \- Keep texts short (<8–10s) for faster, cheaper renders.

# \- Use browser SpeechSynthesis for live narration during the demo to create perceived real-time responsiveness.

# 

# ---

# 

# \## ⚠️ Costs \& Safety

# \- Monitor fal.ai usage (dashboard). Each job consumes credits.

# \- Revoke and rotate keys if accidentally committed. Never publish `FAL\_KEY`.

# \- This prototype is for demo \& prototyping; production needs async workers, rate-limits, security \& storage policies.

# 

# ---

# 

# \## ✨ Next steps (we can implement)

# \- Add n8n workflows to chain events and store results.

# \- Integrate Vonage to trigger videos via voice/SMS.

# \- Add Norrsken connectors for event flows.

# \- Integrate with Glovo MCP to produce persona-driven suggestions for delivery/upsell.

# \- Improve final voice quality using a paid TTS (ElevenLabs) or server-side advanced TTS (tradeoff: cost vs latency).

# 

# ---

# 

# Built by Team Adderit — Celeste, Xavi \& Joan.  

# A new way to shop: understand, observe, suggest — naturally.

