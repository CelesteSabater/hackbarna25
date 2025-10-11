class MealPlanner {
    constructor() {
        this.daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        this.mealTimes = ['Desayuno', 'Almuerzo', 'Cena'];
        
        // Configuración mejorada de la API
        this.apiUrl = this.getApiUrl();
        this.mealSuggestions = [];
        this.caloriesData = {};
        this.init();
    }

    async init() {
        // Primero generar la estructura HTML
        this.generateDaysList();
        
        // Luego cargar datos y configurar event listeners
        await this.loadSavedPlans();
        this.setupEventListeners();
        await this.loadMealSuggestions();
        this.initializeCaloriesData();
        this.updateCaloriesSummary();
        
        console.log('✅ Meal Planner inicializado correctamente');
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

    async reloadPlans() {
        try {
            const isHealthy = await this.checkBackendHealth();
            if (!isHealthy) {
                alert('❌ No se puede conectar con el servidor. Verifica que esté ejecutándose.');
                return;
            }
            
            await this.loadSavedPlans();
            alert('✅ Planes recargados correctamente');
        } catch (error) {
            console.error('Error reloading plans:', error);
            alert('❌ Error al recargar los planes');
        }
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

            console.log('Planes cargados desde DB:', data);

            if (data.plans && data.plans.length > 0) {
                // Ordenar por fecha de creación (más reciente primero)
                data.plans.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                
                data.plans.forEach(plan => {
                    this.displaySavedPlan(plan);
                });
            } else {
                savedPlansContainer.innerHTML = `
                    <div class="no-plans">
                        <p>No hay planes guardados aún.</p>
                        <p><small>Crea tu primer plan de comidas arriba ↑</small></p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading plans:', error);
            document.getElementById('savedPlans').innerHTML = `
                <div class="error-message">
                    <p>Error al cargar los planes. Verifica que el servidor esté funcionando.</p>
                </div>
            `;
        }
    }

    getApiUrl() {
        // Intentar diferentes URLs para la API
        const possibleUrls = [
            'http://localhost:8000/api',
            'http://127.0.0.1:8000/api',
            '/api'  // Fallback a rutas relativas
        ];
        
        // Para debug, mostrar qué URL se está usando
        console.log('API URLs disponibles:', possibleUrls);
        return possibleUrls[0]; // Usar la primera por defecto
    }

    displaySavedPlan(plan) {
        const savedPlansContainer = document.getElementById('savedPlans');
        
        const planCard = document.createElement('div');
        planCard.className = 'plan-card';
        planCard.id = `plan-${plan.week}`;
        
        let mealsHTML = '';
        let planTotalCalories = 0;

        this.daysOfWeek.forEach(day => {
            const dayKey = day.toLowerCase();
            let dayTotalCalories = 0;
            let dayMealsHTML = '';

            if (plan.mealDetails && plan.mealDetails[dayKey]) {
                this.mealTimes.forEach(mealTime => {
                    const mealKey = mealTime.toLowerCase();
                    const mealData = plan.mealDetails[dayKey][mealKey];
                    
                    if (mealData && mealData.name && mealData.name.trim() !== '') {
                        const calories = mealData.calories || 0;
                        dayTotalCalories += calories;
                        dayMealsHTML += `
                            <li>
                                <span class="meal-name"><strong>${mealTime}:</strong> ${mealData.name}</span>
                                <span class="plan-calories">${calories} kcal</span>
                            </li>
                        `;
                    }
                });
            }

            if (dayMealsHTML) {
                planTotalCalories += dayTotalCalories;
                mealsHTML += `
                    <div class="day-plan">
                        <h4>${day} - Total del día: ${dayTotalCalories} kcal</h4>
                        <ul class="plan-meals">${dayMealsHTML}</ul>
                    </div>
                `;
            }
        });

        const totalCaloriesToShow = plan.totalCalories > 0 ? plan.totalCalories : planTotalCalories;
        const updatedAt = plan.updated_at ? new Date(plan.updated_at).toLocaleDateString() : null;

        planCard.innerHTML = `
            <div class="plan-header">
                <h3>📅 Semana: ${plan.week}</h3>
                <div class="plan-meta">
                    <small>Creado: ${new Date(plan.created_at).toLocaleDateString('es-ES')}</small>
                    ${updatedAt ? `<small>Actualizado: ${updatedAt}</small>` : ''}
                </div>
            </div>
            <div class="plan-content">
                ${mealsHTML || '<p class="no-meals">No hay comidas planificadas para esta semana.</p>'}
            </div>
            <div class="meal-calories-total">
                🔥 Total Semanal: <strong>${totalCaloriesToShow} kcal</strong>
            </div>
            <div class="plan-actions">
                <button onclick="mealPlanner.editPlan('${plan.week}')" class="btn-edit">
                    ✏️ Editar Plan
                </button>
                <button onclick="mealPlanner.deletePlan('${plan.week}')" class="btn-danger">
                    🗑️ Eliminar
                </button>
            </div>
        `;
        
        savedPlansContainer.appendChild(planCard);
    }

    async reloadCurrentPlan(week) {
        try {
            console.log(`Recargando plan actual: ${week}`);
            
            // Cargar el plan actualizado desde la base de datos
            const response = await fetch(`${this.apiUrl}/plans/${week}`);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status} al cargar el plan actualizado`);
            }
            
            const updatedPlan = await response.json();
            console.log('Plan actualizado desde DB:', updatedPlan);
            
            // Volver a llenar el formulario con los datos actualizados
            this.fillFormWithPlan(updatedPlan);
            
            // Recargar la lista de planes guardados
            await this.loadSavedPlans();
            
            // Mantener el modo edición activo
            this.showEditMessage(week);
            
        } catch (error) {
            console.error('Error recargando plan actual:', error);
            alert('✅ Plan actualizado, pero hubo un error al recargar los datos: ' + error.message);
        }
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

        const submitButton = document.querySelector('#mealPlanForm button[type="submit"]');
        const isEditing = submitButton.dataset.editingWeek;
        
        try {
            let response;
            if (isEditing) {
                // Si estamos editando, usar PUT
                response = await fetch(`${this.apiUrl}/plans/${week}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(mealPlan)
                });
            } else {
                // Si es nuevo, usar POST
                response = await fetch(`${this.apiUrl}/plans`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(mealPlan)
                });
            }

            const result = await response.json();
            
            if (response.ok) {
                const message = isEditing ? '✅ Plan actualizado correctamente!' : '✅ Plan guardado correctamente!';
                alert(message);
                
                if (isEditing) {
                    // Después de actualizar, recargar el plan desde la base de datos
                    await this.reloadCurrentPlan(week);
                } else {
                    // Para planes nuevos, limpiar el formulario
                    await this.loadSavedPlans();
                    this.resetForm();
                    this.cancelEdit();
                }
            } else {
                alert('❌ ' + (result.error || 'Error al guardar el plan'));
            }
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Error al conectar con el servidor');
        }
    }

    resetForm() {
        // Solo resetear si NO estamos en modo edición
        const submitButton = document.querySelector('#mealPlanForm button[type="submit"]');
        const isEditing = submitButton.dataset.editingWeek;
        
        if (!isEditing) {
            document.getElementById('mealPlanForm').reset();
            document.querySelectorAll('.meal-name').forEach(input => input.value = '');
            document.querySelectorAll('.calories-input').forEach(input => input.value = '');
            
            // Resetear datos internos
            this.initializeCaloriesData();
            this.updateCaloriesSummary();
            this.resetCaloriesDisplays();
        }
    }

    async checkBackendHealth() {
        const healthUrls = [
            'http://localhost:8000/api/health',
            'http://127.0.0.1:8000/api/health',
            '/api/health'
        ];
        
        for (const url of healthUrls) {
            try {
                console.log(`Probando conexión con: ${url}`);
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                    mode: 'cors'  // Forzar modo CORS
                });
                
                if (response.ok) {
                    const health = await response.json();
                    console.log(`✅ Backend saludable en: ${url}`, health);
                    // Actualizar la URL base si esta funciona
                    this.apiUrl = url.replace('/health', '');
                    return true;
                }
            } catch (error) {
                console.log(`❌ No se pudo conectar a ${url}:`, error.message);
                continue;
            }
        }
        
        console.error('❌ No se pudo conectar a ningún backend');
        return false;
    }

    async deletePlan(week) {
        if (confirm(`¿Estás seguro de que quieres eliminar el plan de la semana ${week}?`)) {
            try {
                const response = await fetch(`${this.apiUrl}/plans/${week}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    alert('✅ Plan eliminado correctamente');
                    // Remover el plan del DOM
                    const planElement = document.getElementById(`plan-${week}`);
                    if (planElement) {
                        planElement.remove();
                    }
                    // Recargar la lista por si acaso
                    await this.loadSavedPlans();
                } else {
                    const error = await response.json();
                    alert('❌ ' + (error.error || 'Error al eliminar el plan'));
                }
            } catch (error) {
                console.error('Error:', error);
                alert('❌ Error al conectar con el servidor');
            }
        }
    }

    async editPlan(week) {
        // Primero verificar que el backend esté funcionando
        const isHealthy = await this.checkBackendHealth();
        if (!isHealthy) {
            alert('❌ El servidor backend no está disponible. Por favor, verifica que el servidor Python esté ejecutándose en el puerto 8000.');
            return;
        }

        try {
            console.log(`Intentando cargar plan para editar: ${week}`);
            
            const response = await fetch(`${this.apiUrl}/plans/${week}`);
            
            if (!response.ok) {
                // Si la respuesta no es exitosa, obtener el mensaje de error
                const errorText = await response.text();
                console.error('Error response:', errorText);
                
                if (response.status === 404) {
                    throw new Error(`No se encontró un plan para la semana ${week}`);
                } else {
                    throw new Error(`Error del servidor: ${response.status} - ${errorText.substring(0, 100)}`);
                }
            }
            
            const plan = await response.json();
            console.log('Plan cargado exitosamente:', plan);
            
            // Llenar el formulario con los datos del plan
            this.fillFormWithPlan(plan);
            
            // Scroll hasta el formulario
            document.querySelector('.meal-plan-form').scrollIntoView({ 
                behavior: 'smooth' 
            });
            
        } catch (error) {
            console.error('Error loading plan for editing:', error);
            alert('❌ Error al cargar el plan para editar: ' + error.message);
        }
    }

    fillFormWithPlan(plan) {
        console.log('Llenando formulario con plan:', plan);
        
        // Pequeño delay para asegurar que el DOM esté listo
        setTimeout(() => {
            // Establecer la semana
            const weekInput = document.getElementById('week');
            if (weekInput) {
                weekInput.value = plan.week;
            }
            
            // Resetear datos de calorías primero
            this.initializeCaloriesData();
            
            let hasData = false;
            
            // Llenar los datos de comidas y calorías
            this.daysOfWeek.forEach(day => {
                const dayKey = day.toLowerCase();
                
                this.mealTimes.forEach(mealTime => {
                    const mealKey = mealTime.toLowerCase();
                    const nameInput = document.querySelector(
                        `input.meal-name[data-day="${dayKey}"][data-meal="${mealKey}"]`
                    );
                    const caloriesInput = document.querySelector(
                        `input.calories-input[data-day="${dayKey}"][data-meal="${mealKey}"]`
                    );
                    
                    let mealName = '';
                    let mealCalories = 0;
                    
                    // Buscar datos en mealDetails (estructura nueva)
                    if (plan.mealDetails && plan.mealDetails[dayKey] && plan.mealDetails[dayKey][mealKey]) {
                        const mealData = plan.mealDetails[dayKey][mealKey];
                        mealName = mealData.name || '';
                        mealCalories = mealData.calories || 0;
                        hasData = true;
                    } 
                    // Fallback a la estructura antigua de meals
                    else if (plan.meals && plan.meals[dayKey] && plan.meals[dayKey][mealKey]) {
                        mealName = plan.meals[dayKey][mealKey] || '';
                        hasData = true;
                    }
                    
                    // Actualizar inputs
                    if (nameInput) {
                        nameInput.value = mealName;
                    }
                    if (caloriesInput) {
                        caloriesInput.value = mealCalories;
                        this.updateMealCalories(dayKey, mealKey, mealCalories);
                    }
                });
            });
            
            // Actualizar el resumen de calorías
            this.updateCaloriesSummary();
            
            // Mostrar mensaje de edición
            this.showEditMessage(plan.week);
            
            console.log('Formulario llenado exitosamente. Datos encontrados:', hasData);
            
        }, 100);
    }

    async reloadFromDatabase(week) {
        try {
            console.log(`Recargando manualmente plan: ${week}`);
            
            const response = await fetch(`${this.apiUrl}/plans/${week}`);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status} al cargar el plan`);
            }
            
            const plan = await response.json();
            
            // Volver a llenar el formulario
            this.fillFormWithPlan(plan);
            
            alert('✅ Plan recargado desde la base de datos');
            
        } catch (error) {
            console.error('Error recargando desde BD:', error);
            alert('❌ Error al recargar el plan: ' + error.message);
        }
    }

    showEditMessage(week) {
        // Primero, limpiar cualquier mensaje existente
        const existingMessage = document.getElementById('edit-message');
        if (existingMessage && existingMessage.parentNode) {
            existingMessage.remove();
        }
        
        // Crear nuevo mensaje
        const editMessage = document.createElement('div');
        editMessage.id = 'edit-message';
        editMessage.className = 'edit-message';
        
        editMessage.innerHTML = `
            <div class="edit-alert">
                <strong>✏️ Editando plan de la semana ${week}</strong>
                <p>Modifica las comidas y calorías que necesites y haz clic en "Actualizar Plan"</p>
                <div class="edit-actions">
                    <button onclick="mealPlanner.reloadFromDatabase('${week}')" class="btn-reload">
                        🔄 Recargar desde BD
                    </button>
                    <button onclick="mealPlanner.cancelEdit()" class="btn-cancel">
                        ❌ Cancelar edición
                    </button>
                </div>
            </div>
        `;
        
        // Insertar el mensaje en el formulario
        const form = document.querySelector('.meal-plan-form');
        const firstFormGroup = form.querySelector('.form-group');
        if (firstFormGroup && firstFormGroup.parentNode) {
            form.insertBefore(editMessage, firstFormGroup.nextSibling);
        } else {
            form.appendChild(editMessage);
        }
        
        // Añadir clase visual al formulario
        form.classList.add('form-editing');
        
        // Actualizar el botón de submit
        const submitButton = document.querySelector('#mealPlanForm button[type="submit"]');
        if (submitButton) {
            if (!submitButton.dataset.originalText) {
                submitButton.dataset.originalText = submitButton.textContent;
            }
            submitButton.textContent = '💾 Actualizar Plan';
            submitButton.dataset.editingWeek = week;
        }
    }

    cancelEdit() {
        // Limpiar mensaje de edición
        const editMessage = document.getElementById('edit-message');
        if (editMessage && editMessage.parentNode) {
            editMessage.remove();
        }
        
        // Remover clase de edición del formulario
        const form = document.querySelector('.meal-plan-form');
        if (form) {
            form.classList.remove('form-editing');
        }
        
        // Restaurar texto del botón
        const submitButton = document.querySelector('#mealPlanForm button[type="submit"]');
        if (submitButton && submitButton.dataset.originalText) {
            submitButton.textContent = submitButton.dataset.originalText;
            delete submitButton.dataset.originalText;
            delete submitButton.dataset.editingWeek;
        }
        
        // Limpiar el formulario completamente
        document.getElementById('mealPlanForm').reset();
        document.querySelectorAll('.meal-name').forEach(input => input.value = '');
        document.querySelectorAll('.calories-input').forEach(input => input.value = '');
        
        // Resetear datos internos
        this.initializeCaloriesData();
        this.updateCaloriesSummary();
        this.resetCaloriesDisplays();
    }
}

let mealPlanner;

document.addEventListener('DOMContentLoaded', () => {
    mealPlanner = new MealPlanner();
});