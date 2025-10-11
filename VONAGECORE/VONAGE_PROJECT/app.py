# app.py
import os
import uuid
import subprocess
from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv

load_dotenv()

# Environment / config
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL") or "gpt-3.5-turbo"
VONAGE_API_KEY = os.getenv("VONAGE_API_KEY")
VONAGE_API_SECRET = os.getenv("VONAGE_API_SECRET")
VONAGE_FROM = os.getenv("VONAGE_FROM")

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 250 * 1024 * 1024  # 250 MB

# Utilities
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

# Transcription via OpenAI Whisper (old SDK interface expected)
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

# Face analysis using DeepFace (optional)
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

# GPT-based description (OpenAI ChatCompletion, old SDK interface)
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

# Heuristic fallback description
def heuristic_description(face_attrs, transcript):
    parts = []
    if face_attrs:
        if face_attrs.get("age"):
            try:
                parts.append(f"Estimated age: {int(face_attrs['age'])}.")
            except:
                parts.append(f"Estimated age: {face_attrs['age']}.")
        if face_attrs.get("emotion"):
            parts.append(f"Detected emotion: {face_attrs['emotion']}.")
    t = (transcript or "").lower()
    if "tired" in t or "sleep" in t:
        parts.append("Mentions tiredness — consider rest and hydration.")
    if "skin" in t or "acne" in t or "breakout" in t:
        parts.append("Mentions skin concerns — suggest gentle skincare and hydration.")
    if not parts:
        parts.append("No obvious concerns detected; suggest balanced diet, hydration, and good sleep.")
    return " ".join(parts)

# Vonage SMS (optional)
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

# Sanitizer to make objects JSON serializable
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

# Routes
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

    # convert to mp4 (attempt)
    mp4path = os.path.join(UPLOAD_DIR, f"{uid}.mp4")
    rc, out, err = run_cmd(["ffmpeg", "-y", "-i", vpath, mp4path])
    debug["conv_returncode"] = rc
    debug["conv_stderr"] = err
    if rc != 0:
        mp4path = vpath  # fallback to original

    # extract audio
    wav = os.path.join(UPLOAD_DIR, f"{uid}.wav")
    try:
        ffmpeg_extract_audio(mp4path, wav)
        debug["wav_path"] = wav
        debug["wav_size"] = os.path.getsize(wav)
    except Exception as e:
        debug["audio_error"] = str(e)
        return jsonify({"error": "audio extraction failed", "debug": debug}), 500

    # transcribe
    transcript, raw_trans = transcribe_openai(wav)
    debug["raw_transcribe"] = sanitize(raw_trans)

    if not transcript:
        transcript = "(no transcript)"

    # extract frame and analyze face
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

    # generate health description using GPT if available
    health_desc, raw_gpt = gpt_description(face_attrs, transcript)
    debug["raw_gpt"] = sanitize(raw_gpt)
    if not health_desc:
        health_desc = heuristic_description(face_attrs, transcript)

    # sanitize face_attrs for JSON
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