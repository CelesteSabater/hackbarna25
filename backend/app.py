from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional, Any, List
from datetime import datetime
import sqlite3
import json
from fastapi.staticfiles import StaticFiles
import uuid
import os
import traceback

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

# Nuevos modelos para salud y video
class UserHealthData(BaseModel):
    current_weight: float
    target_weight: float
    height: float
    age: int
    gender: str
    activity_level: str
    health_conditions: List[str] = []

class WeightCheckIn(BaseModel):
    weight: float
    date: str
    notes: Optional[str] = None

class VideoAnalysisRequest(BaseModel):
    week: str
    health_data: UserHealthData
    video_notes: Optional[str] = None

# Configuración de la base de datos
DATABASE_NAME = "meal_planner.db"

def init_db():
    """Inicializar la base de datos y crear tablas si no existen"""
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()
    
    # Tablas existentes
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
    
    # Nuevas tablas para salud y peso
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_health_profile (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            current_weight REAL NOT NULL,
            target_weight REAL NOT NULL,
            height REAL NOT NULL,
            age INTEGER NOT NULL,
            gender TEXT NOT NULL,
            activity_level TEXT NOT NULL,
            health_conditions TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS weight_checkins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            weight REAL NOT NULL,
            checkin_date TEXT NOT NULL,
            notes TEXT,
            created_at TEXT NOT NULL
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS video_analysis_requests (
            id TEXT PRIMARY KEY,
            week TEXT NOT NULL,
            health_data TEXT NOT NULL,
            video_notes TEXT,
            video_path TEXT,
            analysis_result TEXT,
            created_at TEXT NOT NULL
        )
    ''')
    
    conn.commit()
    conn.close()

@app.get("/videos/{filename}")
async def get_video(filename: str):
    video_path = f"videos/{filename}"
    if os.path.exists(video_path):
        from fastapi.responses import FileResponse
        return FileResponse(video_path)
    else:
        raise HTTPException(status_code=404, detail="Video no encontrado")

def get_db_connection():
    """Obtener conexión a la base de datos"""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    return conn

# Inicializar la base de datos al iniciar
init_db()

os.makedirs("backend/videos", exist_ok=True)
app.mount("/videos", StaticFiles(directory="backend/videos"), name="videos")

# Pool de comidas para la IA
MEAL_POOL = {
    "equilibrada": {
        "desayuno": [
            {"name": "Yogur griego con granola y miel", "calories": 320, "protein": 15, "carbs": 45, "fat": 8},
            {"name": "Tostadas integrales con aguacate y huevo pochado", "calories": 350, "protein": 18, "carbs": 30, "fat": 12},
            {"name": "Batido de proteínas con plátano y espinacas", "calories": 280, "protein": 20, "carbs": 35, "fat": 5}
        ],
        "almuerzo": [
            {"name": "Ensalada César con pollo a la plancha", "calories": 420, "protein": 35, "carbs": 20, "fat": 15},
            {"name": "Salmón al horno con quinoa y espárragos", "calories": 450, "protein": 30, "carbs": 35, "fat": 18},
            {"name": "Wrap de pavo con aguacate y vegetales frescos", "calories": 380, "protein": 25, "carbs": 40, "fat": 12}
        ],
        "cena": [
            {"name": "Crema de calabacín con picatostes integrales", "calories": 280, "protein": 8, "carbs": 30, "fat": 12},
            {"name": "Pescado blanco al vapor con patatas y brócoli", "calories": 320, "protein": 25, "carbs": 35, "fat": 8},
            {"name": "Ensalada de garbanzos, atún y vegetales", "calories": 300, "protein": 22, "carbs": 25, "fat": 12}
        ]
    }
}

# Endpoints básicos
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
        "Bowl de quinoa con aguacate (280 kcal)"
    ]
    return {"suggestions": suggestions}

# Endpoints para planes normales
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

@app.put("/api/plans/{week}")
async def update_meal_plan(week: str, updated_plan: MealPlan):
    conn = get_db_connection()
    cursor = conn.cursor()
    
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
    conn = get_db_connection()
    cursor = conn.cursor()
    
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

# Endpoints para IA
@app.post("/api/ai/generate-plan")
async def generate_ai_plan(request: AIPlanRequest):
    """Generar un plan de comidas usando IA (simulada)"""
    try:
        if not request.week:
            raise HTTPException(status_code=400, detail="La semana es requerida")
        
        # Generar plan con IA simulada
        ai_plan = await generate_ai_plan_simulated(request)
        
        # Guardar en base de datos
        plan_id = await save_ai_plan_to_db(ai_plan)
        ai_plan.id = plan_id
        
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

# Endpoints para salud
@app.post("/api/health/profile")
async def save_health_profile(profile: UserHealthData):
    """Guardar o actualizar el perfil de salud del usuario"""
    print(f"✅ POST /api/health/profile recibido")
    print(f"📊 Datos recibidos: {profile.dict()}")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    
    try:
        # Verificar si ya existe un perfil
        cursor.execute('SELECT id FROM user_health_profile LIMIT 1')
        existing = cursor.fetchone()
        
        if existing:
            # Actualizar perfil existente
            cursor.execute('''
                UPDATE user_health_profile 
                SET current_weight = ?, target_weight = ?, height = ?, age = ?, 
                    gender = ?, activity_level = ?, health_conditions = ?, updated_at = ?
                WHERE id = ?
            ''', (
                profile.current_weight,
                profile.target_weight,
                profile.height,
                profile.age,
                profile.gender,
                profile.activity_level,
                json.dumps(profile.health_conditions),
                now,
                existing["id"]
            ))
            print("✅ Perfil actualizado")
        else:
            # Crear nuevo perfil
            cursor.execute('''
                INSERT INTO user_health_profile 
                (current_weight, target_weight, height, age, gender, activity_level, 
                 health_conditions, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                profile.current_weight,
                profile.target_weight,
                profile.height,
                profile.age,
                profile.gender,
                profile.activity_level,
                json.dumps(profile.health_conditions),
                now,
                now
            ))
            print("✅ Nuevo perfil creado")
        
        conn.commit()
        conn.close()
        
        return {"message": "Perfil de salud guardado exitosamente"}
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        conn.close()
        raise HTTPException(status_code=500, detail=f"Error guardando perfil de salud: {str(e)}")

@app.get("/api/health/profile")
async def get_health_profile():
    """Obtener el perfil de salud del usuario"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM user_health_profile LIMIT 1')
    row = cursor.fetchone()
    conn.close()
    
    if row:
        profile = {
            "current_weight": row["current_weight"],
            "target_weight": row["target_weight"],
            "height": row["height"],
            "age": row["age"],
            "gender": row["gender"],
            "activity_level": row["activity_level"],
            "health_conditions": json.loads(row["health_conditions"]),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        }
        return profile
    else:
        return {}

@app.post("/api/health/checkin")
async def add_weight_checkin(checkin: WeightCheckIn):
    """Añadir un check-in de peso"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    
    try:
        cursor.execute('''
            INSERT INTO weight_checkins 
            (weight, checkin_date, notes, created_at)
            VALUES (?, ?, ?, ?)
        ''', (
            checkin.weight,
            checkin.date,
            checkin.notes,
            now
        ))
        
        # Actualizar el peso actual en el perfil
        cursor.execute('SELECT id FROM user_health_profile LIMIT 1')
        existing = cursor.fetchone()
        
        if existing:
            cursor.execute('''
                UPDATE user_health_profile 
                SET current_weight = ?, updated_at = ?
                WHERE id = ?
            ''', (checkin.weight, now, existing["id"]))
        
        conn.commit()
        conn.close()
        
        return {"message": "Check-in de peso guardado exitosamente"}
        
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Error guardando check-in: {str(e)}")

@app.get("/api/health/checkins")
async def get_weight_checkins(limit: int = 30):
    """Obtener historial de check-ins de peso"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM weight_checkins 
        ORDER BY checkin_date DESC 
        LIMIT ?
    ''', (limit,))
    
    checkins = []
    for row in cursor.fetchall():
        checkin = {
            "id": row["id"],
            "weight": row["weight"],
            "date": row["checkin_date"],
            "notes": row["notes"],
            "created_at": row["created_at"]
        }
        checkins.append(checkin)
    
    conn.close()
    return {"checkins": checkins}

# Endpoint para análisis de video - CORREGIDO
@app.post("/api/ai/analyze-video")
async def analyze_video(
    request: str = Form(...),
    file: UploadFile = File(...)
):
    """Analizar video y generar plan basado en contexto de salud"""
    print(f"🎬 POST /api/ai/analyze-video recibido")
    print(f"📁 Archivo recibido: {file.filename}, tipo: {file.content_type}")
    
    try:
        # Parsear el JSON del request
        print(f"📦 Parseando request JSON...")
        request_data = json.loads(request)
        video_request = VideoAnalysisRequest(**request_data)
        print(f"✅ Request parseado: {video_request.week}")
        
        # Verificar que el archivo sea un video
        if not file.content_type.startswith('video/'):
            print(f"❌ Tipo de archivo no válido: {file.content_type}")
            raise HTTPException(status_code=400, detail="El archivo debe ser un video")
        
        # Validar tamaño del archivo (máximo 50MB)
        MAX_FILE_SIZE = 50 * 1024 * 1024
        
        # Leer el contenido para verificar tamaño
        content = await file.read()
        file_size = len(content)
        
        print(f"💾 Tamaño del archivo: {file_size} bytes")
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"El video es demasiado grande. Máximo: 50MB")
        
        if file_size == 0:
            raise HTTPException(status_code=400, detail="El archivo está vacío")
        
        # Guardar el video
        video_id = str(uuid.uuid4())
        os.makedirs("videos", exist_ok=True)
        video_path = f"videos/{video_id}_{file.filename}"
        
        print(f"💾 Guardando video en: {video_path}")
        
        with open(video_path, "wb") as buffer:
            buffer.write(content)
        
        print(f"✅ Video guardado: {file_size} bytes")
        
        # Simular análisis de video
        print(f"🔍 Iniciando análisis simulado...")
        analysis_result = await simulate_video_analysis(video_request, file.filename)
        print(f"✅ Análisis completado")
        
        # Guardar en base de datos
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO video_analysis_requests 
            (id, week, health_data, video_notes, video_path, analysis_result, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            video_id,
            video_request.week,
            json.dumps(video_request.health_data.dict()),
            video_request.video_notes,
            video_path,
            json.dumps(analysis_result),
            datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
        
        print(f"📊 Análisis guardado en BD con ID: {video_id}")
        
        return {
            "message": "Video analizado exitosamente",
            "analysis_id": video_id,
            "analysis_result": analysis_result
        }
        
    except json.JSONDecodeError as e:
        print(f"❌ Error parseando JSON: {str(e)}")
        raise HTTPException(status_code=400, detail=f"JSON inválido: {str(e)}")
    except Exception as e:
        print(f"❌ Error analizando video: {str(e)}")
        print(f"🔍 Traceback completo:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error analizando video: {str(e)}")

# Funciones auxiliares
async def generate_ai_plan_simulated(request: AIPlanRequest) -> AIPlanResponse:
    """Simular generación de plan por IA"""
    import asyncio
    await asyncio.sleep(2)
    
    diet_type = request.dietType or "equilibrada"
    if diet_type not in MEAL_POOL:
        diet_type = "equilibrada"
    
    meal_pool = MEAL_POOL[diet_type]
    days_of_week = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]
    meal_times = ["desayuno", "almuerzo", "cena"]
    
    meals = {}
    total_calories = 0
    
    for day in days_of_week:
        meals[day] = {}
        for meal_time in meal_times:
            available_meals = meal_pool.get(meal_time, [])
            selected_meal = available_meals[0] if available_meals else {
                "name": f"Comida {diet_type} - {meal_time}", 
                "calories": 300,
                "protein": 15,
                "carbs": 35,
                "fat": 10
            }
            
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

async def simulate_video_analysis(request: VideoAnalysisRequest, filename: str):
    """Simular análisis de video (reemplazar con IA real)"""
    print(f"🎥 Simulando análisis para: {filename}")
    
    import asyncio
    await asyncio.sleep(2)
    
    # Generar plan basado en el contexto de salud
    health_data = request.health_data
    
    print(f"📊 Datos de salud recibidos: Peso {health_data.current_weight}kg, Altura {health_data.height}cm")
    
    # Validar datos de salud
    if health_data.current_weight <= 0 or health_data.height <= 0:
        raise ValueError("Datos de salud inválidos")
    
    # Calcular BMI y necesidades calóricas
    bmi = health_data.current_weight / ((health_data.height / 100) ** 2)
    
    # Calcular calorías basales
    if health_data.gender.lower() == "hombre":
        bmr = 10 * health_data.current_weight + 6.25 * health_data.height - 5 * health_data.age + 5
    else:
        bmr = 10 * health_data.current_weight + 6.25 * health_data.height - 5 * health_data.age - 161
    
    # Ajustar por nivel de actividad
    activity_multipliers = {
        "sedentario": 1.2,
        "ligero": 1.375,
        "moderado": 1.55,
        "activo": 1.725,
        "muy_activo": 1.9
    }
    
    tdee = bmr * activity_multipliers.get(health_data.activity_level, 1.2)
    
    # Ajustar calorías según objetivo de peso
    weight_difference = health_data.target_weight - health_data.current_weight
    if weight_difference < -2:
        daily_calories = tdee - 500
        calorie_target = "1200-1500"
    elif weight_difference > 2:
        daily_calories = tdee + 500
        calorie_target = "2500-3000"
    else:
        daily_calories = tdee
        calorie_target = "1800-2200"
    
    # Determinar tipo de dieta
    diet_type = "equilibrada"
    if health_data.health_conditions:
        if any(condition in health_data.health_conditions for condition in ["diabetes", "diabético"]):
            diet_type = "baja-carbohidratos"
        elif any(condition in health_data.health_conditions for condition in ["cardiaco", "corazón", "hipertensión"]):
            diet_type = "mediterranea"
        elif any(condition in health_data.health_conditions for condition in ["celiaco", "gluten"]):
            diet_type = "sin-gluten"
    
    analysis_result = {
        "bmi": round(bmi, 1),
        "bmr": round(bmr, 0),
        "tdee": round(tdee, 0),
        "recommended_calories": round(daily_calories, 0),
        "calorie_target": calorie_target,
        "diet_type": diet_type,
        "weight_goal": "loss" if weight_difference < 0 else "gain" if weight_difference > 0 else "maintenance",
        "weekly_goal": round(abs(weight_difference) * 0.5, 1),
        "analysis_notes": f"Basado en análisis de video: {health_data.height}cm, {health_data.current_weight}kg, objetivo {health_data.target_weight}kg",
        "video_analysis": {
            "duration": "2:30",
            "quality": "HD 720p",
            "recommendations": "Plan personalizado basado en análisis visual y de voz",
            "status": "completado",
            "filename": filename
        }
    }
    
    print(f"✅ Análisis simulado completado")
    return analysis_result

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

def convert_ai_to_normal_plan(ai_plan: dict) -> MealPlan:
    """Convertir plan de IA a formato de plan normal"""
    meals = {}
    meal_details = {}
    
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
    
    cursor.execute("SELECT COUNT(*) as count FROM user_health_profile")
    health_profiles_count = cursor.fetchone()["count"]
    
    conn.close()
    
    return {
        "tables": [table[0] for table in tables],
        "normal_plans_count": normal_plans_count,
        "ai_plans_count": ai_plans_count,
        "health_profiles_count": health_profiles_count
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)