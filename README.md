# 🛍️ VIBE SHOPPING — by Celeste, Xavi \& Joan 🚀

# 

# We are Team Adderit.

# We’re building an application that understands human language, observes your face, learns your habits, and speaks a natural-language purchase suggestion back to you — a new way to shop.

# 

# This demo showcases the core of that pipeline: capture (photo + text), synthesize voice, and produce a talking video prototype using VEED (via fal.ai).

# 

# 🔧 Tech \& Integrations (Overview)

# 

# &nbsp;n8n integration — TO-DO

# 

# &nbsp;Vonage integration — TO-DO

# 

# &nbsp;Norrsken integration — TO-DO

# 

# &nbsp;Glovo API / MCP integration — TO-DO

# 

# &nbsp;VEED / FAL API integration — Implemented ✅

# 

# 🎬 VEED / FAL API Integration (LIPCORE)

# 

# This module contains the working prototype that turns image + text → talking video using fal.ai’s VEED Fabric model.

# 

# 📂 What’s Included

# 

# app.py — Flask backend (core pipeline):

# 

# Accepts uploaded face image and input text.

# 

# Generates TTS audio (gTTS).

# 

# Exposes image + audio via a public URL (ngrok for local demos).

# 

# Enqueues a VEED job on fal.ai (fabric-1.0), polls status, and downloads the MP4.

# 

# Implements an ephemeral cache for instant repeated requests.

# 

# Supports both synchronous and asynchronous job flows (/status endpoint).

# 

# requirements.txt — Python dependencies (Flask, requests, gTTS, pydub optional).

# 

# start.ps1 — Windows helper script (creates venv, installs deps, detects ngrok URL, starts Flask).

# 

# static/uploads/ — Uploaded images and generated MP3s (served for VEED fetch).

# 

# static/cache/ — Cached MP4s for demo sessions.

# 

# README.txt — Quick-start instructions.

# 

# create\_project.ps1 — Optional project scaffolding script.

# 

# ⚙️ Key Behaviors \& Optimizations

# 

# Default render: 480p (faster \& cheaper).

# 

# Optional audio trimming (~8–10 s).

# 

# Ephemeral cache for repeated identical inputs.

# 

# Asynchronous flow via /status/<job\_id> polling.

# 

# 🧠 Notes

# 

# fal.ai must access your image/audio via a public URL → use ngrok for local demos.

# 

# Each VEED render consumes fal.ai credits — keep texts short \& use 480p.

# 

# Never commit your FAL\_KEY or secrets. Use environment variables \& .gitignore.

# 

# Example Payload

# {

# &nbsp; "image\_url": "https://<your-ngrok>/static/uploads/<image>.jpg",

# &nbsp; "audio\_url": "https://<your-ngrok>/static/uploads/<audio>.mp3",

# &nbsp; "resolution": "480p"

# }

# 

# ▶ Quick Demo Guide

# 

# Start ngrok

# 

# ngrok http 5000

# 

# 

# Copy the HTTPS URL (e.g. https://abcd1234.ngrok-free.dev).

# 

# Set the session PUBLIC\_URL

# 

# $env:PUBLIC\_URL = "https://abcd1234.ngrok-free.dev"

# 

# 

# Ensure your FAL\_KEY is set as an environment variable.

# 

# Run the app

# 

# .\\start.ps1

# 

# 

# Open the ngrok URL in your browser → upload a photo, enter text, and press Play.

# 

# ✨ Browser TTS gives instant feedback while VEED processes the final talking video.

# Cached identical requests return instantly.

# 

# 💡 Demo Tips

# 

# Pre-render a few frequent suggestions for instant playback.

# 

# Keep texts short (<10 s) for faster, cheaper renders.

# 

# Combine with browser SpeechSynthesis for real-time narration feel.

# 

# ⚠️ Costs \& Safety

# 

# Monitor fal.ai credit usage.

# 

# Rotate/revoke API keys if exposed.

# 

# Prototype only — production requires async workers, rate limits \& secure storage.

# 

# 🚀 Next Steps

# 

# Integrate n8n workflows for event automation \& storage.

# 

# Connect Vonage for voice/SMS-triggered video suggestions.

# 

# Add Norrsken connectors for event-driven flows.

# 

# Integrate Glovo MCP for persona-based delivery/upsell suggestions.

# 

# Upgrade voice quality via ElevenLabs or advanced TTS (tradeoff: cost vs latency).

# 

# Built by Team Adderit — Celeste, Xavi \& Joan.

# A new way to shop: understand, observe, suggest — naturally.

