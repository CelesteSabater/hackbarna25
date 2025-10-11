# \# 🛍️ VIBE SHOPPING — by Celeste, Xavi \& Joan 🚀

# 

# \*\*We are Team Adderit.\*\*  

# We’re building an application that understands human language, observes your face, learns your habits, and speaks a natural-language purchase suggestion back to you — a new way to shop.  

# 

# This demo showcases the core of that pipeline: capture (photo + text), synthesize voice, and produce a talking video prototype using \*\*VEED (via fal.ai)\*\*.

# 

# ---

# 

# \## 🔧 Tech \& Integrations (Overview)

# \- \[ ] n8n integration — \*TO-DO\*  

# \- \[ ] Vonage integration — \*TO-DO\*  

# \- \[ ] Norrsken integration — \*TO-DO\*  

# \- \[ ] Glovo API / MCP integration — \*TO-DO\*  

# \- \[x] VEED / FAL API integration — \*Implemented ✅\*

# 

# ---

# 

# \## 🎬 VEED / FAL API Integration (Inside \\`LIPCORE\\`)

# 

# This folder contains the working prototype that turns image + text into a talking video via \*\*fal.ai’s VEED Fabric model\*\*.

# 

# \### Included Files

# \- \*\*\\`app.py\\`\*\* — Flask backend (core pipeline):

# &nbsp; - Accepts uploaded face image and input text.  

# &nbsp; - Generates TTS audio (gTTS).  

# &nbsp; - Exposes image + audio via a public URL (ngrok for local demos).  

# &nbsp; - Enqueues a VEED job on fal.ai (\\`fabric-1.0\\`), polls status, and downloads the resulting MP4.  

# &nbsp; - Implements an ephemeral session cache for instant repeated requests (saves cost/time).  

# &nbsp; - Supports both synchronous and asynchronous job flows (background thread + \\`/status\\` endpoint).  

# 

# \- \*\*\\`requirements.txt\\`\*\* — Python dependencies (\\`Flask\\`, \\`requests\\`, \\`gTTS\\`, \\`pydub\\` optional).  

# \- \*\*\\`start.ps1\\`\*\* — Windows helper script (creates venv, installs deps, detects ngrok URL, starts Flask).  

# \- \*\*\\`static/uploads/\\`\*\* — Uploaded images and generated MP3s (served for VEED fetch).  

# \- \*\*\\`static/cache/\\`\*\* — Ephemeral MP4 cache for demo sessions.  

# \- \*\*\\`README.txt\\`\*\* — Quick-run instructions.  

# \- \*\*\\`create\_project.ps1\\`\*\* — Optional scaffolding script used during setup.  

# 

# \### Key Behaviors \& Optimizations

# \- Default render resolution: \*\*480p\*\* (faster \& cheaper).  

# \- Optional audio trimming (~8–10 s) for faster renders.  

# \- Ephemeral cache for repeated identical requests.  

# \- Asynchronous flow via \\`/status/<job\_id>\\` polling.  

# 

# \### Important Notes

# \- \*\*fal.ai\*\* must access your image/audio via a public URL — use \*\*ngrok\*\* for local demos.  

# \- Each VEED generation consumes fal.ai credits — keep texts short \& use 480p.  

# \- \*\*Never commit\*\* your \\`FAL\_KEY\\` or secrets to Git. Use environment variables and \\`.gitignore\\`.  

# 

# \#### Example Payload

# \\`\\`\\`json

# {

# &nbsp; "image\_url": "https://<your-ngrok>/static/uploads/<image>.jpg",

# &nbsp; "audio\_url": "https://<your-ngrok>/static/uploads/<audio>.mp3",

# &nbsp; "resolution": "480p"

# }

# \\`\\`\\`

# 

# ---

# 

# \## ▶ Quick Demo

# 

# 1\. Start ngrok  

# &nbsp;  \\`\\`\\`bash

# &nbsp;  ngrok http 5000

# &nbsp;  \\`\\`\\`

# &nbsp;  Copy the HTTPS URL (e.g. \\`https://abcd1234.ngrok-free.dev\\`)

# 

# 2\. Set your session \\`PUBLIC\_URL\\`  

# &nbsp;  \\`\\`\\`powershell

# &nbsp;  $env:PUBLIC\_URL = "https://abcd1234.ngrok-free.dev"

# &nbsp;  \\`\\`\\`

# 

# 3\. Ensure your \\`FAL\_KEY\\` is set as an environment variable.  

# 4\. Run the app  

# &nbsp;  \\`\\`\\`powershell

# &nbsp;  .\\\\start.ps1

# &nbsp;  \\`\\`\\`

# 

# 5\. Open your ngrok URL in a browser → upload a photo, enter text, and press \*\*Play\*\*.  

# &nbsp;  - Immediate browser TTS playback for instant UX.  

# &nbsp;  - Final VEED-rendered video appears when ready.  

# &nbsp;  - Cached identical requests return instantly.  

# 

# ---

# 

# \## 💡 Demo Tips

# \- Pre-render a few common suggestions for instant playback.  

# \- Keep text short (<10 s) for faster, cheaper renders.  

# \- Combine with browser SpeechSynthesis for perceived real-time responses.  

# 

# ---

# 

# \## ⚠️ Costs \& Safety

# \- Monitor \*\*fal.ai\*\* credit usage.  

# \- Rotate/revoke keys if exposed.  

# \- Prototype only — production requires async workers, rate limits, and secure storage policies.  

# 

# ---

# 

# \## ✨ Next Steps

# \- Integrate \*\*n8n\*\* workflows for event chaining \& storage.  

# \- Connect \*\*Vonage\*\* for voice/SMS video triggers.  

# \- Add \*\*Norrsken\*\* connectors for workflow integration.  

# \- Use \*\*Glovo MCP\*\* for persona-driven delivery/upsell suggestions.  

# \- Upgrade voice quality with \*\*ElevenLabs\*\* or advanced TTS (cost–latency tradeoff).  

# 

# ---

# 

# \*\*Built by Team Adderit — Celeste, Xavi \& Joan.\*\*  

# \*A new way to shop: understand, observe, suggest — naturally.\*

