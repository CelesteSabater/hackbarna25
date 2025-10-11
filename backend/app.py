from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional, Any
from datetime import datetime
import sqlite3
import json
import os

app = FastAPI(title="Meal Planner API", version="1.0.0")

# Configuración CORS mejorada
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Modelos
class MealPlan(BaseModel):
    week: str
    meals: Dict[str, Any]
    mealDetails: Dict[str, Any]
    totalCalories: int = 0

# Configuración de la base de datos
DATABASE_NAME = "meal_planner.db"

def init_db():
    """Inicializar la base de datos y crear tablas si no existen"""
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS meal_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            week TEXT UNIQUE NOT NULL,
            meals TEXT NOT NULL,
            meal_details TEXT NOT NULL,
            total_calories INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT
        )
    ''')
    
    conn.commit()
    conn.close()

def get_db_connection():
    """Obtener conexión a la base de datos"""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row  # Para acceso por nombre de columna
    return conn

# Inicializar la base de datos al iniciar
init_db()

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
    """Obtener todos los planes de comidas"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM meal_plans ORDER BY created_at DESC
    ''')
    
    plans = []
    for row in cursor.fetchall():
        plan = {
            "id": row["id"],
            "week": row["week"],
            "meals": json.loads(row["meals"]),
            "mealDetails": json.loads(row["meal_details"]),
            "totalCalories": row["total_calories"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        }
        plans.append(plan)
    
    conn.close()
    return {"plans": plans}

@app.get("/api/plans/{week}")
async def get_meal_plan(week: str):
    """Obtener un plan específico por semana"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        print(f"API: Buscando plan para semana: {week}")
        
        cursor.execute('SELECT * FROM meal_plans WHERE week = ?', (week,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            plan = {
                "id": row["id"],
                "week": row["week"],
                "meals": json.loads(row["meals"]),
                "mealDetails": json.loads(row["meal_details"]),
                "totalCalories": row["total_calories"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"]
            }
            print(f"API: Plan encontrado - {plan['week']}")
            return plan
        else:
            print(f"API: Plan no encontrado - {week}")
            raise HTTPException(status_code=404, detail=f"Plan para la semana {week} no encontrado")
            
    except Exception as e:
        print(f"API: Error obteniendo plan {week}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@app.post("/api/plans")
async def create_meal_plan(plan: MealPlan):
    """Crear o actualizar un plan de comidas"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    
    try:
        # Intentar insertar o reemplazar
        cursor.execute('''
            INSERT OR REPLACE INTO meal_plans 
            (week, meals, meal_details, total_calories, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            plan.week,
            json.dumps(plan.meals),
            json.dumps(plan.mealDetails),
            plan.totalCalories,
            now,
            now
        ))
        
        conn.commit()
        plan_id = cursor.lastrowid
        
        # Obtener el plan guardado
        cursor.execute('SELECT * FROM meal_plans WHERE id = ?', (plan_id,))
        row = cursor.fetchone()
        
        saved_plan = {
            "id": row["id"],
            "week": row["week"],
            "meals": json.loads(row["meals"]),
            "mealDetails": json.loads(row["meal_details"]),
            "totalCalories": row["total_calories"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        }
        
        conn.close()
        return {"message": "Plan guardado exitosamente", "plan": saved_plan}
        
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Error al guardar el plan: {str(e)}")

@app.put("/api/plans/{week}")
async def update_meal_plan(week: str, updated_plan: MealPlan):
    """Actualizar un plan existente"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verificar si existe
    cursor.execute('SELECT id FROM meal_plans WHERE week = ?', (week,))
    existing = cursor.fetchone()
    
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    
    now = datetime.now().isoformat()
    
    try:
        cursor.execute('''
            UPDATE meal_plans 
            SET meals = ?, meal_details = ?, total_calories = ?, updated_at = ?
            WHERE week = ?
        ''', (
            json.dumps(updated_plan.meals),
            json.dumps(updated_plan.mealDetails),
            updated_plan.totalCalories,
            now,
            week
        ))
        
        conn.commit()
        
        # Obtener el plan actualizado
        cursor.execute('SELECT * FROM meal_plans WHERE week = ?', (week,))
        row = cursor.fetchone()
        
        updated_plan_data = {
            "id": row["id"],
            "week": row["week"],
            "meals": json.loads(row["meals"]),
            "mealDetails": json.loads(row["meal_details"]),
            "totalCalories": row["total_calories"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        }
        
        conn.close()
        return {"message": "Plan actualizado exitosamente", "plan": updated_plan_data}
        
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Error al actualizar el plan: {str(e)}")

@app.delete("/api/plans/{week}")
async def delete_meal_plan(week: str):
    """Eliminar un plan"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verificar si existe
    cursor.execute('SELECT * FROM meal_plans WHERE week = ?', (week,))
    existing = cursor.fetchone()
    
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    
    try:
        cursor.execute('DELETE FROM meal_plans WHERE week = ?', (week,))
        conn.commit()
        conn.close()
        
        return {"message": "Plan eliminado exitosamente"}
        
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Error al eliminar el plan: {str(e)}")

@app.get("/api/debug/db")
async def debug_database():
    """Endpoint para debug - ver estado de la base de datos"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    
    cursor.execute("SELECT * FROM meal_plans")
    plans = cursor.fetchall()
    
    conn.close()
    
    return {
        "tables": [table[0] for table in tables],
        "plan_count": len(plans),
        "plans": [dict(plan) for plan in plans]
    }

@app.get("/api/debug/plan/{week}")
async def debug_get_plan(week: str):
    """Endpoint de debug para verificar la obtención de planes"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    print(f"Buscando plan para la semana: {week}")
    
    cursor.execute('SELECT * FROM meal_plans WHERE week = ?', (week,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        plan = {
            "id": row["id"],
            "week": row["week"],
            "meals": json.loads(row["meals"]),
            "mealDetails": json.loads(row["meal_details"]),
            "totalCalories": row["total_calories"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        }
        print(f"Plan encontrado: {plan['week']}")
        return plan
    else:
        print(f"Plan no encontrado para semana: {week}")
        return {"error": "Plan no encontrado", "week": week}

@app.get("/api/health")
async def health_check():
    """Endpoint para verificar que el backend está funcionando"""
    return {
        "status": "healthy",
        "service": "Meal Planner API",
        "timestamp": datetime.now().isoformat(),
        "database": "connected"  # Podrías agregar una verificación de DB aquí
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)