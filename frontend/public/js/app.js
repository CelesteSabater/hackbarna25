class MealPlanner {
    constructor() {
        this.daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        this.mealTimes = ['Desayuno', 'Almuerzo', 'Cena'];
        this.apiUrl = '/api';
        this.mealSuggestions = [];
        this.caloriesData = {};
        this.init();
    }

    async init() {
        this.generateDaysList();
        await this.loadSavedPlans();
        this.setupEventListeners();
        await this.loadMealSuggestions();
        this.initializeCaloriesData();
        this.updateCaloriesSummary();
    }

    initializeCaloriesData() {
        this.daysOfWeek.forEach(day => {
            const dayKey = day.toLowerCase();
            this.caloriesData[dayKey] = {};
            this.mealTimes.forEach(mealTime => {
                const mealKey = mealTime.toLowerCase();
                this.caloriesData[dayKey][mealKey] = 0;
            });
        });
    }

    generateDaysList() {
        const container = document.getElementById('daysList');
        container.innerHTML = '';
        
        this.daysOfWeek.forEach(day => {
            const dayItem = this.createDayItem(day);
            container.appendChild(dayItem);
        });
    }

    createDayItem(day) {
        const dayItem = document.createElement('div');
        dayItem.className = 'day-item';
        const dayKey = day.toLowerCase();
        
        dayItem.innerHTML = `
            <div class="day-header" data-day="${dayKey}">
                <h3>${day}</h3>
                <div class="day-calories" id="calories-${dayKey}">0 kcal</div>
            </div>
            <div class="day-content" id="content-${dayKey}">
                ${this.mealTimes.map(mealTime => this.createMealTimeHTML(day, mealTime)).join('')}
            </div>
        `;
        
        return dayItem;
    }

    createMealTimeHTML(day, mealTime) {
        const dayKey = day.toLowerCase();
        const mealKey = mealTime.toLowerCase();
        
        return `
            <div class="meal-time">
                <label>${mealTime}:</label>
                <div class="meal-input-group">
                    <input type="text" 
                           placeholder="Ej: ${this.getMealSuggestion(mealTime)}" 
                           data-day="${dayKey}" 
                           data-meal="${mealKey}"
                           class="meal-name">
                    <input type="number" 
                           placeholder="Calorías" 
                           min="0" 
                           max="5000"
                           data-day="${dayKey}" 
                           data-meal="${mealKey}"
                           class="calories-input">
                    <div class="calories-display" id="display-${dayKey}-${mealKey}">0 kcal</div>
                    <button type="button" class="btn-suggestion" 
                            data-day="${dayKey}" 
                            data-meal="${mealKey}">
                        💡 Sugerencia
                    </button>
                </div>
            </div>
        `;
    }

    getMealSuggestion(mealTime) {
        const suggestions = {
            'Desayuno': 'Huevos revueltos con tostadas',
            'Almuerzo': 'Pollo a la plancha con ensalada',
            'Cena': 'Sopa de verduras'
        };
        return suggestions[mealTime] || 'Comida saludable';
    }

    setupEventListeners() {
        const form = document.getElementById('mealPlanForm');
        form.addEventListener('submit', (e) => this.saveMealPlan(e));

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('day-header') || 
                e.target.closest('.day-header')) {
                const header = e.target.classList.contains('day-header') ? 
                    e.target : e.target.closest('.day-header');
                this.toggleDayContent(header);
            }
            
            if (e.target.classList.contains('btn-suggestion')) {
                this.getRandomSuggestion(e.target);
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('calories-input')) {
                this.updateMealCalories(
                    e.target.dataset.day,
                    e.target.dataset.meal,
                    parseInt(e.target.value) || 0
                );
            }
        });
    }

    toggleDayContent(header) {
        const dayKey = header.dataset.day;
        const content = document.getElementById(`content-${dayKey}`);
        const isExpanded = content.classList.contains('expanded');
        
        document.querySelectorAll('.day-content.expanded').forEach(item => {
            if (item.id !== `content-${dayKey}`) {
                item.classList.remove('expanded');
                item.previousElementSibling.classList.remove('expanded');
            }
        });
        
        if (!isExpanded) {
            content.classList.add('expanded');
            header.classList.add('expanded');
        } else {
            content.classList.remove('expanded');
            header.classList.remove('expanded');
        }
    }

    updateMealCalories(day, meal, calories) {
        this.caloriesData[day][meal] = calories;
        this.updateDayCalories(day);
        this.updateCaloriesSummary();
        
        const display = document.getElementById(`display-${day}-${meal}`);
        if (display) {
            display.textContent = `${calories} kcal`;
        }
    }

    updateDayCalories(day) {
        const dayCalories = Object.values(this.caloriesData[day]).reduce((sum, cal) => sum + cal, 0);
        const dayDisplay = document.getElementById(`calories-${day}`);
        if (dayDisplay) {
            dayDisplay.textContent = `${dayCalories} kcal`;
        }
    }

    updateCaloriesSummary() {
        const weeklyTotal = this.calculateWeeklyTotal();
        const dailyAverage = Math.round(weeklyTotal / 7);
        
        document.getElementById('weeklyTotal').textContent = weeklyTotal;
        document.getElementById('dailyAverage').textContent = dailyAverage;
    }

    calculateWeeklyTotal() {
        return Object.values(this.caloriesData).reduce((weekTotal, dayData) => {
            const dayTotal = Object.values(dayData).reduce((daySum, cal) => daySum + cal, 0);
            return weekTotal + dayTotal;
        }, 0);
    }

    async loadMealSuggestions() {
        try {
            const response = await fetch(`${this.apiUrl}/meals/suggestions`);
            const data = await response.json();
            this.mealSuggestions = data.suggestions || [];
        } catch (error) {
            console.error('Error loading suggestions:', error);
            this.mealSuggestions = [
                "Pollo a la plancha con verduras (350 kcal)",
                "Salmón al horno con espárragos (400 kcal)", 
                "Ensalada César con pollo (320 kcal)"
            ];
        }
    }

    async getRandomSuggestion(button) {
        if (!this.mealSuggestions || this.mealSuggestions.length === 0) {
            await this.loadMealSuggestions();
        }

        const randomSuggestion = this.mealSuggestions[
            Math.floor(Math.random() * this.mealSuggestions.length)
        ];

        const day = button.dataset.day;
        const meal = button.dataset.meal;
        
        const match = randomSuggestion.match(/(.+?)\s*\((\d+)\s*kcal\)/);
        let mealName = randomSuggestion;
        let calories = 300;

        if (match) {
            mealName = match[1].trim();
            calories = parseInt(match[2]);
        }

        const nameInput = document.querySelector(
            `input.meal-name[data-day="${day}"][data-meal="${meal}"]`
        );
        const caloriesInput = document.querySelector(
            `input.calories-input[data-day="${day}"][data-meal="${meal}"]`
        );
        
        if (nameInput) nameInput.value = mealName;
        if (caloriesInput) {
            caloriesInput.value = calories;
            this.updateMealCalories(day, meal, calories);
        }
    }

    collectMealData() {
        const meals = {};
        const mealDetails = {};
        
        this.daysOfWeek.forEach(day => {
            const dayKey = day.toLowerCase();
            meals[dayKey] = {};
            mealDetails[dayKey] = {};
            
            this.mealTimes.forEach(mealTime => {
                const mealKey = mealTime.toLowerCase();
                const nameInput = document.querySelector(
                    `input.meal-name[data-day="${dayKey}"][data-meal="${mealKey}"]`
                );
                const caloriesInput = document.querySelector(
                    `input.calories-input[data-day="${dayKey}"][data-meal="${mealKey}"]`
                );
                
                const mealName = nameInput?.value || '';
                const mealCalories = parseInt(caloriesInput?.value) || 0;
                
                meals[dayKey][mealKey] = mealName;
                mealDetails[dayKey][mealKey] = {
                    name: mealName,
                    calories: mealCalories
                };
            });
        });
        
        return {
            meals: meals,
            mealDetails: mealDetails,
            totalCalories: this.calculateWeeklyTotal()
        };
    }

    async saveMealPlan(e) {
        e.preventDefault();
        
        const week = document.getElementById('week').value;
        if (!week) {
            alert('Por favor, selecciona una semana');
            return;
        }

        const planData = this.collectMealData();
        const mealPlan = {
            week: week,
            ...planData
        };

        try {
            const response = await fetch(`${this.apiUrl}/plans`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(mealPlan)
            });

            const result = await response.json();
            
            if (response.ok) {
                alert('Plan guardado correctamente!');
                await this.loadSavedPlans();
                document.getElementById('mealPlanForm').reset();
                this.initializeCaloriesData();
                this.updateCaloriesSummary();
                this.resetCaloriesDisplays();
            } else {
                alert(result.error || 'Error al guardar el plan');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al conectar con el servidor');
        }
    }

    resetCaloriesDisplays() {
        this.daysOfWeek.forEach(day => {
            const dayKey = day.toLowerCase();
            const dayDisplay = document.getElementById(`calories-${dayKey}`);
            if (dayDisplay) dayDisplay.textContent = '0 kcal';
            
            this.mealTimes.forEach(mealTime => {
                const mealKey = mealTime.toLowerCase();
                const mealDisplay = document.getElementById(`display-${dayKey}-${mealKey}`);
                if (mealDisplay) mealDisplay.textContent = '0 kcal';
            });
        });
    }

    async loadSavedPlans() {
        try {
            const response = await fetch(`${this.apiUrl}/plans`);
            const data = await response.json();
            
            const savedPlansContainer = document.getElementById('savedPlans');
            savedPlansContainer.innerHTML = '';

            console.log('Planes cargados:', data); // Para debug

            if (data.plans && data.plans.length > 0) {
                data.plans.forEach(plan => {
                    this.displaySavedPlan(plan);
                });
            } else {
                savedPlansContainer.innerHTML = '<p>No hay planes guardados aún.</p>';
            }
        } catch (error) {
            console.error('Error loading plans:', error);
            document.getElementById('savedPlans').innerHTML = 
                '<p>Error al cargar los planes.</p>';
        }
    }

    displaySavedPlan(plan) {
        const savedPlansContainer = document.getElementById('savedPlans');
        
        const planCard = document.createElement('div');
        planCard.className = 'plan-card';
        
        let mealsHTML = '';
        let planTotalCalories = 0;

        console.log('Mostrando plan:', plan); // Para debug

        this.daysOfWeek.forEach(day => {
            const dayKey = day.toLowerCase();
            let dayTotalCalories = 0;
            let dayMealsHTML = '';

            // PRIMERO: Intentar con mealDetails (estructura nueva)
            if (plan.mealDetails && plan.mealDetails[dayKey]) {
                console.log(`Usando mealDetails para ${day}:`, plan.mealDetails[dayKey]);
                
                this.mealTimes.forEach(mealTime => {
                    const mealKey = mealTime.toLowerCase();
                    const mealData = plan.mealDetails[dayKey][mealKey];
                    
                    if (mealData && mealData.name && mealData.name.trim() !== '') {
                        const calories = mealData.calories || 0;
                        dayTotalCalories += calories;
                        dayMealsHTML += `
                            <li>
                                <span><strong>${mealTime}:</strong> ${mealData.name}</span>
                                <span class="plan-calories">${calories} kcal</span>
                            </li>
                        `;
                    }
                });
            } 
            // SEGUNDO: Intentar con meals (estructura antigua)
            else if (plan.meals && plan.meals[dayKey]) {
                console.log(`Usando meals para ${day}:`, plan.meals[dayKey]);
                
                this.mealTimes.forEach(mealTime => {
                    const mealKey = mealTime.toLowerCase();
                    const mealName = plan.meals[dayKey][mealKey];
                    
                    if (mealName && mealName.trim() !== '') {
                        dayMealsHTML += `
                            <li>
                                <span><strong>${mealTime}:</strong> ${mealName}</span>
                                <span class="plan-calories">-- kcal</span>
                            </li>
                        `;
                    }
                });
            }

            if (dayMealsHTML) {
                planTotalCalories += dayTotalCalories;
                mealsHTML += `
                    <div class="day-plan">
                        <h4>${day} - Total: ${dayTotalCalories} kcal</h4>
                        <ul class="plan-meals">${dayMealsHTML}</ul>
                    </div>
                `;
            }
        });

        // Usar totalCalories del plan si está disponible, si no calcularlo
        const totalCaloriesToShow = plan.totalCalories > 0 ? plan.totalCalories : planTotalCalories;

        planCard.innerHTML = `
            <div class="plan-header">
                <h3>Semana: ${plan.week}</h3>
                <small>Creado: ${new Date(plan.created_at).toLocaleDateString()}</small>
            </div>
            <div class="plan-content">
                ${mealsHTML || '<p>No hay comidas planificadas para esta semana.</p>'}
            </div>
            <div class="meal-calories-total">
                Total Semanal: ${totalCaloriesToShow} kcal
            </div>
            <div class="plan-actions">
                <button onclick="mealPlanner.deletePlan('${plan.week}')" class="btn-danger">
                    Eliminar Plan
                </button>
            </div>
        `;
        
        savedPlansContainer.appendChild(planCard);
    }

    async deletePlan(week) {
        if (confirm('¿Estás seguro de que quieres eliminar este plan?')) {
            try {
                const response = await fetch(`${this.apiUrl}/plans/${week}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    alert('Plan eliminado correctamente');
                    await this.loadSavedPlans();
                } else {
                    const error = await response.json();
                    alert(error.error || 'Error al eliminar el plan');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error al conectar con el servidor');
            }
        }
    }
}

let mealPlanner;

document.addEventListener('DOMContentLoaded', () => {
    mealPlanner = new MealPlanner();
});