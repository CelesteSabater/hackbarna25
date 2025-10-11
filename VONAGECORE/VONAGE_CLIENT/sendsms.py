import os
import vonage

# Carrega les variables d'entorn
VONAGE_API_KEY = os.getenv("VONAGE_API_KEY")
VONAGE_API_SECRET = os.getenv("VONAGE_API_SECRET")
VONAGE_FROM = os.getenv("VONAGE_FROM")  # el teu número Vonage o nom

if not (VONAGE_API_KEY and VONAGE_API_SECRET and VONAGE_FROM):
    raise SystemExit("Set VONAGE_API_KEY, VONAGE_API_SECRET and VONAGE_FROM in env.")

client = vonage.Client(key=VONAGE_API_KEY, secret=VONAGE_API_SECRET)
sms = vonage.Sms(client)

to_number = input("Phone to send test SMS (E.164, e.g. +34...): ").strip()
text = "Test message from Vonage (LIPCORE demo)."

response = sms.send_message({
    "from": VONAGE_FROM,
    "to": to_number,
    "text": text
})

print("Response:", response)