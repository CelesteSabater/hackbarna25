from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional, Any, List
from datetime import datetime
import sqlite3
import json
import uuid

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

# Modelos existentes
class MealPlan(BaseModel):
    week: str
    meals: Dict[str, Any]
    mealDetails: Dict[str, Any]
    totalCalories: int = 0

# Nuevos modelos para IA
class AIPlanRequest(BaseModel):
    dietType: Optional[str] = None
    calorieTarget: Optional[str] = None
    allergies: List[str] = []
    preferences: Optional[str] = None
    goals: Optional[str] = None
    week: str

class AIPlanResponse(BaseModel):
    id: str
    week: str
    dietType: str
    calorieTarget: str
    meals: Dict[str, Any]
    totalCalories: int
    generatedAt: str
    requestData: Dict[str, Any]

# Configuración de la base de datos
DATABASE_NAME = "meal_planner.db"

def init_db():
    """Inicializar la base de datos y crear tablas si no existen"""
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()
    
    # Tabla existente para planes normales
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
    
    # Nueva tabla para planes de IA
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ai_meal_plans (
            id TEXT PRIMARY KEY,
            week TEXT NOT NULL,
            diet_type TEXT NOT NULL,
            calorie_target TEXT NOT NULL,
            meals TEXT NOT NULL,
            total_calories INTEGER DEFAULT 0,
            request_data TEXT NOT NULL,
            generated_at TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')
    
    # Tabla para historial de requests de IA
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ai_requests (
            id TEXT PRIMARY KEY,
            request_data TEXT NOT NULL,
            response_data TEXT NOT NULL,
            created_at TEXT NOT NULL,
            user_rating INTEGER DEFAULT 0,
            user_feedback TEXT
        )
    ''')
    
    conn.commit()
    conn.close()

def get_db_connection():
    """Obtener conexión a la base de datos"""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    return conn

# Inicializar la base de datos al iniciar
init_db()

# Pool de comidas para la IA
MEAL_POOL = {
    "equilibrada": {
        "desayuno": [
            {"name": "Yogur griego con granola y miel", "calories": 320, "protein": 15, "carbs": 45, "fat": 8},
            {"name": "Tostadas integrales con aguacate y huevo pochado", "calories": 350, "protein": 18, "carbs": 30, "fat": 12},
            {"name": "Batido de proteínas con plátano y espinacas", "calories": 280, "protein": 20, "carbs": 35, "fat": 5},
            {"name": "Avena con canela, manzana y nueces", "calories": 300, "protein": 10, "carbs": 45, "fat": 8},
            {"name": "Tortilla de claras con espinacas y tomate", "calories": 250, "protein": 22, "carbs": 10, "fat": 12}
        ],
        "almuerzo": [
            {"name": "Ensalada César con pollo a la plancha", "calories": 420, "protein": 35, "carbs": 20, "fat": 15},
            {"name": "Salmón al horno con quinoa y espárragos", "calories": 450, "protein": 30, "carbs": 35, "fat": 18},
            {"name": "Wrap de pavo con aguacate y vegetales frescos", "calories": 380, "protein": 25, "carbs": 40, "fat": 12},
            {"name": "Bowl de arroz integral con tofu salteado y verduras", "calories": 400, "protein": 20, "carbs": 55, "fat": 10},
            {"name": "Lentejas estofadas con verduras y arroz", "calories": 350, "protein": 18, "carbs": 50, "fat": 6}
        ],
        "cena": [
            {"name": "Crema de calabacín con picatostes integrales", "calories": 280, "protein": 8, "carbs": 30, "fat": 12},
            {"name": "Pescado blanco al vapor con patatas y brócoli", "calories": 320, "protein": 25, "carbs": 35, "fat": 8},
            {"name": "Ensalada de garbanzos, atún y vegetales", "calories": 300, "protein": 22, "carbs": 25, "fat": 12},
            {"name": "Tortilla de espinacas y champiñones", "calories": 250, "protein": 18, "carbs": 10, "fat": 15},
            {"name": "Sopa de miso con tofu, algas y cebollino", "calories": 220, "protein": 12, "carbs": 20, "fat": 8}
        ]
    },
    "vegetariana": {
        "desayuno": [
            {"name": "Yogur griego con granola y frutos rojos", "calories": 320, "protein": 15, "carbs": 45, "fat": 8},
            {"name": "Tostadas integrales con hummus y tomate", "calories": 300, "protein": 12, "carbs": 40, "fat": 10},
            {"name": "Batido de proteína vegetal con plátano", "calories": 280, "protein": 18, "carbs": 35, "fat": 5},
            {"name": "Avena con frutos secos y canela", "calories": 320, "protein": 10, "carbs": 50, "fat": 8},
            {"name": "Tortilla de tofu con espinacas", "calories": 260, "protein": 20, "carbs": 8, "fat": 15}
        ],
        "almuerzo": [
            {"name": "Ensalada de quinoa con garbanzos y vegetales", "calories": 380, "protein": 15, "carbs": 55, "fat": 12},
            {"name": "Wrap vegetariano con hummus y verduras", "calories": 350, "protein": 12, "carbs": 45, "fat": 10},
            {"name": "Bowl de lentejas con arroz integral", "calories": 400, "protein": 18, "carbs": 60, "fat": 8},
            {"name": "Pasta integral con salsa de tomate y albóndigas de lentejas", "calories": 420, "protein": 20, "carbs": 65, "fat": 10},
            {"name": "Hamburguesa de garbanzos con ensalada", "calories": 380, "protein": 16, "carbs": 45, "fat": 12}
        ],
        "cena": [
            {"name": "Crema de calabaza con semillas de calabaza", "calories": 280, "protein": 8, "carbs": 30, "fat": 12},
            {"name": "Revuelto de tofu con champiñones", "calories": 250, "protein": 20, "carbs": 10, "fat": 15},
            {"name": "Ensalada de espinacas, nueces y queso feta", "calories": 320, "protein": 15, "carbs": 15, "fat": 22},
            {"name": "Sopa de lentejas y verduras", "calories": 300, "protein": 18, "carbs": 40, "fat": 8},
            {"name": "Verduras al horno con quinoa", "calories": 350, "protein": 12, "carbs": 50, "fat": 12}
        ]
    },
    "vegana": {
        "desayuno": [
            {"name": "Pudín de chía con leche de almendras y frutos rojos", "calories": 280, "protein": 8, "carbs": 35, "fat": 12},
            {"name": "Tostadas integrales con aguacate y tomate", "calories": 320, "protein": 6, "carbs": 35, "fat": 18},
            {"name": "Batido verde con espinacas y plátano", "calories": 250, "protein": 5, "carbs": 45, "fat": 6},
            {"name": "Avena con leche de soja y frutos secos", "calories": 300, "protein": 10, "carbs": 45, "fat": 8},
            {"name": "Smoothie bowl con granola y coco", "calories": 350, "protein": 8, "carbs": 50, "fat": 12}
        ],
        "almuerzo": [
            {"name": "Buddha bowl con quinoa, garbanzos y vegetales", "calories": 400, "protein": 15, "carbs": 60, "fat": 12},
            {"name": "Wrap vegano con hummus y vegetales frescos", "calories": 350, "protein": 10, "carbs": 45, "fat": 12},
            {"name": "Curry de garbanzos y espinacas con arroz", "calories": 420, "protein": 18, "carbs": 65, "fat": 10},
            {"name": "Hamburguesa de lentejas con batatas al horno", "calories": 380, "protein": 20, "carbs": 55, "fat": 10},
            {"name": "Pasta con salsa de anacardos y setas", "calories": 400, "protein": 15, "carbs": 60, "fat": 12}
        ],
        "cena": [
            {"name": "Sopa de miso con tofu y algas", "calories": 220, "protein": 12, "carbs": 20, "fat": 8},
            {"name": "Ensalada de lentejas con vinagreta de limón", "calories": 280, "protein": 18, "carbs": 30, "fat": 10},
            {"name": "Verduras salteadas con tempeh", "calories": 300, "protein": 20, "carbs": 25, "fat": 12},
            {"name": "Crema de brócoli con anacardos", "calories": 250, "protein": 8, "carbs": 25, "fat": 12},
            {"name": "Pimientos rellenos de arroz y legumbres", "calories": 320, "protein": 15, "carbs": 45, "fat": 10}
        ]
    }
}

# Añadir más tipos de dieta
MEAL_POOL["baja-carbohidratos"] = {
    "desayuno": [
        {"name": "Huevos revueltos con aguacate", "calories": 350, "protein": 20, "carbs": 8, "fat": 28},
        {"name": "Yogur griego con nueces", "calories": 300, "protein": 25, "carbs": 10, "fat": 20},
        {"name": "Tortilla de espinacas y queso feta", "calories": 280, "protein": 22, "carbs": 6, "fat": 20}
    ],
    "almuerzo": [
        {"name": "Ensalada César con pollo (sin crutones)", "calories": 400, "protein": 35, "carbs": 8, "fat": 25},
        {"name": "Salmón con espárragos salteados", "calories": 380, "protein": 30, "carbs": 6, "fat": 25},
        {"name": "Pechuga de pollo con brócoli y coliflor", "calories": 350, "protein": 40, "carbs": 10, "fat": 15}
    ],
    "cena": [
        {"name": "Pescado blanco con espinacas salteadas", "calories": 300, "protein": 25, "carbs": 6, "fat": 18},
        {"name": "Carne picada con calabacín", "calories": 320, "protein": 28, "carbs": 8, "fat": 20},
        {"name": "Ensalada de atún con aguacate", "calories": 280, "protein": 22, "carbs": 5, "fat": 20}
    ]
}

# Endpoints existentes (se mantienen igual)
@app.get("/")
async def root():
    return {"message": "Meal Planner API", "version": "1.0.0"}

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Meal Planner API",
        "timestamp": datetime.now().isoformat(),
        "database": "connected"
    }

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

# Endpoints existentes para planes normales (se mantienen igual)
@app.get("/api/plans")
async def get_meal_plans():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM meal_plans ORDER BY created_at DESC')
    
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
    conn = get_db_connection()
    cursor = conn.cursor()
    
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
        return plan
    else:
        raise HTTPException(status_code=404, detail="Plan no encontrado")

@app.post("/api/plans")
async def create_meal_plan(plan: MealPlan):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    
    try:
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

# NUEVOS ENDPOINTS PARA IA

@app.post("/api/ai/generate-plan")
async def generate_ai_plan(request: AIPlanRequest):
    """Generar un plan de comidas usando IA (simulada)"""
    try:
        # Validar request
        if not request.week:
            raise HTTPException(status_code=400, detail="La semana es requerida")
        
        # Generar plan con IA simulada
        ai_plan = await generate_ai_plan_simulated(request)
        
        # Guardar en base de datos
        plan_id = await save_ai_plan_to_db(ai_plan)
        ai_plan.id = plan_id
        
        # Guardar en historial de requests
        await save_ai_request_to_db(request, ai_plan)
        
        return ai_plan
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando plan de IA: {str(e)}")

@app.get("/api/ai/plans")
async def get_ai_plans(limit: int = 10):
    """Obtener planes de IA recientes"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM ai_meal_plans 
        ORDER BY created_at DESC 
        LIMIT ?
    ''', (limit,))
    
    plans = []
    for row in cursor.fetchall():
        plan = {
            "id": row["id"],
            "week": row["week"],
            "dietType": row["diet_type"],
            "calorieTarget": row["calorie_target"],
            "meals": json.loads(row["meals"]),
            "totalCalories": row["total_calories"],
            "requestData": json.loads(row["request_data"]),
            "generatedAt": row["generated_at"],
            "created_at": row["created_at"]
        }
        plans.append(plan)
    
    conn.close()
    return {"plans": plans}

@app.get("/api/ai/plans/{plan_id}")
async def get_ai_plan(plan_id: str):
    """Obtener un plan de IA específico"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM ai_meal_plans WHERE id = ?', (plan_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        plan = {
            "id": row["id"],
            "week": row["week"],
            "dietType": row["diet_type"],
            "calorieTarget": row["calorie_target"],
            "meals": json.loads(row["meals"]),
            "totalCalories": row["total_calories"],
            "requestData": json.loads(row["request_data"]),
            "generatedAt": row["generated_at"],
            "created_at": row["created_at"]
        }
        return plan
    else:
        raise HTTPException(status_code=404, detail="Plan de IA no encontrado")

@app.post("/api/ai/plans/{plan_id}/save-as-normal")
async def save_ai_plan_as_normal(plan_id: str):
    """Guardar un plan de IA como plan normal"""
    try:
        # Obtener el plan de IA
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM ai_meal_plans WHERE id = ?', (plan_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            raise HTTPException(status_code=404, detail="Plan de IA no encontrado")
        
        ai_plan = {
            "id": row["id"],
            "week": row["week"],
            "meals": json.loads(row["meals"]),
            "dietType": row["diet_type"],
            "totalCalories": row["total_calories"]
        }
        
        # Convertir a formato de plan normal
        normal_plan = convert_ai_to_normal_plan(ai_plan)
        
        # Guardar como plan normal
        now = datetime.now().isoformat()
        
        cursor.execute('''
            INSERT OR REPLACE INTO meal_plans 
            (week, meals, meal_details, total_calories, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            normal_plan.week,
            json.dumps(normal_plan.meals),
            json.dumps(normal_plan.mealDetails),
            normal_plan.totalCalories,
            now,
            now
        ))
        
        conn.commit()
        conn.close()
        
        return {"message": "Plan de IA guardado como plan normal exitosamente", "plan": normal_plan}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error guardando plan de IA: {str(e)}")

@app.post("/api/ai/feedback")
async def submit_ai_feedback(feedback_data: dict):
    """Enviar feedback sobre un plan generado por IA"""
    try:
        request_id = feedback_data.get("request_id")
        rating = feedback_data.get("rating")
        feedback = feedback_data.get("feedback")
        
        if not request_id or rating is None:
            raise HTTPException(status_code=400, detail="request_id y rating son requeridos")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE ai_requests 
            SET user_rating = ?, user_feedback = ?
            WHERE id = ?
        ''', (rating, feedback, request_id))
        
        conn.commit()
        conn.close()
        
        return {"message": "Feedback guardado exitosamente"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error guardando feedback: {str(e)}")

async def generate_ai_plan_simulated(request: AIPlanRequest) -> AIPlanResponse:
    """Simular generación de plan por IA"""
    # Simular procesamiento de IA
    import asyncio
    await asyncio.sleep(2)  # Simular tiempo de procesamiento
    
    # Determinar tipo de dieta
    diet_type = request.dietType or "equilibrada"
    if diet_type not in MEAL_POOL:
        diet_type = "equilibrada"
    
    # Obtener pool de comidas según dieta
    meal_pool = MEAL_POOL[diet_type]
    
    # Ajustar calorías según objetivo
    adjusted_meals = adjust_calories_for_target(meal_pool, request.calorieTarget)
    
    # Generar plan semanal - USAR MINÚSCULAS CONSISTENTEMENTE
    days_of_week = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]
    meal_times = ["desayuno", "almuerzo", "cena"]
    
    meals = {}
    total_calories = 0
    
    for day in days_of_week:
        meals[day] = {}
        for meal_time in meal_times:
            # Seleccionar comida aleatoria del pool
            available_meals = adjusted_meals.get(meal_time, [])
            if not available_meals:
                # Fallback si no hay comidas para este tipo de comida
                selected_meal = {
                    "name": f"Comida {diet_type} - {meal_time}", 
                    "calories": 300,
                    "protein": 15,
                    "carbs": 35,
                    "fat": 10
                }
            else:
                selected_meal = available_meals[0]  # Usar la primera por simplicidad
            
            # Aplicar filtros por alergias
            if request.allergies:
                selected_meal = apply_allergy_filters(selected_meal, request.allergies)
            
            meals[day][meal_time] = selected_meal
            total_calories += selected_meal["calories"]
    
    return AIPlanResponse(
        id=str(uuid.uuid4()),
        week=request.week,
        dietType=diet_type,
        calorieTarget=request.calorieTarget or "1800-2200",
        meals=meals,
        totalCalories=total_calories,
        generatedAt=datetime.now().isoformat(),
        requestData=request.dict()
    )

def adjust_calories_for_target(meal_pool: dict, calorie_target: str) -> dict:
    """Ajustar calorías de las comidas según el objetivo"""
    adjusted_pool = {}
    
    # Calorías objetivo por comida
    target_ranges = {
        "": {"desayuno": (250, 350), "almuerzo": (350, 450), "cena": (200, 300)},
        "1200-1500": {"desayuno": (200, 280), "almuerzo": (300, 380), "cena": (180, 250)},
        "1500-1800": {"desayuno": (220, 300), "almuerzo": (320, 400), "cena": (200, 280)},
        "1800-2200": {"desayuno": (250, 350), "almuerzo": (350, 450), "cena": (220, 300)},
        "2200-2500": {"desayuno": (280, 380), "almuerzo": (380, 480), "cena": (250, 350)},
        "2500-3000": {"desayuno": (300, 400), "almuerzo": (400, 500), "cena": (280, 380)}
    }
    
    target_range = target_ranges.get(calorie_target, target_ranges[""])
    
    for meal_time, meal_list in meal_pool.items():
        adjusted_meals = []
        for meal in meal_list:
            # Ajustar calorías al rango objetivo (simulado)
            min_cal, max_cal = target_range.get(meal_time, (250, 350))
            if meal["calories"] < min_cal:
                # Aumentar ligeramente las calorías
                adjusted_meal = meal.copy()
                adjusted_meal["calories"] = min_cal + 20
                adjusted_meals.append(adjusted_meal)
            elif meal["calories"] > max_cal:
                # Reducir ligeramente las calorías
                adjusted_meal = meal.copy()
                adjusted_meal["calories"] = max_cal - 20
                adjusted_meals.append(adjusted_meal)
            else:
                adjusted_meals.append(meal)
        
        adjusted_pool[meal_time] = adjusted_meals
    
    return adjusted_pool

def apply_allergy_filters(meal: dict, allergies: list) -> dict:
    """Aplicar filtros por alergias"""
    meal_name = meal["name"].lower()
    
    allergy_filters = {
        "lactosa": ["yogur", "queso", "leche", "griego", "feta"],
        "frutos-secos": ["nueces", "almendras", "avellanas", "anacardos", "granola"],
        "mariscos": ["salmón", "atún", "pescado", "marisco", "algas"],
        "huevos": ["huevo", "huevos", "tortilla", "revueltos"],
        "soja": ["tofu", "tempeh", "soja", "miso"]
    }
    
    for allergy in allergies:
        if allergy in allergy_filters:
            for forbidden in allergy_filters[allergy]:
                if forbidden in meal_name:
                    # Reemplazar con comida alternativa
                    return {
                        "name": f"Alternativa sin {allergy}: {meal['name']}",
                        "calories": meal["calories"],
                        "protein": meal.get("protein", 0),
                        "carbs": meal.get("carbs", 0),
                        "fat": meal.get("fat", 0)
                    }
    
    return meal

async def save_ai_plan_to_db(ai_plan: AIPlanResponse) -> str:
    """Guardar plan de IA en la base de datos"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO ai_meal_plans 
            (id, week, diet_type, calorie_target, meals, total_calories, request_data, generated_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            ai_plan.id,
            ai_plan.week,
            ai_plan.dietType,
            ai_plan.calorieTarget,
            json.dumps(ai_plan.meals),
            ai_plan.totalCalories,
            json.dumps(ai_plan.requestData),
            ai_plan.generatedAt,
            datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
        return ai_plan.id
        
    except Exception as e:
        conn.close()
        raise e

async def save_ai_request_to_db(request: AIPlanRequest, response: AIPlanResponse):
    """Guardar request y response de IA en el historial"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO ai_requests 
            (id, request_data, response_data, created_at)
            VALUES (?, ?, ?, ?)
        ''', (
            str(uuid.uuid4()),
            json.dumps(request.dict()),
            json.dumps(response.dict()),
            datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        conn.close()
        # No fallar si no se puede guardar el historial
        print(f"Error guardando historial de IA: {e}")

def convert_ai_to_normal_plan(ai_plan: dict) -> MealPlan:
    """Convertir plan de IA a formato de plan normal"""
    meals = {}
    meal_details = {}
    
    # USAR LAS MISMAS KEYS QUE EL BACKEND GENERA
    days_of_week = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]
    meal_times = ["desayuno", "almuerzo", "cena"]
    
    for day in days_of_week:
        meals[day] = {}
        meal_details[day] = {}
        
        for meal_time in meal_times:
            ai_meal = ai_plan["meals"][day][meal_time]
            meals[day][meal_time] = ai_meal["name"]
            meal_details[day][meal_time] = {
                "name": ai_meal["name"],
                "calories": ai_meal["calories"],
                "protein": ai_meal.get("protein", 0),
                "carbs": ai_meal.get("carbs", 0),
                "fat": ai_meal.get("fat", 0)
            }
    
    return MealPlan(
        week=ai_plan["week"],
        meals=meals,
        mealDetails=meal_details,
        totalCalories=ai_plan["totalCalories"]
    )

# Endpoints de debug
@app.get("/api/debug/db")
async def debug_database():
    """Endpoint para debug - ver estado de la base de datos"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    
    cursor.execute("SELECT COUNT(*) as count FROM meal_plans")
    normal_plans_count = cursor.fetchone()["count"]
    
    cursor.execute("SELECT COUNT(*) as count FROM ai_meal_plans")
    ai_plans_count = cursor.fetchone()["count"]
    
    cursor.execute("SELECT COUNT(*) as count FROM ai_requests")
    ai_requests_count = cursor.fetchone()["count"]
    
    conn.close()
    
    return {
        "tables": [table[0] for table in tables],
        "normal_plans_count": normal_plans_count,
        "ai_plans_count": ai_plans_count,
        "ai_requests_count": ai_requests_count
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)