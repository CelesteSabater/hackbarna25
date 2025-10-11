class AIPlanner {
    constructor() {
        this.daysOfWeek = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
        this.mealTimes = ['desayuno', 'almuerzo', 'cena'];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadRecentPlans();
        this.setDefaultWeek();
    }

    setDefaultWeek() {
        // Establecer la semana actual por defecto
        const today = new Date();
        const year = today.getFullYear();
        const week = this.getWeekNumber(today);
        const weekInput = document.getElementById('week');
        if (weekInput) {
            weekInput.value = `${year}-W${week.toString().padStart(2, '0')}`;
        }
    }

    getWeekNumber(date) {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }

    setupEventListeners() {
        const form = document.getElementById('aiPlannerForm');
        if (form) {
            form.addEventListener('submit', (e) => this.generatePlan(e));
        }

        const saveButton = document.getElementById('saveAiPlan');
        if (saveButton) {
            saveButton.addEventListener('click', () => this.saveAIPlan());
        }

        const regenerateButton = document.getElementById('regeneratePlan');
        if (regenerateButton) {
            regenerateButton.addEventListener('click', () => this.regeneratePlan());
        }

        const modifyButton = document.getElementById('modifyPlan');
        if (modifyButton) {
            modifyButton.addEventListener('click', () => this.modifyPlan());
        }
    }

    async generatePlan(e) {
        e.preventDefault();
        
        const formData = this.collectFormData();
        if (!this.validateForm(formData)) {
            return;
        }

        this.showLoadingState();

        try {
            // Llamada real al backend
            const response = await fetch('/api/ai/generate-plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error del servidor');
            }

            const aiPlan = await response.json();
            
            this.hideLoadingState();
            this.displayAIPlan(aiPlan);
            this.saveToRecentPlans(aiPlan);
            
        } catch (error) {
            this.hideLoadingState();
            this.showError('Error generando el plan: ' + error.message);
        }
    }

    collectFormData() {
        return {
            dietType: document.getElementById('dietType').value,
            calorieTarget: document.getElementById('calorieTarget').value,
            allergies: Array.from(document.querySelectorAll('input[name="allergies"]:checked'))
                         .map(input => input.value),
            preferences: document.getElementById('preferences').value,
            goals: document.getElementById('goals').value,
            week: document.getElementById('week').value
        };
    }

    validateForm(data) {
        if (!data.week) {
            this.showError('Por favor, selecciona una semana');
            return false;
        }
        
        if (!data.preferences && !data.goals) {
            this.showError('Por favor, describe al menos tus preferencias o objetivos');
            return false;
        }
        
        return true;
    }

    showLoadingState() {
        document.getElementById('aiLoading').style.display = 'block';
        document.getElementById('aiResultSection').style.display = 'none';
    }

    hideLoadingState() {
        document.getElementById('aiLoading').style.display = 'none';
    }

    async simulateAIResponse(formData) {
        // Simular delay de IA (2-4 segundos)
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
        
        return this.generateMockPlan(formData);
    }

    generateMockPlan(formData) {
        const mealsPool = this.getMealsPool(formData);
        const plan = {
            week: formData.week,
            dietType: formData.dietType || 'equilibrada',
            calorieTarget: formData.calorieTarget || '1800-2200',
            generatedAt: new Date().toISOString(),
            meals: {}
        };

        this.daysOfWeek.forEach(day => {
            const dayKey = day.toLowerCase();
            plan.meals[dayKey] = {};
            
            this.mealTimes.forEach(mealTime => {
                const mealKey = mealTime.toLowerCase();
                const randomMeal = mealsPool[mealKey][Math.floor(Math.random() * mealsPool[mealKey].length)];
                plan.meals[dayKey][mealKey] = randomMeal;
            });
        });

        return plan;
    }

    getMealsPool(formData) {
        // Pool de comidas basado en las preferencias del usuario
        const baseMeals = {
            desayuno: [
                { name: "Yogur con granola y frutos rojos", calories: 320 },
                { name: "Tostadas integrales con aguacate y huevo", calories: 350 },
                { name: "Batido de proteínas con plátano y espinacas", calories: 280 },
                { name: "Avena con canela y manzana", calories: 300 },
                { name: "Tortilla de claras con verduras", calories: 250 }
            ],
            almuerzo: [
                { name: "Ensalada César con pollo a la plancha", calories: 420 },
                { name: "Salmón al horno con quinoa y espárragos", calories: 450 },
                { name: "Wrap de pavo con vegetales frescos", calories: 380 },
                { name: "Bowl de arroz integral con tofu y verduras", calories: 400 },
                { name: "Lentejas estofadas con verduras", calories: 350 }
            ],
            cena: [
                { name: "Crema de calabacín con picatostes", calories: 280 },
                { name: "Pescado blanco al vapor con patatas", calories: 320 },
                { name: "Ensalada de garbanzos y atún", calories: 300 },
                { name: "Tortilla de espinacas y champiñones", calories: 250 },
                { name: "Sopa de miso con tofu y algas", calories: 220 }
            ]
        };

        // Filtrar según tipo de dieta
        if (formData.dietType === 'vegetariana') {
            baseMeals.almuerzo = baseMeals.almuerzo.filter(meal => 
                !meal.name.includes('pollo') && !meal.name.includes('pavo') && !meal.name.includes('salmón') && !meal.name.includes('pescado') && !meal.name.includes('atún')
            );
            baseMeals.cena = baseMeals.cena.filter(meal => 
                !meal.name.includes('pescado') && !meal.name.includes('atún')
            );
        }

        if (formData.dietType === 'vegana') {
            baseMeals.desayuno = baseMeals.desayuno.filter(meal => 
                !meal.name.includes('yogur') && !meal.name.includes('huevo') && !meal.name.includes('claras')
            );
            baseMeals.almuerzo = baseMeals.almuerzo.filter(meal => 
                !meal.name.includes('pollo') && !meal.name.includes('pavo') && !meal.name.includes('salmón') && !meal.name.includes('pescado') && !meal.name.includes('atún')
            );
            baseMeals.cena = baseMeals.cena.filter(meal => 
                !meal.name.includes('pescado') && !meal.name.includes('atún') && !meal.name.includes('tortilla')
            );
        }

        return baseMeals;
    }

    displayAIPlan(plan) {
        const preview = document.getElementById('aiPlanPreview');
        let html = '';

        this.daysOfWeek.forEach(day => {
            const dayKey = day.toLowerCase();
            const dayMeals = plan.meals[dayKey];
            let dayTotalCalories = 0;
            let mealsHTML = '';

            this.mealTimes.forEach(mealTime => {
                const mealKey = mealTime.toLowerCase();
                const meal = dayMeals[mealKey];
                if (meal) {
                    dayTotalCalories += meal.calories;
                    mealsHTML += `
                        <div class="ai-meal">
                            <div class="ai-meal-name">
                                <strong>${mealTime}:</strong> ${meal.name}
                            </div>
                            <div class="ai-meal-calories">
                                ${meal.calories} kcal
                            </div>
                        </div>
                    `;
                }
            });

            html += `
                <div class="ai-day-plan">
                    <h4>
                        ${day}
                        <span class="ai-day-calories">${dayTotalCalories} kcal</span>
                    </h4>
                    ${mealsHTML}
                </div>
            `;
        });

        // Calcular total semanal
        const weeklyTotal = this.calculateWeeklyTotal(plan);
        html += `
            <div class="meal-calories-total">
                🔥 Total Semanal Estimado: <strong>${weeklyTotal} kcal</strong>
            </div>
        `;

        preview.innerHTML = html;
        
        // Guardar plan en data attribute para uso posterior
        preview.dataset.plan = JSON.stringify(plan);
        
        // Mostrar sección de resultados
        document.getElementById('aiResultSection').style.display = 'block';
        
        // Scroll a resultados
        document.getElementById('aiResultSection').scrollIntoView({ 
            behavior: 'smooth' 
        });
    }

    calculateWeeklyTotal(plan) {
        let total = 0;
        this.daysOfWeek.forEach(day => {
            const dayKey = day.toLowerCase();
            const dayMeals = plan.meals[dayKey];
            this.mealTimes.forEach(mealTime => {
                const mealKey = mealTime.toLowerCase();
                const meal = dayMeals[mealKey];
                if (meal) {
                    total += meal.calories;
                }
            });
        });
        return total;
    }

    async saveAIPlan() {
        const preview = document.getElementById('aiPlanPreview');
        const planData = preview.dataset.plan;
        
        if (!planData) {
            this.showError('No hay plan para guardar');
            return;
        }

        try {
            const plan = JSON.parse(planData);
            
            // Guardar en el backend
            const response = await fetch(`/api/ai/plans/${plan.id}/save-as-normal`, {
                method: 'POST'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error guardando el plan');
            }

            this.showSuccess('Plan guardado exitosamente. Redirigiendo al planeador principal...');
            
            // Redirigir al planeador principal después de 2 segundos
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            
        } catch (error) {
            this.showError('Error guardando el plan: ' + error.message);
        }
    }

    convertToCompatibleFormat(aiPlan) {
        const compatiblePlan = {
            week: aiPlan.week,
            meals: {},
            mealDetails: {},
            totalCalories: this.calculateWeeklyTotal(aiPlan)
        };

        this.daysOfWeek.forEach(day => {
            const dayKey = day.toLowerCase();
            compatiblePlan.meals[dayKey] = {};
            compatiblePlan.mealDetails[dayKey] = {};

            this.mealTimes.forEach(mealTime => {
                const mealKey = mealTime.toLowerCase();
                const meal = aiPlan.meals[dayKey][mealKey];
                
                compatiblePlan.meals[dayKey][mealKey] = meal.name;
                compatiblePlan.mealDetails[dayKey][mealKey] = {
                    name: meal.name,
                    calories: meal.calories
                };
            });
        });

        return compatiblePlan;
    }

    regeneratePlan() {
        const form = document.getElementById('aiPlannerForm');
        form.dispatchEvent(new Event('submit'));
    }

    modifyPlan() {
        // Redirigir al planeador principal con los datos del plan de IA
        const preview = document.getElementById('aiPlanPreview');
        const planData = preview.dataset.plan;
        
        if (planData) {
            localStorage.setItem('lastAIPlan', planData);
            window.location.href = '/';
        } else {
            this.showError('No hay plan para modificar');
        }
    }

    saveToRecentPlans(plan) {
        const recentPlans = this.getRecentPlans();
        recentPlans.unshift({
            ...plan,
            id: Date.now(),
            preview: this.generatePlanPreview(plan)
        });
        
        // Mantener solo los últimos 5 planes
        if (recentPlans.length > 5) {
            recentPlans.splice(5);
        }
        
        localStorage.setItem('recentAiPlans', JSON.stringify(recentPlans));
        this.loadRecentPlans();
    }

    getRecentPlans() {
        try {
            return JSON.parse(localStorage.getItem('recentAiPlans')) || [];
        } catch {
            return [];
        }
    }

    generatePlanPreview(plan) {
        const firstDay = this.daysOfWeek[0].toLowerCase();
        const meals = plan.meals[firstDay];
        return Object.values(meals).map(meal => meal.name).join(', ');
    }

    async loadRecentPlans() {
        try {
            const response = await fetch('/api/ai/plans?limit=5');
            
            if (response.ok) {
                const data = await response.json();
                this.displayRecentPlans(data.plans);
            } else {
                // Fallback a localStorage si el backend falla
                this.loadRecentPlansFromLocal();
            }
        } catch (error) {
            console.error('Error loading recent plans:', error);
            this.loadRecentPlansFromLocal();
        }
    }

    displayRecentPlans(plans) {
        const container = document.getElementById('recentAiPlans');
        
        if (plans.length === 0) {
            container.innerHTML = '<p class="no-plans">No hay planes generados recientemente</p>';
            return;
        }

        container.innerHTML = plans.map(plan => `
            <div class="recent-plan-card">
                <h4>Semana: ${plan.week}</h4>
                <div class="recent-plan-meta">
                    Dieta: ${plan.dietType || 'Equilibrada'} | 
                    ${new Date(plan.generatedAt).toLocaleDateString()}
                </div>
                <p><strong>Total calorías:</strong> ${plan.totalCalories} kcal</p>
                <div class="recent-plan-actions">
                    <button onclick="aiPlanner.loadRecentPlan('${plan.id}')" class="btn-edit">
                        Cargar
                    </button>
                </div>
            </div>
        `).join('');
    }

    async loadRecentPlan(planId) {
        try {
            const response = await fetch(`/api/ai/plans/${planId}`);
            
            if (!response.ok) {
                throw new Error('Plan no encontrado');
            }

            const plan = await response.json();
            this.displayAIPlan(plan);
            document.getElementById('aiResultSection').scrollIntoView({ 
                behavior: 'smooth' 
            });
        } catch (error) {
            this.showError('Error cargando el plan: ' + error.message);
        }
    }

    showError(message) {
        alert('❌ ' + message);
    }

    showSuccess(message) {
        alert('✅ ' + message);
    }
}

// Inicializar la aplicación
let aiPlanner;

document.addEventListener('DOMContentLoaded', () => {
    aiPlanner = new AIPlanner();
});