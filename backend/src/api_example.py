import requests

# Ejemplo de llamada GET a una API pública
url = "https://jsonplaceholder.typicode.com/todos/1"
response = requests.get(url)

if response.status_code == 200:
    data = response.json()
    print("Respuesta de la API:", data)
else:
    print(f"Error en la llamada: {response.status_code}")
