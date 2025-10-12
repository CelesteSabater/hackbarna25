import express from "express";
import multer from "multer";
import fs from "fs";
import fetch from "node-fetch";
import path from "path";
import { exec } from "child_process";
import { execSync } from "child_process";

const app = express();
const upload = multer({ dest: "uploads/" });

let apiKey;
try {
  apiKey = execSync('powershell -Command "(Get-ItemProperty -Path \\"HKCU:\\\\Software\\\\OpenAI\\" -Name \\"ApiKey\\").ApiKey"').toString().trim();
} catch {
  console.error("âš ï¸ No s'ha trobat la API key al Registre!");
}

app.use(express.static("public"));

app.post("/upload", upload.single("video"), async (req, res) => {
  const videoPath = req.file.path;
  const audioPath = path.join("uploads", \\.mp3\);

  await new Promise((resolve, reject) => {
    exec(\fmpeg -y -i "\" -vn -acodec libmp3lame "\"\, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const formData = new FormData();
  formData.append("model", "whisper-1");
  formData.append("file", fs.createReadStream(audioPath));
  formData.append("language", "ca");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { "Authorization": \Bearer \<deleted>\ },
    body: formData,
  });

  const data = await response.json();
  fs.unlinkSync(videoPath);
  fs.unlinkSync(audioPath);

  res.json(data);
});

app.listen(3000, () => console.log("ðŸŒ Servidor actiu a http://localhost:3000"));
