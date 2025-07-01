

// ==================== WEBGL 3D VISUALIZER CLASS ====================

class WebGL3DVisualizer {
    constructor(gl, canvas) {
        this.gl = gl;
        this.canvas = canvas;
        
        // Camera properties
        this.camera = {
            x: 0, y: 0, z: 5,
            rotX: 0, rotY: 0,
            fov: 45,
            near: 0.1,
            far: 100
        };
        
        // 3D particles
        this.particles3D = [];
        this.maxParticles3D = 200;
        
        // Matrices
        this.projectionMatrix = mat4.create();
        this.viewMatrix = mat4.create();
        this.modelMatrix = mat4.create();
        
        try {
            this.initShaders();
            this.initBuffers();
            this.updateProjection();
            this.initParticles3D();
            console.log('WebGL 3D Visualizer initialized successfully');
        } catch (error) {
            console.error('WebGL 3D Visualizer initialization failed:', error);
            throw error;
        }
    }
    
    initShaders() {
        const vertexShaderSource = `
            attribute vec3 aPosition;
            attribute vec3 aColor;
            attribute float aSize;
            
            uniform mat4 uProjectionMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uModelMatrix;
            uniform float uTime;
            
            varying vec3 vColor;
            varying float vSize;
            
            void main() {
                vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0);
                
                // Add some wave motion
                worldPosition.y += sin(worldPosition.x * 2.0 + uTime) * 0.1;
                worldPosition.x += cos(worldPosition.z * 2.0 + uTime) * 0.05;
                
                gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
                gl_PointSize = aSize * (50.0 / gl_Position.w);
                
                vColor = aColor;
                vSize = aSize;
            }
        `;
        
        const fragmentShaderSource = `
            precision mediump float;
            
            varying vec3 vColor;
            varying float vSize;
            uniform float uTime;
            
            void main() {
                vec2 center = gl_PointCoord - 0.5;
                float dist = length(center);
                
                if (dist > 0.5) {
                    discard;
                }
                
                // Create a glowing effect
                float glow = 1.0 - (dist * 2.0);
                glow = pow(glow, 2.0);
                
                // Pulsing effect
                float pulse = sin(uTime * 5.0) * 0.3 + 0.7;
                
                gl_FragColor = vec4(vColor * glow * pulse, glow * 0.8);
            }
        `;
        
        this.shaderProgram = this.createShaderProgram(vertexShaderSource, fragmentShaderSource);
        
        // Get attribute and uniform locations
        this.programInfo = {
            attribLocations: {
                position: this.gl.getAttribLocation(this.shaderProgram, 'aPosition'),
                color: this.gl.getAttribLocation(this.shaderProgram, 'aColor'),
                size: this.gl.getAttribLocation(this.shaderProgram, 'aSize'),
            },
            uniformLocations: {
                projectionMatrix: this.gl.getUniformLocation(this.shaderProgram, 'uProjectionMatrix'),
                viewMatrix: this.gl.getUniformLocation(this.shaderProgram, 'uViewMatrix'),
                modelMatrix: this.gl.getUniformLocation(this.shaderProgram, 'uModelMatrix'),
                time: this.gl.getUniformLocation(this.shaderProgram, 'uTime'),
            },
        };
    }
    
    createShaderProgram(vertexSource, fragmentSource) {
        const vertexShader = this.loadShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.loadShader(this.gl.FRAGMENT_SHADER, fragmentSource);
        
        const shaderProgram = this.gl.createProgram();
        this.gl.attachShader(shaderProgram, vertexShader);
        this.gl.attachShader(shaderProgram, fragmentShader);
        this.gl.linkProgram(shaderProgram);
        
        if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
            console.error('Unable to initialize shader program:', this.gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        
        return shaderProgram;
    }
    
    loadShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shaders:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    initBuffers() {
        this.positionBuffer = this.gl.createBuffer();
        this.colorBuffer = this.gl.createBuffer();
        this.sizeBuffer = this.gl.createBuffer();
    }
    
    initParticles3D() {
        for (let i = 0; i < this.maxParticles3D; i++) {
            this.particles3D.push({
                x: (Math.random() - 0.5) * 10,
                y: (Math.random() - 0.5) * 10,
                z: (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 0.1,
                vy: (Math.random() - 0.5) * 0.1,
                vz: (Math.random() - 0.5) * 0.1,
                size: Math.random() * 20 + 5,
                life: 1.0,
                colorIndex: Math.floor(Math.random() * 4),
                frequency: Math.random() * 256
            });
        }
    }
    
    updateProjection() {
        const aspect = this.canvas.width / this.canvas.height;
        mat4.perspective(this.projectionMatrix, 
            this.camera.fov * Math.PI / 180, 
            aspect, 
            this.camera.near, 
            this.camera.far
        );
    }
    
    updateViewMatrix() {
        mat4.identity(this.viewMatrix);
        mat4.translate(this.viewMatrix, this.viewMatrix, [this.camera.x, this.camera.y, -this.camera.z]);
        mat4.rotateX(this.viewMatrix, this.viewMatrix, this.camera.rotX);
        mat4.rotateY(this.viewMatrix, this.viewMatrix, this.camera.rotY);
    }
    
    rotateCamera(deltaX, deltaY) {
        this.camera.rotY += deltaX;
        this.camera.rotX += deltaY;
        
        // Clamp vertical rotation
        this.camera.rotX = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.camera.rotX));
    }
    
    zoom(delta) {
        this.camera.z += delta * 10;
        this.camera.z = Math.max(1, Math.min(20, this.camera.z));
    }
    
    moveCamera(deltaX, deltaY, deltaZ) {
        this.camera.x += deltaX;
        this.camera.y += deltaY;
        this.camera.z += deltaZ;
    }
    
    resetCamera() {
        this.camera.x = 0;
        this.camera.y = 0;
        this.camera.z = 5;
        this.camera.rotX = 0;
        this.camera.rotY = 0;
    }
    
    render(audioData, themeColors, settings) {
        const gl = this.gl;
        
        // Clear the canvas
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        // Update particles based on audio data
        this.updateParticles3D(audioData, settings);
        
        // Prepare rendering
        gl.useProgram(this.shaderProgram);
        
        // Update matrices
        this.updateViewMatrix();
        mat4.identity(this.modelMatrix);
        
        // Set uniforms
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, this.projectionMatrix);
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.viewMatrix, false, this.viewMatrix);
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.modelMatrix, false, this.modelMatrix);
        gl.uniform1f(this.programInfo.uniformLocations.time, Date.now() * 0.001);
        
        // Prepare particle data
        const positions = [];
        const colors = [];
        const sizes = [];
        
        this.particles3D.forEach(particle => {
            if (particle.life > 0) {
                positions.push(particle.x, particle.y, particle.z);
                
                const color = this.hexToRgb(themeColors[particle.colorIndex % themeColors.length]);
                colors.push(color.r / 255, color.g / 255, color.b / 255);
                
                sizes.push(particle.size);
            }
        });
        
        // Bind and set position data
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.position);
        gl.vertexAttribPointer(this.programInfo.attribLocations.position, 3, gl.FLOAT, false, 0, 0);
        
        // Bind and set color data
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.color);
        gl.vertexAttribPointer(this.programInfo.attribLocations.color, 3, gl.FLOAT, false, 0, 0);
        
        // Bind and set size data
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizes), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.size);
        gl.vertexAttribPointer(this.programInfo.attribLocations.size, 1, gl.FLOAT, false, 0, 0);
        
        // Draw particles
        gl.drawArrays(gl.POINTS, 0, positions.length / 3);
    }
    
    updateParticles3D(audioData, settings) {
        // Calculate frequency bands
        const bassAvg = this.getFrequencyAverage(audioData, 0, 30);
        const midAvg = this.getFrequencyAverage(audioData, 30, 100);
        const trebleAvg = this.getFrequencyAverage(audioData, 100, audioData.length);
        
        this.particles3D.forEach(particle => {
            // Get audio influence for this particle's frequency
            const freqIndex = Math.floor(particle.frequency);
            const audioInfluence = audioData[freqIndex] / 255 * settings.sensitivity;
            
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.z += particle.vz;
            
            // Audio reactive movement
            particle.vy += (bassAvg - 0.5) * 0.01;
            particle.vx += (midAvg - 0.5) * 0.005;
            particle.vz += (trebleAvg - 0.5) * 0.005;
            
            // Audio reactive size
            particle.size = 5 + audioInfluence * 30;
            
            // Boundary wrapping
            if (Math.abs(particle.x) > 15) particle.vx *= -0.8;
            if (Math.abs(particle.y) > 15) particle.vy *= -0.8;
            if (Math.abs(particle.z) > 15) particle.vz *= -0.8;
            
            // Add some damping
            particle.vx *= 0.99;
            particle.vy *= 0.99;
            particle.vz *= 0.99;
        });
    }
    
    getFrequencyAverage(audioData, start, end) {
        let sum = 0;
        const count = end - start;
        for (let i = start; i < end && i < audioData.length; i++) {
            sum += audioData[i];
        }
        return sum / count / 255;
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : {r: 255, g: 255, b: 255};
    }
}

// Simple matrix math library (mat4)
const mat4 = {
    create() {
        return new Float32Array(16);
    },
    
    identity(out) {
        out[0] = 1; out[1] = 0; out[2] = 0; out[3] = 0;
        out[4] = 0; out[5] = 1; out[6] = 0; out[7] = 0;
        out[8] = 0; out[9] = 0; out[10] = 1; out[11] = 0;
        out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
        return out;
    },
    
    perspective(out, fovy, aspect, near, far) {
        const f = 1.0 / Math.tan(fovy / 2);
        const rangeInv = 1 / (near - far);
        
        out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
        out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
        out[8] = 0; out[9] = 0; out[10] = (far + near) * rangeInv; out[11] = -1;
        out[12] = 0; out[13] = 0; out[14] = 2 * far * near * rangeInv; out[15] = 0;
        return out;
    },
    
    translate(out, a, v) {
        const x = v[0], y = v[1], z = v[2];
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
        
        for (let i = 0; i < 12; i++) {
            out[i] = a[i];
        }
        return out;
    },
    
    rotateX(out, a, rad) {
        const s = Math.sin(rad);
        const c = Math.cos(rad);
        const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        
        out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
        out[4] = a10 * c + a20 * s;
        out[5] = a11 * c + a21 * s;
        out[6] = a12 * c + a22 * s;
        out[7] = a13 * c + a23 * s;
        out[8] = a20 * c - a10 * s;
        out[9] = a21 * c - a11 * s;
        out[10] = a22 * c - a12 * s;
        out[11] = a23 * c - a13 * s;
        out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
        return out;
    },
    
    rotateY(out, a, rad) {
        const s = Math.sin(rad);
        const c = Math.cos(rad);
        const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        
        out[0] = a00 * c - a20 * s;
        out[1] = a01 * c - a21 * s;
        out[2] = a02 * c - a22 * s;
        out[3] = a03 * c - a23 * s;
        out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
        out[8] = a00 * s + a20 * c;
        out[9] = a01 * s + a21 * c;
        out[10] = a02 * s + a22 * c;
        out[11] = a03 * s + a23 * c;
        out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
        return out;
    }
};

// Initialize the visualizer when the page loads
window.addEventListener('load', () => {
    new AdvancedMusicVisualizer();
});class AdvancedMusicVisualizer {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.timeDataArray = null;
        this.source = null;
        this.audio = null;
        this.gainNode = null;
        this.animationId = null;
        this.isPlaying = false;
        this.visualizerType = 'bars';
        this.micStream = null;
        this.isMicActive = false;
        this.isFullscreen = false;
        this.theme = 'ocean';
        this.volume = 0.5;
        
        // Beat detection
        this.beatThreshold = 0.3;
        this.beatCutoff = 0;
        this.beatTime = 0;
        
        // Particles system
        this.particles = [];
        this.maxParticles = 150; // Increased for more impressive effect
        this.particleTrails = []; // For particle trails
        this.mouseX = 0;
        this.mouseY = 0;
        
        // Customizable settings
        this.settings = {
            particleCount: 150,
            gravity: 0.08,
            trailLength: 8,
            mouseAttraction: 0.5,
            sensitivity: 1.0,
            glowIntensity: 15,
            backgroundFade: 0.1,
            showTrails: true,
            showBeatIndicator: true,
            enableAI: true,
            predictionWindow: 0.5,
            aiConfidenceThreshold: 0.7,
            learningRate: 0.01
        };
        
        // AI Beat Prediction System
        this.aiPredictor = null;
        this.audioFeatures = [];
        this.beatHistory = [];
        this.predictions = [];
        this.isAIReady = false;
        
        // 3D rotation
        this.rotation = 0;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.resizeCanvas();
        this.initParticles();
        this.setupDragDrop();
        this.setupSettings();
        
        // Hide loading screen and show main interface immediately
        this.hideLoadingScreen();
        
        // Initialize AI in background (non-blocking)
        this.initAIBeatPredictor().catch(error => {
            console.warn('AI initialization failed, continuing without AI:', error);
            this.settings.enableAI = false;
            document.getElementById('enableAI').checked = false;
            this.updateAIVisibility();
        });
        
        // Track mouse movement for particle interactions
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });
        
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    setupEventListeners() {
        // File and audio controls
        document.getElementById('audioFile').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('micBtn').addEventListener('click', () => this.toggleMicrophone());
        document.getElementById('playPauseBtn').addEventListener('click', () => this.togglePlayPause());
        
        // Visualization controls
        document.getElementById('visualizerType').addEventListener('change', (e) => {
            this.visualizerType = e.target.value;
        });
        document.getElementById('themeSelect').addEventListener('change', (e) => {
            this.changeTheme(e.target.value);
        });
        
        // Audio controls
        document.getElementById('volumeSlider').addEventListener('input', (e) => {
            this.setVolume(e.target.value / 100);
        });
        document.getElementById('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('saveImageBtn').addEventListener('click', () => this.saveAsImage());
        document.getElementById('settingsBtn').addEventListener('click', () => this.toggleSettings());
        document.getElementById('progressBar').addEventListener('click', (e) => this.seekTo(e));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.togglePlayPause();
            } else if (e.code === 'KeyF') {
                this.toggleFullscreen();
            }
        });
    }
    
    setupDragDrop() {
        const container = document.getElementById('container');
        const overlay = document.getElementById('dragOverlay');
        
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
        });
        
        container.addEventListener('dragleave', (e) => {
            if (!container.contains(e.relatedTarget)) {
                overlay.classList.add('hidden');
                overlay.classList.remove('flex');
            }
        });
        
        container.addEventListener('drop', (e) => {
            e.preventDefault();
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('audio/')) {
                this.loadAudioFile(files[0]);
            }
        });
    }
    
    changeTheme(theme) {
        this.theme = theme;
        document.body.className = document.body.className.replace(/theme-\w+/, `theme-${theme}`);
    }
    
    resizeCanvas() {
        if (this.isFullscreen) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.canvas.classList.add('!rounded-none', '!shadow-none');
        } else {
            const maxWidth = Math.min(window.innerWidth - 40, 900);
            const maxHeight = Math.min(window.innerHeight - 250, 500);
            this.canvas.width = maxWidth;
            this.canvas.height = maxHeight;
            this.canvas.classList.remove('!rounded-none', '!shadow-none');
        }
    }
    
    toggleFullscreen() {
        const container = document.getElementById('container');
        
        if (!this.isFullscreen) {
            container.classList.add('fixed', 'inset-0', 'z-50', 'bg-black');
            this.isFullscreen = true;
            document.getElementById('fullscreenBtn').textContent = '⛶ Exit';
        } else {
            container.classList.remove('fixed', 'inset-0', 'z-50', 'bg-black');
            this.isFullscreen = false;
            document.getElementById('fullscreenBtn').textContent = '⛶ Full';
        }
        
        this.resizeCanvas();
    }
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }
    
    updateAIVisibility() {
        const aiPanel = document.getElementById('aiStatusOverlay');
        const aiIndicator = document.getElementById('aiPredictionIndicator');
        const enableAI = this.settings.enableAI;
        
        if (aiPanel) aiPanel.style.display = enableAI ? 'block' : 'none';
        if (aiIndicator) aiIndicator.style.display = enableAI ? 'block' : 'none';
    }
    
    // ==================== SAVE AS IMAGE ====================
    saveAsImage() {
        // Create a temporary canvas with a solid background
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        
        // Fill with theme-appropriate background
        const gradient = tempCtx.createLinearGradient(0, 0, tempCanvas.width, tempCanvas.height);
        const themeColors = this.getThemeColors();
        gradient.addColorStop(0, themeColors[0]);
        gradient.addColorStop(1, themeColors[1]);
        
        tempCtx.fillStyle = gradient;
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Draw the current visualization on top
        tempCtx.drawImage(this.canvas, 0, 0);
        
        // Add timestamp and song info
        tempCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        tempCtx.font = 'bold 16px Arial';
        tempCtx.textAlign = 'right';
        
        const timestamp = new Date().toLocaleString();
        const songInfo = document.getElementById('songInfo').textContent || 'Music Visualizer';
        
        tempCtx.fillText(timestamp, tempCanvas.width - 20, tempCanvas.height - 40);
        tempCtx.fillText(songInfo, tempCanvas.width - 20, tempCanvas.height - 20);
        
        // Add watermark
        tempCtx.font = 'bold 14px Arial';
        tempCtx.textAlign = 'left';
        tempCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        tempCtx.fillText('Music Visualizer', 20, tempCanvas.height - 20);
        
        // Download the image
        const link = document.createElement('a');
        link.download = `music-visualizer-${Date.now()}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
        
        // Show success feedback
        const saveBtn = document.getElementById('saveImageBtn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '✅ Saved!';
        saveBtn.classList.add('bg-green-500/60', 'border-green-500/80');
        
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.classList.remove('bg-green-500/60', 'border-green-500/80');
        }, 2000);
    }
    
    // ==================== SETTINGS PANEL ====================
    setupSettings() {
        // Settings panel controls
        document.getElementById('closeSettingsBtn').addEventListener('click', () => this.toggleSettings());
        
        // Slider controls
        const sliders = [
            'particleCount', 'gravity', 'trailLength', 'mouseAttraction',
            'sensitivity', 'glowIntensity', 'backgroundFade', 'predictionWindow',
            'aiConfidenceThreshold', 'learningRate'
        ];
        
        sliders.forEach(setting => {
            const slider = document.getElementById(setting);
            const valueSpan = document.getElementById(setting + 'Value');
            
            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.settings[setting] = value;
                valueSpan.textContent = value;
                this.applySettings();
            });
        });
        
        // Checkbox controls
        document.getElementById('showTrails').addEventListener('change', (e) => {
            this.settings.showTrails = e.target.checked;
        });
        
        document.getElementById('showBeatIndicator').addEventListener('change', (e) => {
            this.settings.showBeatIndicator = e.target.checked;
            const indicator = document.getElementById('beatIndicator');
            indicator.style.display = e.target.checked ? 'block' : 'none';
        });
        
        document.getElementById('enableAI').addEventListener('change', (e) => {
            this.settings.enableAI = e.target.checked;
            this.updateAIVisibility();
            
            if (e.target.checked && !this.isAIReady) {
                // Try to initialize AI again
                this.initAIBeatPredictor().catch(error => {
                    console.warn('AI re-initialization failed:', error);
                    this.settings.enableAI = false;
                    e.target.checked = false;
                    this.updateAIVisibility();
                });
            }
        });
        
        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.loadPreset(e.target.dataset.preset);
            });
        });
        
        // Save/Reset buttons
        document.getElementById('savePresetBtn').addEventListener('click', () => this.saveCustomPreset());
        document.getElementById('resetSettingsBtn').addEventListener('click', () => this.resetSettings());
    }
    
    toggleSettings() {
        const panel = document.getElementById('settingsPanel');
        const isOpen = !panel.classList.contains('translate-x-full');
        
        if (isOpen) {
            panel.classList.add('translate-x-full');
            document.getElementById('settingsBtn').textContent = '⚙️ Settings';
        } else {
            panel.classList.remove('translate-x-full');
            document.getElementById('settingsBtn').textContent = '✕ Close';
        }
    }
    
    applySettings() {
        // Update max particles
        this.maxParticles = this.settings.particleCount;
        
        // Adjust existing particles
        while (this.particles.length > this.maxParticles) {
            this.particles.pop();
        }
        while (this.particles.length < this.maxParticles && this.particles.length < 50) {
            this.particles.push(this.createParticle());
        }
    }
    
    loadPreset(presetName) {
        const presets = {
            chill: {
                particleCount: 80,
                gravity: 0.02,
                trailLength: 12,
                mouseAttraction: 0.3,
                sensitivity: 0.7,
                glowIntensity: 20,
                backgroundFade: 0.05,
                showTrails: true,
                showBeatIndicator: true
            },
            intense: {
                particleCount: 250,
                gravity: 0.15,
                trailLength: 5,
                mouseAttraction: 1.2,
                sensitivity: 2.0,
                glowIntensity: 25,
                backgroundFade: 0.2,
                showTrails: true,
                showBeatIndicator: true
            },
            minimal: {
                particleCount: 50,
                gravity: 0.05,
                trailLength: 3,
                mouseAttraction: 0.2,
                sensitivity: 0.5,
                glowIntensity: 8,
                backgroundFade: 0.03,
                showTrails: false,
                showBeatIndicator: false
            },
            chaotic: {
                particleCount: 300,
                gravity: 0.2,
                trailLength: 15,
                mouseAttraction: 2.0,
                sensitivity: 3.0,
                glowIntensity: 30,
                backgroundFade: 0.3,
                showTrails: true,
                showBeatIndicator: true
            }
        };
        
        if (presets[presetName]) {
            this.settings = { ...presets[presetName] };
            this.updateSettingsUI();
            this.applySettings();
            
            // Visual feedback
            document.querySelectorAll('.preset-btn').forEach(btn => {
                btn.classList.remove('bg-green-500/60');
            });
            document.querySelector(`[data-preset="${presetName}"]`).classList.add('bg-green-500/60');
            
            setTimeout(() => {
                document.querySelector(`[data-preset="${presetName}"]`).classList.remove('bg-green-500/60');
            }, 1000);
        }
    }
    
    updateSettingsUI() {
        Object.keys(this.settings).forEach(key => {
            const slider = document.getElementById(key);
            const valueSpan = document.getElementById(key + 'Value');
            const checkbox = document.getElementById(key);
            
            if (slider && valueSpan) {
                slider.value = this.settings[key];
                valueSpan.textContent = this.settings[key];
            } else if (checkbox && typeof this.settings[key] === 'boolean') {
                checkbox.checked = this.settings[key];
            }
        });
    }
    
    saveCustomPreset() {
        const presetData = JSON.stringify(this.settings);
        localStorage.setItem('musicVisualizerCustomPreset', presetData);
        
        const btn = document.getElementById('savePresetBtn');
        const originalText = btn.textContent;
        btn.textContent = '✅ Saved!';
        btn.classList.add('bg-green-500/60');
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('bg-green-500/60');
        }, 2000);
    }
    
    resetSettings() {
        this.settings = {
            particleCount: 150,
            gravity: 0.08,
            trailLength: 8,
            mouseAttraction: 0.5,
            sensitivity: 1.0,
            glowIntensity: 15,
            backgroundFade: 0.1,
            showTrails: true,
            showBeatIndicator: true
        };
        
        this.updateSettingsUI();
        this.applySettings();
    }
    
    // ==================== AI BEAT PREDICTION SYSTEM ====================
    
    async initAIBeatPredictor() {
        try {
            // Update status to show it's starting
            const aiStatus = document.getElementById('aiStatus');
            const aiAccuracy = document.getElementById('aiAccuracy');
            
            if (aiStatus) aiStatus.className = 'w-3 h-3 bg-yellow-500 rounded-full';
            if (aiAccuracy) aiAccuracy.textContent = 'Accuracy: Initializing...';
            
            // Check if TensorFlow.js is available
            if (typeof tf === 'undefined') {
                throw new Error('TensorFlow.js not loaded');
            }
            
            // Wait for TensorFlow.js to be ready (with timeout)
            const tfReady = Promise.race([
                tf.ready(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('TF.js timeout')), 10000))
            ]);
            
            await tfReady;
            
            // Initialize AI predictor with simpler model
            this.aiPredictor = new AIBeatPredictor();
            await this.aiPredictor.initialize();
            
            this.isAIReady = true;
            
            if (aiStatus) aiStatus.className = 'w-3 h-3 bg-green-500 rounded-full';
            if (aiAccuracy) aiAccuracy.textContent = 'Accuracy: Ready';
            
            console.log('AI Beat Predictor initialized successfully');
            
        } catch (error) {
            console.warn('AI initialization failed:', error);
            
            // Set AI as disabled
            this.isAIReady = false;
            this.settings.enableAI = false;
            
            const aiStatus = document.getElementById('aiStatus');
            const aiAccuracy = document.getElementById('aiAccuracy');
            
            if (aiStatus) aiStatus.className = 'w-3 h-3 bg-red-500 rounded-full';
            if (aiAccuracy) aiAccuracy.textContent = 'Accuracy: Disabled';
            
            // Hide AI elements
            this.updateAIVisibility();
            
            // Don't throw error - let app continue without AI
        }
    }
    
    processAudioForAI() {
        if (!this.isAIReady || !this.settings.enableAI || !this.dataArray) return;
        
        try {
            // Extract audio features for AI
            const features = this.extractAudioFeatures(this.dataArray);
            this.audioFeatures.push({
                features: features,
                timestamp: Date.now(),
                actualBeat: this.detectBeat() // Current beat detection result
            });
            
            // Keep only recent features (last 5 seconds)
            const fiveSecondsAgo = Date.now() - 5000;
            this.audioFeatures = this.audioFeatures.filter(f => f.timestamp > fiveSecondsAgo);
            
            // Make prediction if we have enough data
            if (this.audioFeatures.length >= 10) {
                this.makeBeatPrediction();
            }
            
        } catch (error) {
            console.error('AI processing error:', error);
        }
    }
    
    extractAudioFeatures(audioData) {
        // Extract multiple audio features for AI model
        const features = [];
        
        // 1. Frequency bands (bass, mid, treble)
        const bassSum = audioData.slice(0, 30).reduce((a, b) => a + b, 0) / 30;
        const midSum = audioData.slice(30, 100).reduce((a, b) => a + b, 0) / 70;
        const trebleSum = audioData.slice(100).reduce((a, b) => a + b, 0) / (audioData.length - 100);
        
        features.push(bassSum / 255, midSum / 255, trebleSum / 255);
        
        // 2. Spectral centroid (brightness)
        let weightedSum = 0;
        let magnitudeSum = 0;
        for (let i = 0; i < audioData.length; i++) {
            weightedSum += i * audioData[i];
            magnitudeSum += audioData[i];
        }
        const spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
        features.push(spectralCentroid / audioData.length);
        
        // 3. Zero crossing rate (from time domain data)
        if (this.timeDataArray) {
            let zeroCrossings = 0;
            for (let i = 1; i < this.timeDataArray.length; i++) {
                if ((this.timeDataArray[i] - 128) * (this.timeDataArray[i-1] - 128) < 0) {
                    zeroCrossings++;
                }
            }
            features.push(zeroCrossings / this.timeDataArray.length);
        } else {
            features.push(0);
        }
        
        // 4. Energy (RMS)
        const energy = Math.sqrt(audioData.reduce((sum, val) => sum + val * val, 0) / audioData.length);
        features.push(energy / 255);
        
        // 5. Spectral rolloff
        const energyThreshold = 0.85 * audioData.reduce((a, b) => a + b, 0);
        let cumulativeEnergy = 0;
        let rolloffIndex = 0;
        for (let i = 0; i < audioData.length; i++) {
            cumulativeEnergy += audioData[i];
            if (cumulativeEnergy >= energyThreshold) {
                rolloffIndex = i;
                break;
            }
        }
        features.push(rolloffIndex / audioData.length);
        
        return features;
    }
    
    async makeBeatPrediction() {
        if (!this.aiPredictor || !this.isAIReady) return;
        
        try {
            const recentFeatures = this.audioFeatures.slice(-10); // Last 10 frames
            const prediction = await this.aiPredictor.predict(recentFeatures, this.settings);
            
            if (prediction.confidence > this.settings.aiConfidenceThreshold) {
                // High confidence prediction
                const predictionTime = prediction.timeToNextBeat;
                
                // Update UI
                document.getElementById('aiConfidence').textContent = `Confidence: ${(prediction.confidence * 100).toFixed(1)}%`;
                document.getElementById('aiPredictionTime').textContent = `Next Beat: ${predictionTime.toFixed(2)}s`;
                
                // Trigger predictive visual effect
                this.triggerPredictiveBeat(predictionTime, prediction.confidence);
                
                // Store prediction for accuracy tracking
                this.predictions.push({
                    timestamp: Date.now(),
                    predictedTime: predictionTime,
                    confidence: prediction.confidence,
                    actualTime: null // Will be filled when actual beat occurs
                });
                
                // Update accuracy display
                this.updateAccuracyDisplay();
            }
            
        } catch (error) {
            console.error('Prediction error:', error);
        }
    }
    
    triggerPredictiveBeat(timeToNextBeat, confidence) {
        // Visual indication of predicted beat
        const aiIndicator = document.getElementById('aiPredictionIndicator');
        
        // Immediate glow effect
        aiIndicator.classList.add('bg-blue-400', 'scale-125', 'shadow-lg', 'shadow-blue-400/50');
        
        setTimeout(() => {
            aiIndicator.classList.remove('bg-blue-400', 'scale-125', 'shadow-lg', 'shadow-blue-400/50');
        }, 200);
        
        // Schedule predicted beat effect
        setTimeout(() => {
            this.triggerPredictedBeatEffect(confidence);
        }, timeToNextBeat * 1000);
    }
    
    triggerPredictedBeatEffect(confidence) {
        // Create predictive particle burst
        if (this.visualizerType === 'particles') {
            const burstCount = Math.floor(confidence * 15) + 5;
            for (let i = 0; i < burstCount; i++) {
                const particle = this.createParticle(
                    this.canvas.width / 2 + (Math.random() - 0.5) * 100,
                    this.canvas.height / 2 + (Math.random() - 0.5) * 100,
                    true
                );
                particle.color = 3; // Use a specific color for AI predictions
                this.particles.push(particle);
            }
        }
        
        // AI prediction indicator effect
        const aiIndicator = document.getElementById('aiPredictionIndicator');
        aiIndicator.classList.add('animate-pulse', 'bg-blue-300');
        
        setTimeout(() => {
            aiIndicator.classList.remove('animate-pulse', 'bg-blue-300');
        }, 300);
    }
    
    updateAccuracyDisplay() {
        // Calculate accuracy of recent predictions
        const recentPredictions = this.predictions.slice(-20); // Last 20 predictions
        let correctPredictions = 0;
        
        recentPredictions.forEach(pred => {
            if (pred.actualTime !== null) {
                const timeDiff = Math.abs(pred.predictedTime - pred.actualTime);
                if (timeDiff < 0.2) { // Within 200ms is considered accurate
                    correctPredictions++;
                }
            }
        });
        
        const accuracy = recentPredictions.length > 0 ? 
            (correctPredictions / recentPredictions.length * 100).toFixed(1) : 0;
        
        document.getElementById('aiAccuracy').textContent = `Accuracy: ${accuracy}%`;
    }
    
    // ==================== WEBGL 3D SYSTEM ====================
    
    initWebGL3D() {
        try {
            this.gl = this.webglCanvas.getContext('webgl') || this.webglCanvas.getContext('experimental-webgl');
            if (!this.gl) {
                console.warn('WebGL not supported, 3D features disabled');
                // Hide the WebGL 3D option if not supported
                const option = document.querySelector('option[value="webgl3d"]');
                if (option) option.style.display = 'none';
                return;
            }
            
            this.webgl3D = new WebGL3DVisualizer(this.gl, this.webglCanvas);
            this.setupWebGL3DControls();
            console.log('WebGL 3D initialized successfully');
            
        } catch (error) {
            console.error('WebGL initialization failed:', error);
            // Hide the WebGL 3D option on error
            const option = document.querySelector('option[value="webgl3d"]');
            if (option) option.style.display = 'none';
        }
    }
    
    setupWebGL3DControls() {
        if (!this.webglCanvas || !this.webgl3D) return;
        
        let isDragging = false;
        let lastMouseX = 0;
        let lastMouseY = 0;
        
        // Mouse controls for 3D camera
        this.webglCanvas.addEventListener('mousedown', (e) => {
            if (this.visualizerType === 'webgl3d') {
                isDragging = true;
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
                this.webglCanvas.style.cursor = 'grabbing';
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging && this.visualizerType === 'webgl3d' && this.webgl3D) {
                const deltaX = e.clientX - lastMouseX;
                const deltaY = e.clientY - lastMouseY;
                
                this.webgl3D.rotateCamera(deltaX * 0.01, deltaY * 0.01);
                
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            if (this.webglCanvas) {
                this.webglCanvas.style.cursor = 'grab';
            }
        });
        
        // Scroll for zoom
        this.webglCanvas.addEventListener('wheel', (e) => {
            if (this.visualizerType === 'webgl3d' && this.webgl3D) {
                e.preventDefault();
                this.webgl3D.zoom(e.deltaY * 0.001);
            }
        });
        
        // Arrow keys for camera movement
        document.addEventListener('keydown', (e) => {
            if (this.visualizerType === 'webgl3d' && this.webgl3D) {
                switch(e.code) {
                    case 'ArrowUp':
                        this.webgl3D.moveCamera(0, 0.1, 0);
                        e.preventDefault();
                        break;
                    case 'ArrowDown':
                        this.webgl3D.moveCamera(0, -0.1, 0);
                        e.preventDefault();
                        break;
                    case 'ArrowLeft':
                        this.webgl3D.moveCamera(-0.1, 0, 0);
                        e.preventDefault();
                        break;
                    case 'ArrowRight':
                        this.webgl3D.moveCamera(0.1, 0, 0);
                        e.preventDefault();
                        break;
                }
            }
        });
    }
    
    switchVisualizationMode() {
        const isWebGL = this.visualizerType === 'webgl3d';
        const threeDControls = document.getElementById('threeDControls');
        
        if (isWebGL && this.webgl3D) {
            this.canvas.classList.add('opacity-0', 'pointer-events-none');
            this.webglCanvas.classList.remove('opacity-0', 'pointer-events-none');
            this.webglCanvas.style.cursor = 'grab';
            threeDControls.classList.remove('opacity-0');
        } else {
            this.canvas.classList.remove('opacity-0', 'pointer-events-none');
            this.webglCanvas.classList.add('opacity-0', 'pointer-events-none');
            if (this.webglCanvas) {
                this.webglCanvas.style.cursor = 'default';
            }
            threeDControls.classList.add('opacity-0');
            
            // If WebGL 3D was selected but not available, fallback to 3D
            if (isWebGL && !this.webgl3D) {
                document.getElementById('visualizerType').value = '3d';
                this.visualizerType = '3d';
            }
        }
    }
    
    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        this.loadAudioFile(file);
    }
    
    async loadAudioFile(file) {
        this.stopMicrophone();
        
        document.getElementById('songInfo').textContent = `♪ ${file.name}`;
        
        if (this.audio) {
            this.audio.pause();
            this.audio = null;
        }
        
        this.audio = new Audio();
        this.audio.src = URL.createObjectURL(file);
        this.audio.volume = this.volume;
        
        // Audio event listeners
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.onAudioEnd());
        this.audio.addEventListener('loadedmetadata', () => this.onAudioLoaded());
        
        await this.setupAudioContext();
        this.source = this.audioContext.createMediaElementSource(this.audio);
        this.source.connect(this.gainNode);
        this.gainNode.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        
        this.audio.play();
        this.isPlaying = true;
        this.updatePlayButton();
        this.animate();
    }
    
    onAudioLoaded() {
        // Audio is loaded and ready
    }
    
    onAudioEnd() {
        this.isPlaying = false;
        this.updatePlayButton();
    }
    
    updateProgress() {
        if (!this.audio) return;
        
        const progress = (this.audio.currentTime / this.audio.duration) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
        
        const currentTime = this.formatTime(this.audio.currentTime);
        const totalTime = this.formatTime(this.audio.duration);
        document.getElementById('timeDisplay').textContent = `${currentTime} / ${totalTime}`;
    }
    
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    seekTo(event) {
        if (!this.audio) return;
        
        const progressBar = document.getElementById('progressBar');
        const rect = progressBar.getBoundingClientRect();
        const clickPosition = (event.clientX - rect.left) / rect.width;
        
        this.audio.currentTime = clickPosition * this.audio.duration;
    }
    
    togglePlayPause() {
        if (!this.audio) return;
        
        if (this.isPlaying) {
            this.audio.pause();
            this.isPlaying = false;
        } else {
            this.audio.play();
            this.isPlaying = true;
            if (!this.animationId) this.animate();
        }
        
        this.updatePlayButton();
    }
    
    updatePlayButton() {
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    const btn = document.getElementById('playPauseBtn');

    if (this.isPlaying) {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
        btn.classList.add('bg-green-500/60', 'border-green-500/80');
    } else {
        pauseIcon.classList.add('hidden');
        playIcon.classList.remove('hidden');
        btn.classList.remove('bg-green-500/60', 'border-green-500/80');
    }
}

    
    setVolume(volume) {
        this.volume = volume;
        if (this.audio) {
            this.audio.volume = volume;
        }
        if (this.gainNode) {
            this.gainNode.gain.value = volume;
        }
    }
    
    async toggleMicrophone() {
        if (this.isMicActive) {
            this.stopMicrophone();
        } else {
            await this.startMicrophone();
        }
    }
    
    async startMicrophone() {
        try {
            if (this.audio) {
                this.audio.pause();
                this.audio = null;
            }
            
            this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            await this.setupAudioContext();
            this.source = this.audioContext.createMediaStreamSource(this.micStream);
            this.source.connect(this.analyser);
            
            this.isMicActive = true;
            const micBtn = document.getElementById('micBtn');
            micBtn.classList.add('bg-red-500/60', 'border-red-500/80');
            micBtn.textContent = '🎤 Stop';
            document.getElementById('songInfo').textContent = '🎤 Live Microphone';
            
            this.isPlaying = true;
            this.animate();
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    }
    
    stopMicrophone() {
        if (this.micStream) {
            this.micStream.getTracks().forEach(track => track.stop());
            this.micStream = null;
        }
        
        this.isMicActive = false;
        const micBtn = document.getElementById('micBtn');
        micBtn.classList.remove('bg-red-500/60', 'border-red-500/80');
        micBtn.textContent = '🎤 Mic';
        document.getElementById('songInfo').textContent = '';
        
        if (this.animationId && !this.audio) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
            this.isPlaying = false;
        }
    }
    
    async setupAudioContext() {
        if (this.audioContext) {
            await this.audioContext.close();
        }
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.8;
        
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = this.volume;
        
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.timeDataArray = new Uint8Array(this.analyser.fftSize);
    }
    
    initParticles() {
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push(this.createParticle());
        }
    }
    
    createParticle(x, y, isNew = false) {
        return {
            x: x || Math.random() * (this.canvas?.width || 800),
            y: y || Math.random() * (this.canvas?.height || 600),
            vx: (Math.random() - 0.5) * (isNew ? 15 : 2),
            vy: (Math.random() - 0.5) * (isNew ? 15 : 2),
            size: Math.random() * 4 + 1,
            life: isNew ? 1 : Math.random(),
            decay: Math.random() * 0.015 + 0.005,
            color: Math.floor(Math.random() * 4), // Index for theme colors
            shape: Math.floor(Math.random() * 3), // 0: circle, 1: star, 2: triangle
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2,
            gravity: this.settings.gravity,
            bounce: 0.8,
            trail: [] // For particle trails
        };
    }
    
    detectBeat() {
        if (!this.dataArray) return false;
        
        // Calculate average amplitude for beat detection
        let sum = 0;
        for (let i = 0; i < 30; i++) { // Focus on bass frequencies
            sum += this.dataArray[i];
        }
        const average = sum / 30;
        
        const now = Date.now();
        
        if (average > this.beatThreshold * 255 && (now - this.beatTime) > 300) {
            this.beatTime = now;
            
            // Update beat indicator with Tailwind classes
            const indicator = document.getElementById('beatIndicator');
            indicator.classList.remove('bg-white/30');
            indicator.classList.add('bg-red-500', 'animate-beat', 'shadow-lg', 'shadow-red-500/50');
            
            setTimeout(() => {
                indicator.classList.add('bg-white/30');
                indicator.classList.remove('bg-red-500', 'animate-beat', 'shadow-lg', 'shadow-red-500/50');
            }, 150);
            
            return true;
        }
        
        return false;
    }
    
    animate() {
        if (!this.isPlaying && !this.isMicActive) return;
        
        this.animationId = requestAnimationFrame(() => this.animate());
        
        if (this.analyser) {
            this.analyser.getByteFrequencyData(this.dataArray);
            this.analyser.getByteTimeDomainData(this.timeDataArray);
        }
        
        this.clearCanvas();
        this.detectBeat();
        this.processAudioForAI(); // AI processing
        
        switch (this.visualizerType) {
            case 'bars':
                this.drawBars();
                break;
            case 'circle':
                this.drawCircle();
                break;
            case 'wave':
                this.drawWave();
                break;
            case 'particles':
                this.drawParticles();
                break;
            case '3d':
                this.draw3D();
                break;
        }
    }
    
    clearCanvas() {
        this.ctx.fillStyle = `rgba(0, 0, 0, ${this.settings.backgroundFade})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    getThemeColors() {
        switch (this.theme) {
            case 'neon':
                return ['#ff0080', '#00ff80', '#8000ff', '#ff8000'];
            case 'sunset':
                return ['#ff6b6b', '#ffa500', '#ff4757', '#ff7675'];
            case 'forest':
                return ['#11998e', '#38ef7d', '#2ed573', '#7bed9f'];
            default: // ocean
                return ['#667eea', '#764ba2', '#5b7ff5', '#9c88ff'];
        }
    }
    
    drawBars() {
        const colors = this.getThemeColors();
        const barWidth = this.canvas.width / this.dataArray.length * 2.5;
        let x = 0;
        
        for (let i = 0; i < this.dataArray.length; i++) {
            const barHeight = (this.dataArray[i] / 255) * this.canvas.height * 0.8;
            
            const colorIndex = Math.floor((i / this.dataArray.length) * colors.length);
            this.ctx.fillStyle = colors[colorIndex];
            
            // Add glow effect
            this.ctx.shadowColor = colors[colorIndex];
            this.ctx.shadowBlur = 10;
            
            this.ctx.fillRect(x, this.canvas.height - barHeight, barWidth - 2, barHeight);
            x += barWidth;
        }
        
        this.ctx.shadowBlur = 0;
    }
    
    drawCircle() {
        const colors = this.getThemeColors();
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.6;
        
        this.ctx.lineWidth = 3;
        
        for (let i = 0; i < this.dataArray.length; i++) {
            const angle = (i / this.dataArray.length) * Math.PI * 2;
            const amplitude = (this.dataArray[i] / 255) * 100;
            
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + amplitude);
            const y2 = centerY + Math.sin(angle) * (radius + amplitude);
            
            const colorIndex = Math.floor((i / this.dataArray.length) * colors.length);
            this.ctx.strokeStyle = colors[colorIndex];
            
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }
    }
    
    drawWave() {
        const colors = this.getThemeColors();
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = colors[0];
        this.ctx.beginPath();
        
        const sliceWidth = this.canvas.width / this.timeDataArray.length;
        let x = 0;
        
        for (let i = 0; i < this.timeDataArray.length; i++) {
            const v = this.timeDataArray[i] / 128.0;
            const y = v * this.canvas.height / 2;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        this.ctx.stroke();
    }
    
    drawParticles() {
        const colors = this.getThemeColors();
        
        // Calculate audio data for different frequency ranges
        let bassSum = 0, midSum = 0, trebleSum = 0;
        const third = Math.floor(this.dataArray.length / 3);
        
        for (let i = 0; i < third; i++) bassSum += this.dataArray[i] || 0;
        for (let i = third; i < third * 2; i++) midSum += this.dataArray[i] || 0;
        for (let i = third * 2; i < this.dataArray.length; i++) trebleSum += this.dataArray[i] || 0;
        
        const bassLevel = bassSum / third / 255;
        const midLevel = midSum / third / 255;
        const trebleLevel = trebleSum / third / 255;
        
        // Emit new particles on beat with variety
        if (this.detectBeat() && this.particles.length < this.settings.particleCount) {
            const burstCount = Math.floor(bassLevel * 10 * this.settings.sensitivity) + 3;
            for (let i = 0; i < burstCount; i++) {
                // Create particles from center and edges
                const isCenter = Math.random() > 0.3;
                const x = isCenter ? this.canvas.width / 2 : Math.random() * this.canvas.width;
                const y = isCenter ? this.canvas.height / 2 : Math.random() * this.canvas.height;
                
                this.particles.push(this.createParticle(x, y, true));
            }
        }
        
        // Add mouse attraction particles
        if (this.mouseX && this.mouseY && Math.random() > 0.7) {
            this.particles.push(this.createParticle(this.mouseX, this.mouseY, true));
        }
        
        // Update and draw particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update trail
            if (this.settings.showTrails) {
                particle.trail.push({ x: particle.x, y: particle.y, life: 0.5 });
                if (particle.trail.length > this.settings.trailLength) particle.trail.shift();
            }
            
            // Physics updates
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += this.settings.gravity; // Gravity effect
            particle.life -= particle.decay;
            particle.rotation += particle.rotationSpeed;
            
            // Mouse attraction
            if (this.mouseX && this.mouseY) {
                const dx = this.mouseX - particle.x;
                const dy = this.mouseY - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 100) {
                    const force = (100 - distance) / 100 * this.settings.mouseAttraction;
                    particle.vx += (dx / distance) * force;
                    particle.vy += (dy / distance) * force;
                }
            }
            
            // Boundary collisions with bounce
            if (particle.x <= 0 || particle.x >= this.canvas.width) {
                particle.vx *= -particle.bounce;
                particle.x = Math.max(0, Math.min(this.canvas.width, particle.x));
            }
            if (particle.y <= 0 || particle.y >= this.canvas.height) {
                particle.vy *= -particle.bounce;
                particle.y = Math.max(0, Math.min(this.canvas.height, particle.y));
            }
            
            // Audio influence on size and movement
            const sensitivity = this.settings.sensitivity;
            switch (particle.shape) {
                case 0: // Circles respond to bass
                    particle.size += bassLevel * 3 * sensitivity;
                    break;
                case 1: // Stars respond to mid
                    particle.size += midLevel * 2 * sensitivity;
                    break;
                case 2: // Triangles respond to treble
                    particle.size += trebleLevel * 4 * sensitivity;
                    break;
            }
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            
            // Draw particle trail
            if (this.settings.showTrails) {
                this.drawParticleTrail(particle, colors);
            }
            
            // Draw main particle
            this.ctx.save();
            this.ctx.globalAlpha = particle.life;
            this.ctx.translate(particle.x, particle.y);
            this.ctx.rotate(particle.rotation);
            
            const color = colors[particle.color % colors.length];
            this.ctx.fillStyle = color;
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = this.settings.glowIntensity;
            
            this.drawParticleShape(particle);
            
            this.ctx.restore();
        }
        
        this.ctx.globalAlpha = 1;
        this.ctx.shadowBlur = 0;
    }
    
    drawParticleTrail(particle, colors) {
        if (particle.trail.length < 2) return;
        
        this.ctx.save();
        this.ctx.strokeStyle = colors[particle.color % colors.length];
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.3;
        
        this.ctx.beginPath();
        this.ctx.moveTo(particle.trail[0].x, particle.trail[0].y);
        
        for (let i = 1; i < particle.trail.length; i++) {
            this.ctx.lineTo(particle.trail[i].x, particle.trail[i].y);
        }
        
        this.ctx.stroke();
        this.ctx.restore();
        
        // Fade trail points
        for (let i = 0; i < particle.trail.length; i++) {
            particle.trail[i].life -= 0.1;
        }
        particle.trail = particle.trail.filter(point => point.life > 0);
    }
    
    drawParticleShape(particle) {
        const size = particle.size;
        
        switch (particle.shape) {
            case 0: // Circle
                this.ctx.beginPath();
                this.ctx.arc(0, 0, size, 0, Math.PI * 2);
                this.ctx.fill();
                break;
                
            case 1: // Star
                this.drawStar(0, 0, 5, size, size * 0.5);
                break;
                
            case 2: // Triangle
                this.ctx.beginPath();
                this.ctx.moveTo(0, -size);
                this.ctx.lineTo(-size * 0.8, size * 0.6);
                this.ctx.lineTo(size * 0.8, size * 0.6);
                this.ctx.closePath();
                this.ctx.fill();
                break;
        }
    }
    
    drawStar(x, y, points, outerRadius, innerRadius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - outerRadius);
        
        for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / points;
            const dx = Math.sin(angle) * radius;
            const dy = -Math.cos(angle) * radius;
            this.ctx.lineTo(x + dx, y + dy);
        }
        
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    draw3D() {
        const colors = this.getThemeColors();
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.rotation += 0.02;
        
        // Create 3D-like effect with multiple layers
        for (let layer = 0; layer < 3; layer++) {
            const layerRadius = 50 + layer * 40;
            const layerAlpha = 1 - layer * 0.3;
            
            this.ctx.globalAlpha = layerAlpha;
            
            for (let i = 0; i < this.dataArray.length; i += 2) {
                const angle = (i / this.dataArray.length) * Math.PI * 2 + this.rotation + layer * 0.5;
                const amplitude = (this.dataArray[i] / 255) * 100;
                
                // Calculate 3D positions
                const x = centerX + Math.cos(angle) * (layerRadius + amplitude);
                const y = centerY + Math.sin(angle) * (layerRadius + amplitude) * 0.5; // Flatten for 3D effect
                
                const size = amplitude * 0.3 + 2;
                
                // Color based on layer and frequency
                const colorIndex = (layer + Math.floor(i / this.dataArray.length * colors.length)) % colors.length;
                this.ctx.fillStyle = colors[colorIndex];
                
                // Add perspective shadow
                this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
                this.ctx.shadowOffsetX = layer * 2;
                this.ctx.shadowOffsetY = layer * 2;
                this.ctx.shadowBlur = 5;
                
                this.ctx.beginPath();
                this.ctx.arc(x, y, size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        this.ctx.globalAlpha = 1;
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.shadowBlur = 0;
    }
}

// ==================== AI BEAT PREDICTOR CLASS ====================

class AIBeatPredictor {
    constructor() {
        this.model = null;
        this.isTraining = false;
        this.trainingData = [];
        this.sequenceLength = 10; // Number of audio frames to analyze
        this.featureSize = 6; // Number of features per frame
    }
    
    async initialize() {
        try {
            // Create a simple neural network for beat prediction
            this.model = tf.sequential({
                layers: [
                    tf.layers.dense({
                        inputShape: [this.sequenceLength * this.featureSize],
                        units: 64,
                        activation: 'relu'
                    }),
                    tf.layers.dropout({ rate: 0.3 }),
                    tf.layers.dense({
                        units: 32,
                        activation: 'relu'
                    }),
                    tf.layers.dropout({ rate: 0.2 }),
                    tf.layers.dense({
                        units: 16,
                        activation: 'relu'
                    }),
                    tf.layers.dense({
                        units: 2, // [beat_probability, time_to_next_beat]
                        activation: 'sigmoid'
                    })
                ]
            });
            
            this.model.compile({
                optimizer: tf.train.adam(0.001),
                loss: 'meanSquaredError',
                metrics: ['accuracy']
            });
            
            console.log('AI Beat Predictor model created');
            
            // Initialize with some basic patterns
            await this.pretrainWithBasicPatterns();
            
        } catch (error) {
            console.error('AI model initialization failed:', error);
            throw error;
        }
    }
    
    async pretrainWithBasicPatterns() {
        // Skip pretraining to speed up initialization
        console.log('AI model created (pretraining skipped for faster loading)');
        return;
        
        // Original pretraining code commented out for speed
        /*
        const syntheticData = this.generateSyntheticBeatData(50); // Reduced from 100
        
        const xs = tf.tensor2d(syntheticData.inputs);
        const ys = tf.tensor2d(syntheticData.outputs);
        
        try {
            await this.model.fit(xs, ys, {
                epochs: 5, // Reduced from 20
                batchSize: 10,
                verbose: 0
            });
            
            console.log('AI model pretrained with synthetic data');
        } catch (error) {
            console.error('Pretraining failed:', error);
        } finally {
            xs.dispose();
            ys.dispose();
        }
        */
    }
    
    generateSyntheticBeatData(samples) {
        const inputs = [];
        const outputs = [];
        
        for (let i = 0; i < samples; i++) {
            const sequence = [];
            let beatPattern = Math.random() > 0.5; // Random beat pattern
            let timeToNextBeat = Math.random() * 2; // 0-2 seconds
            
            // Generate sequence of audio features
            for (let j = 0; j < this.sequenceLength; j++) {
                const frame = [];
                
                // Simulate audio features based on beat pattern
                const beatInfluence = beatPattern ? Math.sin(j * Math.PI / 4) : Math.random() * 0.3;
                
                frame.push(beatInfluence * 0.8 + Math.random() * 0.2); // bass
                frame.push(beatInfluence * 0.6 + Math.random() * 0.2); // mid  
                frame.push(beatInfluence * 0.4 + Math.random() * 0.2); // treble
                frame.push(Math.random()); // spectral centroid
                frame.push(Math.random()); // zero crossing rate
                frame.push(beatInfluence * 0.7 + Math.random() * 0.3); // energy
                
                sequence.push(...frame);
            }
            
            inputs.push(sequence);
            outputs.push([beatPattern ? 0.8 : 0.2, timeToNextBeat / 2]); // Normalize time
        }
        
        return { inputs, outputs };
    }
    
    async predict(audioFeatures, settings) {
        if (!this.model || audioFeatures.length < this.sequenceLength) {
            return { confidence: 0, timeToNextBeat: 0 };
        }
        
        try {
            // Prepare input sequence
            const sequence = [];
            const recentFeatures = audioFeatures.slice(-this.sequenceLength);
            
            recentFeatures.forEach(frame => {
                sequence.push(...frame.features);
            });
            
            // Pad sequence if needed
            while (sequence.length < this.sequenceLength * this.featureSize) {
                sequence.push(0);
            }
            
            const inputTensor = tf.tensor2d([sequence]);
            const prediction = this.model.predict(inputTensor);
            const predictionData = await prediction.data();
            
            const confidence = predictionData[0];
            const normalizedTime = predictionData[1];
            const timeToNextBeat = normalizedTime * 2 * settings.predictionWindow; // Denormalize
            
            inputTensor.dispose();
            prediction.dispose();
            
            return {
                confidence: Math.min(confidence, 1.0),
                timeToNextBeat: Math.max(timeToNextBeat, 0.1)
            };
            
        } catch (error) {
            console.error('Prediction failed:', error);
            return { confidence: 0, timeToNextBeat: 0 };
        }
    }
    
    async updateModel(audioFeatures, actualBeats, settings) {
        if (!this.model || this.isTraining) return;
        
        try {
            this.isTraining = true;
            
            // Prepare training data from recent audio features and beats
            const trainingInputs = [];
            const trainingOutputs = [];
            
            for (let i = this.sequenceLength; i < audioFeatures.length; i++) {
                const sequence = [];
                
                // Get sequence of features
                for (let j = i - this.sequenceLength; j < i; j++) {
                    sequence.push(...audioFeatures[j].features);
                }
                
                // Find if there was a beat in the prediction window
                const currentTime = audioFeatures[i].timestamp;
                const predictionWindowMs = settings.predictionWindow * 1000;
                
                const futureBeat = actualBeats.find(beat => 
                    beat.timestamp > currentTime && 
                    beat.timestamp < currentTime + predictionWindowMs
                );
                
                const hasBeat = futureBeat ? 0.8 : 0.2;
                const timeToNextBeat = futureBeat ? 
                    (futureBeat.timestamp - currentTime) / 1000 / 2 : // Normalize
                    settings.predictionWindow / 2;
                
                trainingInputs.push(sequence);
                trainingOutputs.push([hasBeat, timeToNextBeat]);
            }
            
            if (trainingInputs.length > 5) {
                const xs = tf.tensor2d(trainingInputs);
                const ys = tf.tensor2d(trainingOutputs);
                
                // Online learning with small batch
                await this.model.fit(xs, ys, {
                    epochs: 1,
                    batchSize: Math.min(5, trainingInputs.length),
                    verbose: 0
                });
                
                xs.dispose();
                ys.dispose();
                
                console.log('AI model updated with real data');
            }
            
        } catch (error) {
            console.error('Model update failed:', error);
        } finally {
            this.isTraining = false;
        }
    }
}

// Initialize the visualizer when the page loads
window.addEventListener('load', () => {
    new AdvancedMusicVisualizer();
});