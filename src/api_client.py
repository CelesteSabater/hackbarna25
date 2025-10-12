import requests
from typing import Optional, Dict, Any

BASE_URL = "http://localhost:8000"

class APIClient:
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url

    def get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Any:
        url = f"{self.base_url}{endpoint}"
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()

    def post(self, endpoint: str, params: Optional[Dict[str, Any]] = None, data: Optional[Dict[str, Any]] = None) -> Any:
        url = f"{self.base_url}{endpoint}"
        response = requests.post(url, params=params, json=data)
        response.raise_for_status()
        return response.json()

    # Métodos específicos para cada endpoint
    def health(self):
        return self.get("/health")

    def list_stores(self, limit=20):
        return self.get("/api/stores", params={"limit": limit})

    def filter_stores_by_cuisine(self, cuisine: str, limit=20):
        return self.get("/api/stores", params={"cuisine": cuisine, "limit": limit})

    def list_products(self, limit=20):
        return self.get("/api/products", params={"limit": limit})

    def filter_products(self, store_id: int = None, dietary: str = None, category: str = None, limit: int = 10):
        params = {"limit": limit}
        if store_id:
            params["store_id"] = store_id
        if dietary:
            params["dietary"] = dietary
        if category:
            params["category"] = category
        return self.get("/api/products", params=params)

    def list_users(self):
        return self.get("/api/users")

    def get_user_profile(self, user_id: int):
        return self.get(f"/api/users/{user_id}")

    def get_user_orders(self, user_id: int, limit: int = 5):
        return self.get(f"/api/users/{user_id}/orders", params={"limit": limit})

    def add_product_to_cart(self, session_id: str, product_id: int, quantity: int = 1):
        return self.post(f"/api/carts/{session_id}/add", params={"product_id": product_id, "quantity": quantity})

    def view_cart(self, session_id: str):
        return self.get(f"/api/carts/{session_id}")
