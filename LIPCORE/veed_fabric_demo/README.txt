README - VEED Fabric demo (Windows)
==================================
Aquest projecte estÃ  configurat per pujar UNA IMATGE i UN FITXER D'AUDIO. No cal escriure text.

Passos rÃ pids per fer la demo:
1) Obre una finestra PowerShell i arrenca ngrok (mantingues-la oberta):
   ngrok http 5000
   Observa la sortida i copia la URL pÃºblica https que mostra a 'Forwarding'.
   Exemple: https://trichogynial-kayce-nondevotional.ngrok-free.dev

2) Obre UNA NOVA finestra PowerShell i entra al directori del projecte:
   cd <ruta_on_has_creat_el_projecte>\veed_fabric_demo

3) (Opcional) Assigna la PUBLIC_URL a la sessiÃ³ (copia la URL que ngrok et dÃ³na). Exemple:
   https://trichogynial-kayce-nondevotional.ngrok-free.dev = "https://trichogynial-kayce-nondevotional.ngrok-free.dev"
   Alternativament start.ps1 intentarÃ  detectar-la automÃ ticament si ngrok ja estÃ  corrent.

4) Comprova que FAL_KEY estÃ  disponible:
   echo 9106dd98-e0b3-46f8-bf17-6e95d4280c06:ead08caa1dfd4a7cc9a2b2ee0a0ea9da

5) Executa start.ps1 per crear/activar el venv, instalÂ·lar deps i arrencar l'app:
   .\start.ps1

6) Obre la PUBLIC_URL al navegador i fes la demo: puja una foto i un fitxer d'Ã udio, prem "Genera vÃ­deo".
Notes:
- Cada generaciÃ³ consumeix crÃ¨dit a fal.ai. Prova amb fitxers curts i resoluciÃ³ 480p.
- No comparteixis la teva FAL_KEY pÃºblicament.
- Els formats d'Ã udio recomanats: mp3 o wav.
