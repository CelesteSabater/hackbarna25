import json
from pinecone import Pinecone
import os

# Configuración de Pinecone
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "pcsk_not_really_a_key")
INDEX_NAME = "hackbarna2025"

pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(INDEX_NAME)

# Cargar datos
with open("backend/data/stores.json", "r", encoding="utf-8") as f:
    stores = json.load(f)
with open("backend/data/products.json", "r", encoding="utf-8") as f:
    products = json.load(f)

index = pc.Index(INDEX_NAME)

def store_to_vector(store):
    # Ejemplo simple: vectorizar usando rating, delivery_fee, minimum_order, y longitud de nombre
    return [
        float(store.get("rating", 0)),
        float(store.get("delivery_fee", 0)),
        float(store.get("minimum_order", 0)),
        len(store.get("store_name", "")),
        len(store.get("description", "")),
        len(store.get("location", "")),
        len(store.get("cuisine", "")),
        len(store.get("type", "")),
    ]

def product_to_vector(product):
    # Ejemplo simple: vectorizar usando price, calories, popularity_score, y longitud de nombre
    return [
        float(product.get("price", 0)),
        float(product.get("calories", 0)),
        float(product.get("popularity_score", 0)),
        len(product.get("product_name", "")),
        len(product.get("description", "")),
        len(product.get("category", "")),
        len(str(product.get("ingredients", []))),
        int(product.get("available", 0)),
    ]

# Insertar stores
for store in stores:
    vector = store_to_vector(store)
    index.upsert(vectors=[(str(store["id"]), vector, store)])

# Insertar products
for product in products:
    vector = product_to_vector(product)
    index.upsert(vectors=[(f"product-{product['id']}", vector, product)])

print("Datos insertados en Pinecone correctamente.")
