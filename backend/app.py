from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional, Any
from datetime import datetime

app = FastAPI(title="Meal Planner API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos más simples y flexibles
class MealPlan(BaseModel):
    week: str
    meals: Dict[str, Any]  # Estructura flexible para las comidas
    mealDetails: Dict[str, Any]  # Estructura flexible para los detalles
    totalCalories: int = 0

# Base de datos en memoria
meal_plans = []

@app.get("/")
async def root():
    return {"message": "Meal Planner API", "version": "1.0.0"}

@app.get("/api/meals/suggestions")
async def get_meal_suggestions():
    suggestions = [
        "Pollo a la plancha con verduras (350 kcal)",
        "Salmón al horno con espárragos (400 kcal)",
        "Ensalada César con pollo (320 kcal)",
        "Pasta integral con salsa de tomate (380 kcal)",
        "Bowl de quinoa con aguacate (280 kcal)",
        "Sopa de lentejas (250 kcal)",
        "Tortilla de espinacas (300 kcal)",
        "Wrap de pavo y vegetales (280 kcal)",
        "Arroz frito con vegetales (350 kcal)",
        "Hamburguesa de lentejas (320 kcal)"
    ]
    return {"suggestions": suggestions}

@app.get("/api/plans")
async def get_meal_plans():
    return {"plans": meal_plans}

@app.get("/api/plans/{week}")
async def get_meal_plan(week: str):
    for plan in meal_plans:
        if plan["week"] == week:
            return plan
    raise HTTPException(status_code=404, detail="Plan no encontrado")

@app.post("/api/plans")
async def create_meal_plan(plan: MealPlan):
    # Eliminar plan existente para la misma semana si existe
    meal_plans[:] = [p for p in meal_plans if p["week"] != plan.week]
    
    plan_dict = plan.dict()
    plan_dict["id"] = len(meal_plans) + 1
    plan_dict["created_at"] = datetime.now().isoformat()
    
    meal_plans.append(plan_dict)
    return {"message": "Plan creado exitosamente", "plan": plan_dict}

@app.put("/api/plans/{week}")
async def update_meal_plan(week: str, updated_plan: MealPlan):
    for i, plan in enumerate(meal_plans):
        if plan["week"] == week:
            updated_dict = updated_plan.dict()
            updated_dict["id"] = plan["id"]
            updated_dict["created_at"] = plan["created_at"]
            updated_dict["updated_at"] = datetime.now().isoformat()
            
            meal_plans[i] = updated_dict
            return {"message": "Plan actualizado exitosamente", "plan": updated_dict}
    
    raise HTTPException(status_code=404, detail="Plan no encontrado")

@app.delete("/api/plans/{week}")
async def delete_meal_plan(week: str):
    for i, plan in enumerate(meal_plans):
        if plan["week"] == week:
            deleted_plan = meal_plans.pop(i)
            return {"message": "Plan eliminado exitosamente", "plan": deleted_plan}
    
    raise HTTPException(status_code=404, detail="Plan no encontrado")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)