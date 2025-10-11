class AIPlanner {
    constructor() {
        this.daysOfWeek = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
        this.mealTimes = ['desayuno', 'almuerzo', 'cena'];
        this.mediaRecorder = null;
        this.videoChunks = [];
        this.isRecording = false;
        this.recordingTimer = null;
        this.recordingStartTime = null;
        this.videoStream = null;
        this.analysisVideoPlayer = null;

        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.muteBtn = document.getElementById('muteBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.downloadVideoBtn = document.getElementById('downloadVideoBtn');
        this.useTestVideoBtn = document.getElementById('useTestVideo');
        
        this.init();
    }

    init() {
        console.log("🔄 Inicializando AIPlanner...");
        
        this.debugElements();
        
        this.setupRecording();
        this.setupVideoAnalysis();
        this.setupEventListeners();
        this.loadRecentPlans();
        this.setDefaultWeek();
        this.loadHealthProfile();
    }

    debugElements() {
        const elements = {
            mainCameraBtn: document.getElementById('mainCameraBtn'),
            stopRecordingBtn: document.getElementById('stopRecording'),
            recordingContainer: document.getElementById('recordingContainer'),
            videoPreview: document.getElementById('videoPreview'),
            videoPlayerContainer: document.getElementById('videoPlayerContainer'),
            closeVideoPlayer: document.getElementById('closeVideoPlayer')
        };
        
        console.log("🔍 Elementos encontrados:", elements);
        
        for (const [name, element] of Object.entries(elements)) {
            if (!element) {
                console.error(`❌ Elemento no encontrado: ${name}`);
            } else {
                console.log(`✅ Elemento encontrado: ${name}`);
            }
        }
    }

    setupVideoAnalysis() {
        // Buscar elementos del reproductor
        this.analysisVideoPlayer = document.getElementById('analysisVideoPlayer');
        this.videoSource = document.getElementById('videoSource');
        this.videoAnalysisInfo = document.getElementById('videoAnalysisInfo');
        
        console.log("🎯 Elementos del reproductor:", {
            analysisVideoPlayer: !!this.analysisVideoPlayer,
            videoSource: !!this.videoSource,
            videoAnalysisInfo: !!this.videoAnalysisInfo
        });
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

        // Event listeners para grabación de video
        if (this.mainCameraBtn) {
            this.mainCameraBtn.addEventListener('click', () => this.startVideoRecording());
        }

        if (this.stopRecordingBtn) {
            this.stopRecordingBtn.addEventListener('click', () => this.stopRecording());
        }

        // NUEVOS: Event listeners para el reproductor de video
        if (this.closeVideoAnalysisBtn) {
            this.closeVideoAnalysisBtn.addEventListener('click', () => this.hideVideoAnalysis());
        }

        if (this.playPauseBtn) {
            this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }

        if (this.muteBtn) {
            this.muteBtn.addEventListener('click', () => this.toggleMute());
        }

        if (this.volumeSlider) {
            this.volumeSlider.addEventListener('input', () => this.setVolume());
        }

        if (this.downloadVideoBtn) {
            this.downloadVideoBtn.addEventListener('click', () => this.downloadVideo());
        }

        if (this.useTestVideoBtn) {
            this.useTestVideoBtn.addEventListener('click', () => this.useTestVideo());
        }

        const closeVideoPlayerBtn = document.getElementById('closeVideoPlayer');
        if (closeVideoPlayerBtn) {
            closeVideoPlayerBtn.addEventListener('click', () => this.hideVideoAnalysis());
        }

        // Event listener para el video player
        if (this.analysisVideoPlayer) {
            this.analysisVideoPlayer.addEventListener('play', () => this.onVideoPlay());
            this.analysisVideoPlayer.addEventListener('pause', () => this.onVideoPause());
            this.analysisVideoPlayer.addEventListener('volumechange', () => this.onVolumeChange());
        }
    }

    showVideoAnalysis(videoUrl, analysisData = null) {
        const recordingContainer = document.getElementById('recordingContainer');
        const videoPlayerContainer = document.getElementById('videoPlayerContainer');
        const videoPreviewContainer = document.getElementById('videoPreviewContainer');
        const recordingControls = document.getElementById('recordingControls');
        const recordingInstructions = document.getElementById('recordingInstructions');
        
        if (recordingContainer && videoPlayerContainer) {
            // Ocultar elementos de grabación
            if (videoPreviewContainer) videoPreviewContainer.style.display = 'none';
            if (recordingControls) recordingControls.style.display = 'none';
            if (recordingInstructions) recordingInstructions.style.display = 'none';
            
            // Configurar la fuente del video
            if (this.analysisVideoPlayer && this.videoSource) {
                this.videoSource.src = videoUrl;
                this.analysisVideoPlayer.load();
                
                // Añadir event listener para cuando el video esté listo
                this.analysisVideoPlayer.onloadeddata = () => {
                    console.log("✅ Video cargado y listo para reproducir");
                };
            }
            
            // MOSTRAR el reproductor de video
            videoPlayerContainer.style.display = 'block';
            
            // Cambiar a modo reproductor
            recordingContainer.classList.add('player-mode');
            
            console.log("🎬 Video mostrado en el reproductor:", videoUrl);
            
            // Scroll suave al reproductor
            setTimeout(() => {
                recordingContainer.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 300);
            
        } else {
            console.error("❌ No se pudo encontrar recordingContainer o videoPlayerContainer");
        }
    }

    startNewRecording() {
        console.log("🔄 Iniciando nueva grabación");
        
        // Ocultar el reproductor y volver al modo cámara
        this.hideVideoAnalysis();
        
        // Limpiar chunks anteriores
        this.videoChunks = [];
        
        // Iniciar nueva grabación después de un breve delay
        setTimeout(() => {
            this.startVideoRecording();
        }, 500);
    }

    togglePlayPause() {
        if (this.analysisVideoPlayer) {
            if (this.analysisVideoPlayer.paused) {
                this.analysisVideoPlayer.play();
            } else {
                this.analysisVideoPlayer.pause();
            }
        }
    }

    toggleMute() {
        if (this.analysisVideoPlayer) {
            this.analysisVideoPlayer.muted = !this.analysisVideoPlayer.muted;
            this.updateMuteButton();
        }
    }

    setVolume() {
        if (this.analysisVideoPlayer && this.volumeSlider) {
            this.analysisVideoPlayer.volume = this.volumeSlider.value;
            this.updateMuteButton();
        }
    }

    updateMuteButton() {
        if (this.muteBtn && this.analysisVideoPlayer) {
            if (this.analysisVideoPlayer.muted || this.analysisVideoPlayer.volume === 0) {
                this.muteBtn.innerHTML = '🔇 Silencio';
            } else {
                this.muteBtn.innerHTML = '🔊 Sonido';
            }
        }
    }

    onVideoPlay() {
        if (this.playPauseBtn) {
            this.playPauseBtn.innerHTML = '⏸️ Pausar';
        }
        if (this.analysisVideoPlayer) {
            this.analysisVideoPlayer.classList.add('playing');
            this.analysisVideoPlayer.classList.remove('paused');
        }
    }

    onVideoPause() {
        if (this.playPauseBtn) {
            this.playPauseBtn.innerHTML = '▶️ Reproducir';
        }
        if (this.analysisVideoPlayer) {
            this.analysisVideoPlayer.classList.add('paused');
            this.analysisVideoPlayer.classList.remove('playing');
        }
    }

    onVolumeChange() {
        this.updateMuteButton();
    }

    downloadVideo() {
        if (this.videoSource.src) {
            const link = document.createElement('a');
            link.href = this.videoSource.src;
            link.download = 'analisis-video-salud.mp4';
            link.click();
        } else {
            this.showError('No hay video disponible para descargar');
        }
    }

    // FUNCIÓN PARA USAR VIDEO DE PRUEBA
    useTestVideo() {
        // URL de un video de prueba (puedes usar cualquier video público o local)
        const testVideoUrl = 'backend\videos\lorem_ipsum.mp4';
        
        const testAnalysisData = {
            duration: '2:45',
            quality: 'HD 720p',
            recommendations: 'Plan basado en análisis de video de prueba',
            status: 'completado'
        };
        
        this.showVideoAnalysis(testVideoUrl, testAnalysisData);
        this.showSuccess('Video de prueba cargado correctamente');
    }

    resetVideoPlayer() {
        if (this.analysisVideoPlayer) {
            this.analysisVideoPlayer.pause();
            this.analysisVideoPlayer.currentTime = 0;
            this.videoSource.src = '';
            this.analysisVideoPlayer.classList.remove('playing', 'paused');
        }
        if (this.playPauseBtn) {
            this.playPauseBtn.innerHTML = '▶️ Reproducir';
        }
        this.updateMuteButton();
    }

    setupRecording() {
        this.mainCameraBtn = document.getElementById('mainCameraBtn');
        this.cameraStatus = document.getElementById('cameraStatus');
        this.recordingContainer = document.getElementById('recordingContainer');
        this.videoPreview = document.getElementById('videoPreview');
        this.recordingIndicator = document.getElementById('recordingIndicator');
        this.stopRecordingBtn = document.getElementById('stopRecording');
        this.recordingTimerEl = document.getElementById('recordingTimer');
        this.healthContext = document.getElementById('healthContext');
        this.healthSummary = document.getElementById('healthSummary');
    }

    async loadHealthProfile() {
        try {
            console.log("🔄 Cargando perfil de salud...");
            const response = await fetch('/api/health/profile');
            console.log("📊 Respuesta del servidor:", response.status);
            
            if (response.ok) {
                const profile = await response.json();
                console.log("📋 Perfil cargado:", profile);
                
                if (profile.current_weight) {
                    this.displayHealthContext(profile);
                } else {
                    console.log("ℹ️ No hay perfil de salud guardado");
                }
            } else {
                console.log("❌ Error cargando perfil:", response.status);
            }
        } catch (error) {
            console.error('❌ Error loading health profile:', error);
        }
    }

    displayHealthContext(profile) {
        console.log("🎨 Mostrando contexto de salud con:", profile);
        
        if (this.healthContext && this.healthSummary) {
            const bmi = profile.current_weight / ((profile.height / 100) ** 2);
            const weightDifference = profile.target_weight - profile.current_weight;
            const goalType = weightDifference < 0 ? 'Pérdida' : weightDifference > 0 ? 'Aumento' : 'Mantenimiento';
            
            console.log("📐 Cálculos:", { bmi, weightDifference, goalType });
            
            this.healthSummary.innerHTML = `
                <div class="health-metric">
                    <div class="value">${profile.current_weight}kg</div>
                    <div class="label">Peso Actual</div>
                </div>
                <div class="health-metric">
                    <div class="value">${profile.target_weight}kg</div>
                    <div class="label">Objetivo</div>
                </div>
                <div class="health-metric">
                    <div class="value">${bmi.toFixed(1)}</div>
                    <div class="label">Índice de Masa Corporal</div>
                </div>
                <div class="health-metric">
                    <div class="value">${goalType}</div>
                    <div class="label">Meta de Peso</div>
                </div>
            `;
            
            this.healthContext.style.display = 'block';
            console.log("✅ Contexto de salud mostrado");
        } else {
            console.log("❌ Elementos del DOM no encontrados");
        }
    }

    setupMediaRecorder() {
        console.log("🎛️ Configurando MediaRecorder...");
        
        // Verificar que tenemos un stream de video
        if (!this.videoStream) {
            console.error("❌ No hay videoStream disponible");
            return;
        }

        // Probar diferentes codecs
        const options = {
            mimeType: 'video/webm;codecs=vp9,opus',
            videoBitsPerSecond: 1000000
        };
        
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'video/webm;codecs=vp8,opus';
            console.log("🔄 Usando codec VP8");
        }
        
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'video/webm';
            console.log("🔄 Usando codec WebM básico");
        }

        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            console.error("❌ No hay codecs de video soportados");
            this.showError('Tu navegador no soporta la grabación de video');
            return;
        }

        console.log("✅ Usando codec:", options.mimeType);

        try {
            this.mediaRecorder = new MediaRecorder(this.videoStream, options);
            this.videoChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    this.videoChunks.push(event.data);
                    console.log(`📦 Chunk de video: ${event.data.size} bytes`);
                }
            };

            this.mediaRecorder.onstop = () => {
                console.log("⏹️ MediaRecorder detenido. Total chunks:", this.videoChunks.length);
                
                // SOLUCIÓN: Completamente eliminar la llamada a processVideoRecording
                // Solo limpiar los chunks y mostrar el video de prueba
                this.videoChunks = []; // Limpiar chunks
                console.log("🗑️ Chunks de video limpiados");
                
                // El video de prueba ya se muestra en stopRecording(), 
                // así que no necesitamos hacer nada más aquí
            };

            this.mediaRecorder.onerror = (event) => {
                console.error('❌ Error en MediaRecorder:', event.error);
                this.showError('Error en la grabación: ' + event.error.message);
            };

            console.log("✅ MediaRecorder configurado correctamente");

        } catch (error) {
            console.error('❌ Error creando MediaRecorder:', error);
            this.showError('Error al configurar la grabación: ' + error.message);
        }
    }

    async startVideoRecording() {
        try {
            console.log("🎥 Solicitando acceso a cámara...");
            
            // Solicitar permisos de cámara y micrófono con opciones más específicas
            this.videoStream = await navigator.mediaDevices.getUserMedia({ 
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user',
                    frameRate: { ideal: 30 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                    channelCount: 1
                }
            });

            console.log("✅ Cámara y micrófono accedidos correctamente");

            // Mostrar video preview
            this.videoPreview.srcObject = this.videoStream;
            
            // Esperar a que el video esté listo
            this.videoPreview.onloadedmetadata = () => {
                console.log("📹 Video metadata cargada");
                this.videoPreview.play().catch(e => console.error("Error reproduciendo preview:", e));
            };

            // Configurar MediaRecorder
            this.setupMediaRecorder();

            // Mostrar el grabador integrado
            this.showRecordingContainer();

            // Comenzar grabación después de mostrar el contenedor
            setTimeout(() => {
                if (this.mediaRecorder) {
                    this.mediaRecorder.start(1000); // Capturar datos cada segundo
                    this.isRecording = true;
                    this.startRecordingTimer();
                    this.updateUIForRecording(true);
                    console.log("🔴 Grabación iniciada");
                }
            }, 1000);

        } catch (error) {
            console.error('❌ Error accediendo a la cámara:', error);
            this.handleCameraError(error);
        }
    }

    handleCameraError(error) {
        let errorMessage = 'No se pudo acceder a la cámara. ';
        
        switch (error.name) {
            case 'NotAllowedError':
                errorMessage += 'Por favor, permite el acceso a la cámara y micrófono en la configuración de tu navegador.';
                break;
            case 'NotFoundError':
            case 'OverconstrainedError':
                errorMessage += 'No se encontró una cámara compatible o hay restricciones en la configuración.';
                break;
            case 'NotSupportedError':
                errorMessage += 'Tu navegador no soporta la grabación de video.';
                break;
            case 'NotReadableError':
                errorMessage += 'La cámara está siendo usada por otra aplicación.';
                break;
            default:
                errorMessage += `Error: ${error.message}`;
        }
        
        this.showError(errorMessage);
        console.error('Detalles del error:', error);
        
        // Mostrar instrucciones específicas para el usuario
        this.showCameraInstructions();
    }

    showCameraInstructions() {
        const instructions = `
            <div class="camera-instructions">
                <h4>📹 Configuración de Cámara Requerida</h4>
                <p>Para usar la grabación de video necesitas:</p>
                <ol>
                    <li><strong>Permitir acceso a la cámara</strong> cuando el navegador lo solicite</li>
                    <li><strong>Usar HTTPS</strong> o localhost (HTTP solo funciona en localhost)</li>
                    <li><strong>Actualizar tu navegador</strong> a una versión reciente</li>
                    <li><strong>Verificar permisos</strong> en la configuración de tu navegador</li>
                </ol>
                <p><strong>Navegadores compatibles:</strong> Chrome, Firefox, Edge, Safari</p>
                <button onclick="aiPlanner.testCameraAccess()" class="btn-test-camera">
                    🔄 Probar Acceso Nuevamente
                </button>
            </div>
        `;
        
        // Insertar instrucciones en el contenedor de la cámara
        const cameraContainer = document.querySelector('.camera-main-btn-container');
        if (cameraContainer) {
            cameraContainer.insertAdjacentHTML('beforeend', instructions);
        }
    }

    async testCameraAccess() {
        console.log("🔄 Probando acceso a cámara...");
        
        try {
            // Prueba simple de acceso a cámara
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            console.log("✅ Prueba exitosa - Cámara accesible");
            
            // Detener el stream de prueba
            stream.getTracks().forEach(track => track.stop());
            
            // Remover instrucciones y permitir grabación
            const instructions = document.querySelector('.camera-instructions');
            if (instructions) {
                instructions.remove();
            }
            
            this.showSuccess('¡Cámara accesible! Ahora puedes grabar.');
            
        } catch (error) {
            console.error('❌ Prueba fallida:', error);
            this.showError('La cámara sigue sin ser accesible. Verifica los permisos.');
        }
    }

    showRecordingContainer() {
        if (this.recordingContainer) {
            this.recordingContainer.style.display = 'block';
            this.resetRecordingTimer();
            
            // Scroll suave al grabador
            setTimeout(() => {
                this.recordingContainer.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 100);
        }
    }

    hideRecordingContainer() {
        if (this.recordingContainer) {
            this.recordingContainer.style.display = 'none';
            // Detener el stream de video
            if (this.videoStream) {
                this.videoStream.getTracks().forEach(track => track.stop());
                this.videoStream = null;
            }
            this.videoPreview.srcObject = null;
        }
    }

    stopRecording() {
        console.log("🛑 stopRecording llamado");
        
        if (this.mediaRecorder && this.isRecording) {
            console.log("⏹️ Parando MediaRecorder...");
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.stopRecordingTimer();
            this.updateUIForRecording(false);
            
            // Detener la cámara inmediatamente
            if (this.videoStream) {
                this.videoStream.getTracks().forEach(track => track.stop());
                this.videoStream = null;
            }
            
            // ✅ AGREGAR ESTA LÍNEA - Mostrar el video de prueba
            this.showTestVideoInPlayer();
            
            console.log("✅ Grabación detenida, mostrando video de prueba");
        } else {
            console.log("❌ No hay grabación activa para detener");
        }
    }

    showTestVideoInPlayer() {
        console.log("🎬 Mostrando video de prueba en el reproductor");
        
        // Debug: verificar elementos del DOM
        console.log("🔍 Elementos DOM:", {
            recordingContainer: !!document.getElementById('recordingContainer'),
            videoPlayerContainer: !!document.getElementById('videoPlayerContainer'),
            videoSource: !!document.getElementById('videoSource'),
            analysisVideoPlayer: !!document.getElementById('analysisVideoPlayer')
        });     

        const recordingContainer = document.getElementById('recordingContainer');
        
        if (!recordingContainer) {
            console.error("❌ No se encontró recordingContainer");
            return;
        }
        
        // URL del video de prueba
        const testVideoUrl = 'http://localhost:8000/videos/lorem_ipsum.mp4';
        
        // Datos de análisis simulados
        const testAnalysisData = {
            duration: '2:45',
            quality: 'HD 720p',
            recommendations: 'Plan basado en análisis de video de prueba',
            status: 'completado',
            bmi: 24.2,
            recommended_calories: 1850,
            calorie_target: "1800-2200", 
            diet_type: "mediterranea",
            weight_goal: "loss",
            weekly_goal: 0.5,
            analysis_notes: "Análisis basado en video de prueba"
        };
        
        // Mostrar el video de prueba en el reproductor
        this.showVideoAnalysis(testVideoUrl, testAnalysisData);
        
        // Llenar el formulario con los datos de prueba
        this.fillFormFromVideoAnalysis(testAnalysisData);
        
        this.showSuccess('Video de prueba cargado. Revisa el análisis generado.');
    }

    startRecordingTimer() {
        this.recordingStartTime = Date.now();
        this.recordingTimer = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const seconds = Math.floor(elapsed / 1000);
            const minutes = Math.floor(seconds / 60);
            const displaySeconds = seconds % 60;
            
            if (this.recordingTimerEl) {
                this.recordingTimerEl.textContent = 
                    `${minutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`;
            }

            // Parar automáticamente después de 3 minutos
            if (seconds >= 180) {
                this.stopRecording();
            }
        }, 1000);
    }

    stopRecordingTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }

    resetRecordingTimer() {
        this.stopRecordingTimer();
        if (this.recordingTimerEl) {
            this.recordingTimerEl.textContent = '00:00';
        }
    }

    updateUIForRecording(recording) {
        if (this.mainCameraBtn) {
            if (recording) {
                this.mainCameraBtn.classList.add('recording');
                this.mainCameraBtn.innerHTML = '🔴 Grabando Video...';
                this.mainCameraBtn.disabled = true;
            } else {
                this.mainCameraBtn.classList.remove('recording');
                this.mainCameraBtn.innerHTML = '📹 Grabar Video de Descripción';
                this.mainCameraBtn.disabled = false;
            }
        }

        if (this.cameraStatus) {
            if (recording) {
                this.cameraStatus.textContent = 'Grabación de video en progreso... Habla a la cámara';
                this.cameraStatus.classList.add('recording');
            } else {
                this.cameraStatus.textContent = 'Presiona el botón para grabar un video describiendo tus necesidades';
                this.cameraStatus.classList.remove('recording');
            }
        }

        if (this.recordingIndicator) {
            this.recordingIndicator.style.display = recording ? 'block' : 'none';
        }
    }

    async getHealthProfile() {
        try {
            const response = await fetch('/api/health/profile');
            if (response.ok) {
                return await response.json();
            }
            return {};
        } catch (error) {
            console.error('Error getting health profile:', error);
            return {};
        }
    }

    async analyzeVideoWithHealth(videoBlob, healthProfile) {
        console.log("🔍 DEBUG analyzeVideoWithHealth - Iniciando");
        console.log("📹 Video blob size:", videoBlob.size, "bytes");
        console.log("📊 Health profile keys:", Object.keys(healthProfile));
        
        // Validar datos esenciales
        if (!healthProfile.current_weight || !healthProfile.height) {
            throw new Error('Perfil de salud incompleto. Necesitas peso y altura.');
        }

        const formData = new FormData();
        
        // Añadir el archivo de video
        formData.append('file', videoBlob, `health-video-${Date.now()}.webm`);
        
        // Preparar datos del request
        const requestData = {
            week: document.getElementById('week').value || '2024-W01',
            health_data: {
                current_weight: healthProfile.current_weight,
                target_weight: healthProfile.target_weight,
                height: healthProfile.height,
                age: healthProfile.age || 30,
                gender: healthProfile.gender || 'hombre',
                activity_level: healthProfile.activity_level || 'moderado',
                health_conditions: healthProfile.health_conditions || []
            },
            video_notes: 'Análisis de video para plan de comidas'
        };

        console.log("📦 Request data:", requestData);
        
        // Añadir el JSON como string
        formData.append('request', JSON.stringify(requestData));

        // DEBUG: Verificar contenido del FormData
        console.log("📋 FormData contents:");
        for (let pair of formData.entries()) {
            if (pair[0] === 'file') {
                console.log(`  ${pair[0]} = [Blob, size: ${pair[1].size} bytes]`);
            } else {
                console.log(`  ${pair[0]} = ${pair[1]}`);
            }
        }

        try {
            console.log("🚀 Enviando petición POST a /api/ai/analyze-video...");
            
            const response = await fetch('/api/ai/analyze-video', {
                method: 'POST',
                body: formData
                // IMPORTANTE: No establecer Content-Type header, FormData lo hace automáticamente
            });

            console.log("📥 Respuesta recibida - Status:", response.status, response.statusText);
            
            if (!response.ok) {
                let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorDetail = errorData.detail || errorDetail;
                    console.error("❌ Error del servidor (JSON):", errorData);
                } catch (e) {
                    // Si no podemos parsear JSON, leer como texto
                    const errorText = await response.text();
                    console.error("❌ Error del servidor (text):", errorText);
                    errorDetail = errorText || errorDetail;
                }
                throw new Error(errorDetail);
            }

            const result = await response.json();
            console.log("✅ Análisis exitoso - Resultado:", result);
            return result.analysis_result;
            
        } catch (error) {
            console.error('❌ Error en analyzeVideoWithHealth:', error);
            
            // Manejar errores específicos
            if (error.name === 'TypeError') {
                if (error.message.includes('Failed to fetch')) {
                    throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté ejecutándose en http://localhost:8000');
                }
            }
            
            throw error;
        }
    }

    fillFormFromVideoAnalysis(analysis) {
        console.log('Análisis de video:', analysis);
        
        // Llenar campos basados en el análisis
        if (analysis.diet_type) {
            document.getElementById('dietType').value = analysis.diet_type;
        }
        
        if (analysis.calorie_target) {
            document.getElementById('calorieTarget').value = analysis.calorie_target;
        }
        
        // Mostrar información del análisis en los campos de objetivos
        const goalsText = `Basado en el análisis: ${analysis.analysis_notes}. 
        IMC: ${analysis.bmi}, Calorías recomendadas: ${analysis.recommended_calories}/día, 
        Objetivo semanal: ${analysis.weekly_goal}kg ${analysis.weight_goal === 'loss' ? 'de pérdida' : 'de ganancia'}.`;
        
        document.getElementById('goals').value = goalsText;
        
        // Mostrar resumen del análisis
        this.showAnalysisSummary(analysis);
    }

    showAnalysisSummary(analysis) {
        const summary = `
            <div class="health-context">
                <h3>📊 Análisis de Salud</h3>
                <div class="health-summary">
                    <div class="health-metric">
                        <div class="value">${analysis.bmi}</div>
                        <div class="label">Índice de Masa Corporal</div>
                    </div>
                    <div class="health-metric">
                        <div class="value">${analysis.recommended_calories}</div>
                        <div class="label">Calorías/día</div>
                    </div>
                    <div class="health-metric">
                        <div class="value">${analysis.weekly_goal}kg</div>
                        <div class="label">Objetivo semanal</div>
                    </div>
                    <div class="health-metric">
                        <div class="value">${analysis.diet_type}</div>
                        <div class="label">Dieta recomendada</div>
                    </div>
                </div>
            </div>
        `;
        
        // Insertar antes del formulario
        const form = document.getElementById('aiPlannerForm');
        form.insertAdjacentHTML('beforebegin', summary);
    }

    setDefaultWeek() {
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

    async startMainRecording() {
        try {
            // Solicitar permisos de micrófono
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });

            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.processRecording();
                stream.getTracks().forEach(track => track.stop());
                this.hideRecordingContainer(); // Ocultar el grabador al terminar
            };

            // Mostrar el grabador integrado
            this.showRecordingContainer();

            // Comenzar grabación después de mostrar el contenedor
            setTimeout(() => {
                this.mediaRecorder.start(1000);
                this.isRecording = true;
                this.startRecordingTimer();
                this.updateUIForRecording(true);
            }, 300);

        } catch (error) {
            console.error('Error accediendo al micrófono:', error);
            this.showError('No se pudo acceder al micrófono. Por favor, permite el acceso al micrófono.');
        }
    }

    showRecordingContainer() {
        if (this.recordingContainer) {
            this.recordingContainer.style.display = 'block';
            this.resetRecordingTimer();
            
            // Scroll suave al grabador
            setTimeout(() => {
                this.recordingContainer.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 100);
        }
    }

    hideRecordingContainer() {
        if (this.recordingContainer) {
            this.recordingContainer.style.display = 'none';
        }
    }

    openRecordingModal() {
        if (this.recordingModal) {
            this.recordingModal.style.display = 'block';
            this.resetRecordingTimer();
        }
    }

    closeRecordingModal() {
        if (this.recordingModal) {
            this.recordingModal.style.display = 'none';
            if (this.isRecording) {
                this.stopRecording();
            }
        }
    }

    startRecordingTimer() {
        this.recordingStartTime = Date.now();
        this.recordingTimer = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const seconds = Math.floor(elapsed / 1000);
            const minutes = Math.floor(seconds / 60);
            const displaySeconds = seconds % 60;
            
            if (this.recordingTimerEl) {
                this.recordingTimerEl.textContent = 
                    `${minutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`;
            }

            // Parar automáticamente después de 2 minutos
            if (seconds >= 120) {
                this.stopRecording();
            }
        }, 1000);
    }

    stopRecordingTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }

    resetRecordingTimer() {
        this.stopRecordingTimer();
        if (this.recordingTimerEl) {
            this.recordingTimerEl.textContent = '00:00';
        }
    }

    updateUIForRecording(recording) {
        if (this.mainCameraBtn) {
            if (recording) {
                this.mainCameraBtn.classList.add('recording');
                this.mainCameraBtn.innerHTML = '🔴 Grabando...';
                this.mainCameraBtn.disabled = true;
            } else {
                this.mainCameraBtn.classList.remove('recording');
                this.mainCameraBtn.innerHTML = '🎤 Grabar Descripción Completa';
                this.mainCameraBtn.disabled = false;
            }
        }

        if (this.cameraStatus) {
            if (recording) {
                this.cameraStatus.textContent = 'Grabación en progreso... Habla ahora';
                this.cameraStatus.classList.add('recording');
            } else {
                this.cameraStatus.textContent = 'Presiona el botón para grabar tu descripción';
                this.cameraStatus.classList.remove('recording');
            }
        }

        // Animar las barras de sonido
        if (this.soundWave) {
            const bars = this.soundWave.querySelectorAll('.wave-bar');
            bars.forEach(bar => {
                if (recording) {
                    bar.style.animationPlayState = 'running';
                } else {
                    bar.style.animationPlayState = 'paused';
                    bar.style.transform = 'scaleY(0.5)';
                }
            });
        }
    }

    async processRecording() {
        this.showLoadingState('Procesando audio...');
        
        try {
            // Crear blob de audio
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            
            // Simular envío a API de transcripción
            const transcribedText = await this.simulateTranscription(audioBlob);
            
            // Procesar el texto transcrito y llenar el formulario
            this.fillFormFromTranscription(transcribedText);
            
            this.hideLoadingState();
            this.showSuccess('Descripción procesada correctamente. Revisa los campos del formulario.');
            
        } catch (error) {
            this.hideLoadingState();
            this.showError('Error procesando el audio: ' + error.message);
        }
    }

    async simulateTranscription(audioBlob) {
        // Simular llamada a API de transcripción
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Textos de ejemplo que simulan diferentes descripciones de usuarios
        const sampleTranscriptions = [
            "Quiero una dieta vegetariana para perder peso, unas 1500 calorías al día. No puedo comer lactosa y me gustan las comidas picantes. Mi objetivo es perder 3 kilos en un mes y mejorar mi energía.",
            "Necesito una dieta mediterránea con unas 1800 calorías. Soy alérgico a los frutos secos y prefiero el pescado sobre la carne. Quiero mantener mi peso actual pero ganar más masa muscular.",
            "Busco una dieta vegana baja en carbohidratos, alrededor de 1200 calorías. No como soja ni gluten. Mi objetivo es bajar 5 kilos en dos meses y reducir la inflamación.",
            "Quiero una dieta equilibrada con 2200 calorías para aumentar masa muscular. No tengo alergias pero prefiero comidas sin huevo. Necesito proteínas para el gimnasio y quiero ganar 2 kilos de músculo."
        ];
        
        // Seleccionar un texto de ejemplo aleatorio
        return sampleTranscriptions[Math.floor(Math.random() * sampleTranscriptions.length)];
    }

    fillFormFromTranscription(text) {
        console.log('Texto transcrito:', text);
        
        // Lógica simple para extraer información del texto
        const lowerText = text.toLowerCase();
        
        // Detectar tipo de dieta
        if (lowerText.includes('vegetariana')) {
            document.getElementById('dietType').value = 'vegetariana';
        } else if (lowerText.includes('vegana') || lowerText.includes('vegano')) {
            document.getElementById('dietType').value = 'vegana';
        } else if (lowerText.includes('mediterránea') || lowerText.includes('mediterranea')) {
            document.getElementById('dietType').value = 'mediterranea';
        } else if (lowerText.includes('baja en carbohidratos') || lowerText.includes('low carb') || lowerText.includes('baja carbohidratos')) {
            document.getElementById('dietType').value = 'baja-carbohidratos';
        } else if (lowerText.includes('keto')) {
            document.getElementById('dietType').value = 'keto';
        } else if (lowerText.includes('sin gluten')) {
            document.getElementById('dietType').value = 'sin-gluten';
        } else if (lowerText.includes('pescetariana')) {
            document.getElementById('dietType').value = 'pescetariana';
        }
        
        // Detectar objetivo de calorías
        if (lowerText.includes('1200') || lowerText.includes('mil doscientas')) {
            document.getElementById('calorieTarget').value = '1200-1500';
        } else if (lowerText.includes('1500') || lowerText.includes('mil quinientas')) {
            document.getElementById('calorieTarget').value = '1500-1800';
        } else if (lowerText.includes('1800') || lowerText.includes('mil ochocientas')) {
            document.getElementById('calorieTarget').value = '1800-2200';
        } else if (lowerText.includes('2200') || lowerText.includes('dos mil doscientas')) {
            document.getElementById('calorieTarget').value = '2200-2500';
        } else if (lowerText.includes('2500') || lowerText.includes('dos mil quinientas') || lowerText.includes('2500')) {
            document.getElementById('calorieTarget').value = '2500-3000';
        }
        
        // Detectar alergias
        const allergyCheckboxes = document.querySelectorAll('input[name="allergies"]');
        allergyCheckboxes.forEach(checkbox => {
            if (lowerText.includes(checkbox.value) || 
                (checkbox.value === 'lactosa' && (lowerText.includes('lácteos') || lowerText.includes('lactosa'))) ||
                (checkbox.value === 'frutos-secos' && (lowerText.includes('frutos secos') || lowerText.includes('nueces') || lowerText.includes('almendras'))) ||
                (checkbox.value === 'mariscos' && (lowerText.includes('marisco') || lowerText.includes('mariscos'))) ||
                (checkbox.value === 'huevos' && lowerText.includes('huevo')) ||
                (checkbox.value === 'soja' && lowerText.includes('soja'))) {
                checkbox.checked = true;
            }
        });
        
        // Extraer preferencias y objetivos
        const preferencesMatch = text.match(/(me gusta|prefiero|me encanta|me gustan)[^.]*\.?/gi);
        const goalsMatch = text.match(/(objetivo|meta|quiero|necesito|deseo)[^.]*\.?/gi);
        
        if (preferencesMatch) {
            document.getElementById('preferences').value = preferencesMatch.join(' ').trim();
        }
        
        if (goalsMatch) {
            document.getElementById('goals').value = goalsMatch.join(' ').trim();
        }
        
        // Si no se detectaron preferencias específicas, usar el texto completo
        if (!document.getElementById('preferences').value && !document.getElementById('goals').value) {
            document.getElementById('preferences').value = text;
        }
    }

    collectFormData() {
        const allergies = Array.from(document.querySelectorAll('input[name="allergies"]:checked'))
                         .map(input => input.value);
        
        return {
            dietType: document.getElementById('dietType').value,
            calorieTarget: document.getElementById('calorieTarget').value,
            allergies: allergies,
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

    showLoadingState(message = 'La IA está creando tu plan personalizado...') {
        document.getElementById('aiLoading').style.display = 'block';
        document.getElementById('aiResultSection').style.display = 'none';
    }

    hideLoadingState() {
        document.getElementById('aiLoading').style.display = 'none';
    }

    displayAIPlan(plan) {
        const preview = document.getElementById('aiPlanPreview');
        let html = '';

        this.daysOfWeek.forEach(day => {
            const dayMeals = plan.meals[day];
            let dayTotalCalories = 0;
            let mealsHTML = '';

            this.mealTimes.forEach(mealTime => {
                const meal = dayMeals[mealTime];
                if (meal) {
                    dayTotalCalories += meal.calories;
                    
                    // Convertir a mayúsculas solo para display
                    const displayDay = this.capitalizeFirstLetter(day);
                    const displayMealTime = this.capitalizeFirstLetter(mealTime);
                    
                    mealsHTML += `
                        <div class="ai-meal">
                            <div class="ai-meal-name">
                                <strong>${displayMealTime}:</strong> ${meal.name}
                            </div>
                            <div class="ai-meal-calories">
                                ${meal.calories} kcal
                            </div>
                        </div>
                    `;
                }
            });

            // Convertir día a mayúsculas solo para display
            const displayDay = this.capitalizeFirstLetter(day);
            
            html += `
                <div class="ai-day-plan">
                    <h4>
                        ${displayDay}
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
            const dayMeals = plan.meals[day];
            this.mealTimes.forEach(mealTime => {
                const meal = dayMeals[mealTime];
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
            id: plan.id || Date.now(),
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
        const firstDay = this.daysOfWeek[0];
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

    loadRecentPlansFromLocal() {
        const container = document.getElementById('recentAiPlans');
        const recentPlans = this.getRecentPlans();
        
        if (recentPlans.length === 0) {
            container.innerHTML = '<p class="no-plans">No hay planes generados recientemente</p>';
            return;
        }

        container.innerHTML = recentPlans.map(plan => `
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
            // Intentar cargar desde el backend primero
            const response = await fetch(`/api/ai/plans/${planId}`);
            
            if (response.ok) {
                const plan = await response.json();
                this.displayAIPlan(plan);
            } else {
                // Fallback a localStorage
                this.loadRecentPlanFromLocal(planId);
            }
            
            document.getElementById('aiResultSection').scrollIntoView({ 
                behavior: 'smooth' 
            });
        } catch (error) {
            this.loadRecentPlanFromLocal(planId);
        }
    }

    loadRecentPlanFromLocal(planId) {
        const recentPlans = this.getRecentPlans();
        const plan = recentPlans.find(p => p.id == planId);
        
        if (plan) {
            this.displayAIPlan(plan);
        } else {
            this.showError('Plan no encontrado');
        }
    }

    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
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