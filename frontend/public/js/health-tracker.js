class HealthTracker {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadHealthProfile();
        this.loadCheckinsHistory();
        this.setDefaultDate();
    }

    setupEventListeners() {
        const healthForm = document.getElementById('healthProfileForm');
        if (healthForm) {
            healthForm.addEventListener('submit', (e) => this.saveHealthProfile(e));
        }

        const checkinForm = document.getElementById('weightCheckinForm');
        if (checkinForm) {
            checkinForm.addEventListener('submit', (e) => this.addWeightCheckin(e));
        }
    }

    setDefaultDate() {
        const dateInput = document.getElementById('checkinDate');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }
    }

    async loadHealthProfile() {
        try {
            const response = await fetch('/api/health/profile');
            if (response.ok) {
                const profile = await response.json();
                this.fillHealthForm(profile);
            }
        } catch (error) {
            console.error('Error loading health profile:', error);
        }
    }

    fillHealthForm(profile) {
        if (profile.current_weight) {
            document.getElementById('currentWeight').value = profile.current_weight;
            document.getElementById('targetWeight').value = profile.target_weight;
            document.getElementById('height').value = profile.height;
            document.getElementById('age').value = profile.age;
            document.getElementById('gender').value = profile.gender;
            document.getElementById('activityLevel').value = profile.activity_level;
            
            // Llenar checkboxes de condiciones de salud
            if (profile.health_conditions) {
                profile.health_conditions.forEach(condition => {
                    const checkbox = document.querySelector(`input[name="healthConditions"][value="${condition}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                });
            }
            
            // Actualizar el campo de check-in con el peso actual
            document.getElementById('checkinWeight').value = profile.current_weight;
        }
    }

    async saveHealthProfile(e) {
        e.preventDefault();
        
        const formData = {
            current_weight: parseFloat(document.getElementById('currentWeight').value),
            target_weight: parseFloat(document.getElementById('targetWeight').value),
            height: parseFloat(document.getElementById('height').value),
            age: parseInt(document.getElementById('age').value),
            gender: document.getElementById('gender').value,
            activity_level: document.getElementById('activityLevel').value,
            health_conditions: Array.from(document.querySelectorAll('input[name="healthConditions"]:checked'))
                                 .map(input => input.value)
        };

        try {
            const response = await fetch('/api/health/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                alert('✅ Perfil de salud guardado correctamente');
                // Actualizar el campo de check-in
                document.getElementById('checkinWeight').value = formData.current_weight;
            } else {
                const error = await response.json();
                alert('❌ Error: ' + error.detail);
            }
        } catch (error) {
            console.error('Error saving health profile:', error);
            alert('❌ Error al guardar el perfil de salud');
        }
    }

    async addWeightCheckin(e) {
        e.preventDefault();
        
        const checkinData = {
            weight: parseFloat(document.getElementById('checkinWeight').value),
            date: document.getElementById('checkinDate').value,
            notes: document.getElementById('checkinNotes').value
        };

        try {
            const response = await fetch('/api/health/checkin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(checkinData)
            });

            if (response.ok) {
                alert('✅ Check-in registrado correctamente');
                document.getElementById('weightCheckinForm').reset();
                this.setDefaultDate();
                this.loadCheckinsHistory();
                this.loadHealthProfile(); // Recargar perfil para actualizar peso actual
            } else {
                const error = await response.json();
                alert('❌ Error: ' + error.detail);
            }
        } catch (error) {
            console.error('Error adding checkin:', error);
            alert('❌ Error al registrar el check-in');
        }
    }

    async loadCheckinsHistory() {
        try {
            const response = await fetch('/api/health/checkins?limit=30');
            if (response.ok) {
                const data = await response.json();
                this.displayCheckinsHistory(data.checkins);
            }
        } catch (error) {
            console.error('Error loading checkins history:', error);
        }
    }

    displayCheckinsHistory(checkins) {
        const container = document.getElementById('checkinsHistory');
        
        if (checkins.length === 0) {
            container.innerHTML = '<p class="no-data">No hay check-ins registrados aún.</p>';
            return;
        }

        container.innerHTML = checkins.map(checkin => `
            <div class="checkin-item">
                <div class="checkin-date">${new Date(checkin.date).toLocaleDateString('es-ES')}</div>
                <div class="checkin-weight">${checkin.weight} kg</div>
                ${checkin.notes ? `<div class="checkin-notes">${checkin.notes}</div>` : ''}
            </div>
        `).join('');
    }
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    new HealthTracker();
});