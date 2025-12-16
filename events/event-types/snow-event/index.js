import { BaseEvent } from '../../BaseEvent.js';
import { UIAnimations } from '../../../modules/UIAnimations.js';

export default class SnowEvent extends BaseEvent {
    constructor() {
        super({
            name: 'snow-event',
            description: 'Красивый снегопад на странице',
            requiresAdmin: true,
            snowflakeCount: 100,
            speedMultiplier: 4,
            windStrength: 3,
            baseFallTime: 10,
            colors: ['#ffffff', '#e6f2ff', '#ccffff', '#ddeeff']
        });
        
        this.snowflakes = [];
        this.animationId = null;
        this.container = null;
        this.lastTime = 0;
        this.controlPanel = null;
        this.isActive = false;
        this.statsInterval = null;
        this.meltInterval = null;
        this.spawnTimer = null;
    }
    
    async activate(container, firebaseService) {
        console.log('❄️ Активация снежного ивента...');
        
        await super.activate(container, firebaseService);
        
        this.container = container;
        this.isActive = true;
        
        // Загружаем конфигурацию
        await this.loadConfig();
        
        // Добавляем стили
        this.addStyles();
        
        // Запускаем снегопад
        this.startSnow();
        
        console.log('❄️ Снежный ивент активирован с настройками:', this.config);
        return this;
    }
    
    async deactivate() {
        console.log('❄️ Деактивация снежного ивента...');
        
        this.isActive = false;
        
        // Останавливаем анимацию
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Останавливаем таймер спавна
        if (this.spawnTimer) {
            clearInterval(this.spawnTimer);
            this.spawnTimer = null;
        }
        
        // Останавливаем обновление статистики
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
        
        // Останавливаем таяние
        if (this.meltInterval) {
            clearInterval(this.meltInterval);
            this.meltInterval = null;
        }
        
        // Удаляем снежинки
        this.removeAllSnowflakes();
        
        // Удаляем стили
        this.removeStyles();
        
        this.snowflakes = [];
        this.container = null;
        this.controlPanel = null;
        this.lastTime = 0;
        
        await super.deactivate();
        
        console.log('❄️ Снежный ивент деактивирован');
        return this;
    }
    
    addStyles() {
        const styleId = 'snow-event-styles';
        
        // Удаляем старые стили если есть
        const oldStyle = document.getElementById(styleId);
        if (oldStyle) oldStyle.remove();
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .snowflake-event {
                position: absolute;
                background: white;
                border-radius: 50%;
                pointer-events: none;
                z-index: 9999;
                filter: blur(0.5px);
                box-shadow: 0 0 5px rgba(255, 255, 255, 0.7);
                transform-origin: center;
            }
            
            .snowflake-event.small {
                width: 3px;
                height: 3px;
            }
            
            .snowflake-event.medium {
                width: 5px;
                height: 5px;
            }
            
            .snowflake-event.large {
                width: 8px;
                height: 8px;
            }
            
            .snowflake-event.xlarge {
                width: 12px;
                height: 12px;
            }
        `;
        document.head.appendChild(style);
    }
    
    removeStyles() {
        const styleId = 'snow-event-styles';
        const style = document.getElementById(styleId);
        if (style) {
            style.remove();
        }
    }
    
    startSnow() {
        console.log('❄️ Запуск снегопада...');
        
        // Очищаем старые снежинки
        this.removeAllSnowflakes();
        
        // Создаем начальные снежинки равномерно распределенные
        this.createInitialSnowflakes();
        
        // Запускаем непрерывное добавление новых снежинок
        this.startContinuousSpawning();
        
        // Запускаем анимацию
        this.lastTime = performance.now();
        this.animateSnow();
        
        console.log(`❄️ Снегопад запущен`);
    }
    
    createInitialSnowflakes() {
        const count = this.config.snowflakeCount || 100;
        
        if (!this.container) {
            console.error('❌ Контейнер не найден для создания снежинок');
            return;
        }
        
        // Равномерно распределяем снежинки по высоте экрана
        for (let i = 0; i < count; i++) {
            const progress = i / count; // от 0 до 1
            this.createSnowflake(progress * -window.innerHeight);
        }
        
        console.log(`❄️ Создано ${count} снежинок равномерно распределенных`);
    }
    
    startContinuousSpawning() {
        if (this.spawnTimer) {
            clearInterval(this.spawnTimer);
        }
        
        // Рассчитываем интервал спавна для непрерывного снега
        const baseFallTime = this.config.baseFallTime || 10;
        const speedMultiplier = this.config.speedMultiplier || 4;
        const fallTime = baseFallTime / speedMultiplier;
        const spawnInterval = (fallTime * 1000) / (this.config.snowflakeCount || 100);
        
        // Создаем новые снежинки постоянно
        this.spawnTimer = setInterval(() => {
            if (this.isActive && this.snowflakes.length < (this.config.snowflakeCount || 100) * 1.5) {
                this.createSnowflake(-50); // Начинаем чуть выше экрана
            }
        }, Math.max(50, spawnInterval)); // Минимум 50мс между спавнами
    }
    
    createSnowflake(startYOffset = -50) {
        if (!this.container) {
            console.error('❌ Контейнер не найден');
            return null;
        }
        
        const flake = document.createElement('div');
        const sizeType = Math.random();
        let sizeClass = 'small';
        let sizeValue = 3;
        
        if (sizeType < 0.3) {
            sizeClass = 'small';
            sizeValue = 3;
        } else if (sizeType < 0.6) {
            sizeClass = 'medium';
            sizeValue = 5;
        } else if (sizeType < 0.9) {
            sizeClass = 'large';
            sizeValue = 8;
        } else {
            sizeClass = 'xlarge';
            sizeValue = 12;
        }
        
        // Случайный цвет
        const colorIndex = Math.floor(Math.random() * this.config.colors.length);
        const color = this.config.colors[colorIndex];
        
        // Начальная позиция
        const startX = Math.random() * window.innerWidth;
        const startY = startYOffset + (Math.random() * -50); // Случайное смещение
        
        // Расчет скорости
        const baseFallTime = this.config.baseFallTime || 10;
        const speedMultiplier = this.config.speedMultiplier || 4;
        const fallTime = baseFallTime / speedMultiplier;
        
        // Размер влияет на скорость
        const sizeFactor = sizeValue / 12;
        const adjustedFallTime = fallTime * (1.5 - sizeFactor * 0.5);
        
        // Скорость в пикселях в секунду
        const speed = (window.innerHeight + 200) / adjustedFallTime;
        
        // Ветер
        const windStrength = this.config.windStrength || 3;
        const driftDirection = Math.random() > 0.5 ? 1 : -1;
        const drift = (Math.random() * 0.5 + 0.5) * windStrength * driftDirection * 0.4;
        
        // Колебания
        const sway = Math.random() * Math.PI * 2;
        const swaySpeed = 0.5 + Math.random() * 1;
        
        // Вращение
        const rotationSpeed = (Math.random() * 0.5 + 0.5) * (sizeValue / 12);
        
        flake.className = `snowflake-event ${sizeClass}`;
        flake.style.cssText = `
            left: ${startX}px;
            top: ${startY}px;
            background: ${color};
            opacity: ${0.6 + Math.random() * 0.4};
        `;
        
        this.container.appendChild(flake);
        
        const snowflakeData = {
            element: flake,
            x: startX,
            y: startY,
            speed: speed,
            drift: drift,
            size: sizeValue,
            sway: sway,
            swaySpeed: swaySpeed,
            rotationSpeed: rotationSpeed,
            color: color,
            rotation: Math.random() * 360
        };
        
        this.snowflakes.push(snowflakeData);
        return snowflakeData;
    }
    
    animateSnow() {
        if (!this.isActive || !this.container) {
            return;
        }
        
        const animate = (currentTime) => {
            if (!this.isActive || !this.container) {
                return;
            }
            
            // Вычисляем дельту времени
            if (!this.lastTime) this.lastTime = currentTime;
            const deltaTime = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;
            
            // Ограничиваем дельту
            const safeDelta = Math.min(deltaTime, 0.1);
            
            // Обновляем позиции всех снежинок
            for (let i = this.snowflakes.length - 1; i >= 0; i--) {
                const flake = this.snowflakes[i];
                
                if (!flake.element || !flake.element.parentNode) {
                    this.snowflakes.splice(i, 1);
                    continue;
                }
                
                // Движение вниз
                flake.y += flake.speed * safeDelta;
                
                // Горизонтальный дрейф от ветра
                const windEffect = flake.drift * safeDelta * 40;
                flake.x += windEffect;
                
                // Легкие колебания
                const swayEffect = Math.sin(currentTime / 1000 * flake.swaySpeed + flake.sway) * 0.8;
                flake.x += swayEffect;
                
                // Вращение
                flake.rotation += flake.rotationSpeed * safeDelta * 120;
                
                // Если снежинка упала за экран, пересоздаем
                if (flake.y > window.innerHeight + 50) {
                    this.recycleSnowflake(flake);
                }
                
                // Телепортация по горизонтали если улетела за экран
                if (flake.x > window.innerWidth + 100) {
                    flake.x = -100;
                } else if (flake.x < -100) {
                    flake.x = window.innerWidth + 100;
                }
                
                // Применяем трансформацию
                flake.element.style.transform = `translate(${flake.x}px, ${flake.y}px) rotate(${flake.rotation}deg)`;
                
                // Плавное изменение прозрачности
                const twinkle = Math.sin(currentTime / 1000 * 2 + flake.sway) * 0.15 + 0.85;
                flake.element.style.opacity = Math.max(0.4, Math.min(1, twinkle));
            }
            
            this.animationId = requestAnimationFrame(animate);
        };
        
        this.animationId = requestAnimationFrame(animate);
    }
    
    recycleSnowflake(flake) {
        // Случайное положение сверху
        flake.y = Math.random() * -100 - 50;
        flake.x = Math.random() * window.innerWidth;
        
        // Обновляем скорость по текущим настройкам
        this.updateSnowflakeSpeed(flake);
        
        // Обновляем ветер
        const windStrength = this.config.windStrength || 3;
        const driftDirection = Math.random() > 0.5 ? 1 : -1;
        flake.drift = (Math.random() * 0.5 + 0.5) * windStrength * driftDirection * 0.4;
        
        // Обновляем колебания
        flake.sway = Math.random() * Math.PI * 2;
    }
    
    updateSnowflakeSpeed(flake) {
        const baseFallTime = this.config.baseFallTime || 10;
        const speedMultiplier = this.config.speedMultiplier || 4;
        const fallTime = baseFallTime / speedMultiplier;
        const sizeFactor = flake.size / 12;
        const adjustedFallTime = fallTime * (1.5 - sizeFactor * 0.5);
        flake.speed = (window.innerHeight + 200) / adjustedFallTime;
    }
    
    removeAllSnowflakes() {
        this.snowflakes.forEach(flake => {
            if (flake.element && flake.element.parentNode) {
                flake.element.remove();
            }
        });
        this.snowflakes = [];
    }
    
    // === МЕТОД ДЛЯ ПАНЕЛИ УПРАВЛЕНИЯ ===
    
    setupControls(controlPanel) {
        console.log('⚙️ Настройка контролов снежного ивента');
        
        this.controlPanel = controlPanel;
        
        // Обновляем значения на слайдерах
        this.updateSliderValues();
        
        // Настраиваем обработчики событий
        this.setupEventListeners();
        
        // Запускаем обновление статистики
        this.startStatsUpdate();
    }
    
    updateSliderValues() {
        if (!this.controlPanel) {
            console.warn('❌ Нет controlPanel для обновления слайдеров');
            return;
        }
        
        console.log('🔄 Обновление значений слайдеров:', this.config);
        
        const densitySlider = this.controlPanel.querySelector('#snow-density');
        const speedSlider = this.controlPanel.querySelector('#snow-speed');
        const windSlider = this.controlPanel.querySelector('#wind-strength');
        
        if (densitySlider) {
            densitySlider.value = this.config.snowflakeCount || 100;
            this.updateDisplayValue('snow-display', densitySlider.value);
        }
        
        if (speedSlider) {
            speedSlider.value = this.config.speedMultiplier || 4;
            this.updateDisplayValue('speed-display', speedSlider.value);
        }
        
        if (windSlider) {
            windSlider.value = this.config.windStrength || 3;
            this.updateDisplayValue('wind-display', windSlider.value);
        }
    }
    
    updateDisplayValue(elementId, value) {
        const element = this.controlPanel.querySelector(`#${elementId}`);
        if (element) {
            element.textContent = value;
        }
    }
    
    setupEventListeners() {
        if (!this.controlPanel) {
            console.warn('❌ Нет controlPanel для настройки обработчиков');
            return;
        }
        
        console.log('🎮 Настройка обработчиков событий');
        
        // Слайдер плотности
        const densitySlider = this.controlPanel.querySelector('#snow-density');
        if (densitySlider) {
            densitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                console.log('🌨️ Изменение плотности:', value);
                this.updateDisplayValue('snow-display', value);
                this.updateSnowDensity(value);
            });
        }
        
        // Слайдер скорости
        const speedSlider = this.controlPanel.querySelector('#snow-speed');
        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                console.log('⚡ Изменение скорости:', value);
                this.updateDisplayValue('speed-display', value);
                this.updateSnowSpeed(value);
                
                // Обновляем интервал спавна при изменении скорости
                if (this.spawnTimer) {
                    clearInterval(this.spawnTimer);
                    this.startContinuousSpawning();
                }
            });
        }
        
        // Слайдер ветра
        const windSlider = this.controlPanel.querySelector('#wind-strength');
        if (windSlider) {
            windSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                console.log('💨 Изменение ветра:', value);
                this.updateDisplayValue('wind-display', value);
                this.updateWind(value);
            });
        }
        
        // Кнопка бури
        const stormBtn = this.controlPanel.querySelector('#btn-storm');
        if (stormBtn) {
            stormBtn.addEventListener('click', () => {
                console.log('🌪️ Кнопка бури нажата');
                this.startStorm();
            });
        }
        
        // Кнопка сброса
        const resetBtn = this.controlPanel.querySelector('#btn-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                console.log('🔄 Кнопка сброса нажата');
                this.reset();
            });
        }
        
        // Кнопка таяния
        const meltBtn = this.controlPanel.querySelector('#btn-melt');
        if (meltBtn) {
            meltBtn.addEventListener('click', () => {
                console.log('☀️ Кнопка таяния нажата');
                this.meltSnow();
            });
        }
    }
    
    startStatsUpdate() {
        // Останавливаем предыдущий интервал
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }
        
        // Обновляем статистику каждую секунду
        this.statsInterval = setInterval(() => {
            this.updateStatsDisplay();
        }, 1000);
        
        // Первое обновление
        this.updateStatsDisplay();
    }
    
    updateStatsDisplay() {
        if (!this.controlPanel) return;
        
        const countElement = this.controlPanel.querySelector('#current-snowflake-count');
        const speedElement = this.controlPanel.querySelector('#current-speed-value');
        const windElement = this.controlPanel.querySelector('#current-wind-value');
        
        if (countElement) {
            countElement.textContent = this.snowflakes.length;
        }
        
        if (speedElement) {
            speedElement.textContent = `${this.config.speedMultiplier}x`;
        }
        
        if (windElement) {
            windElement.textContent = this.config.windStrength;
        }
    }
    
    updateSnowDensity(count) {
        const newCount = parseInt(count);
        const currentCount = this.snowflakes.length;
        
        if (newCount === currentCount) return;
        
        console.log(`🌨️ Изменение плотности: ${currentCount} → ${newCount}`);
        
        if (newCount < currentCount) {
            // Удаляем лишние снежинки
            const toRemove = this.snowflakes.splice(newCount);
            toRemove.forEach(flake => {
                if (flake.element && flake.element.parentNode) {
                    flake.element.remove();
                }
            });
        } else if (newCount > currentCount) {
            // Добавляем новые снежинки
            const toAdd = newCount - currentCount;
            for (let i = 0; i < toAdd; i++) {
                this.createSnowflake(Math.random() * -window.innerHeight);
            }
        }
        
        this.config.snowflakeCount = newCount;
        this.saveConfig();
        
        // Обновляем интервал спавна
        if (this.spawnTimer) {
            clearInterval(this.spawnTimer);
            this.startContinuousSpawning();
        }
        
        console.log(`✅ Плотность обновлена: ${newCount} снежинок`);
    }
    
    updateSnowSpeed(multiplier) {
        const newMultiplier = parseFloat(multiplier);
        console.log(`⚡ Изменение скорости: ${this.config.speedMultiplier} → ${newMultiplier}`);
        
        this.config.speedMultiplier = newMultiplier;
        
        // Обновляем скорость всех существующих снежинок
        this.snowflakes.forEach(flake => {
            this.updateSnowflakeSpeed(flake);
        });
        
        this.saveConfig();
        console.log(`✅ Скорость обновлена: ${newMultiplier}x`);
    }
    
    updateWind(strength) {
        const newStrength = parseInt(strength);
        console.log(`💨 Изменение ветра: ${this.config.windStrength} → ${newStrength}`);
        
        this.config.windStrength = newStrength;
        
        // Обновляем дрейф существующих снежинок
        this.snowflakes.forEach(flake => {
            const driftDirection = flake.drift > 0 ? 1 : -1;
            const newDrift = (Math.random() * 0.5 + 0.5) * newStrength * driftDirection * 0.4;
            flake.drift = newDrift;
        });
        
        this.saveConfig();
        console.log(`✅ Ветер обновлен: ${newStrength}`);
    }
    
    startStorm() {
        console.log('🌪️ Запуск снежной бури!');
        
        // Сохраняем старые настройки
        const oldConfig = { ...this.config };
        
        // Устанавливаем настройки бури
        this.config.snowflakeCount = 300;
        this.config.speedMultiplier = 8;
        this.config.windStrength = 8;
        
        // Пересоздаем снежинки
        this.removeAllSnowflakes();
        this.createInitialSnowflakes();
        
        // Обновляем интервал спавна
        if (this.spawnTimer) {
            clearInterval(this.spawnTimer);
            this.startContinuousSpawning();
        }
        
        // Обновляем слайдеры
        this.updateSliderValues();
        
        // Сохраняем
        this.saveConfig();
        
        UIAnimations.showMessage('🌪️ Снежная буря началась!', 'warning');
        
        // Восстанавливаем через 10 секунд
        setTimeout(() => {
            console.log('🔄 Восстановление обычного снегопада...');
            this.config = { ...oldConfig };
            this.removeAllSnowflakes();
            this.createInitialSnowflakes();
            
            if (this.spawnTimer) {
                clearInterval(this.spawnTimer);
                this.startContinuousSpawning();
            }
            
            this.updateSliderValues();
            this.saveConfig();
            UIAnimations.showMessage('❄️ Снегопад восстановлен', 'info');
        }, 10000);
    }
    
    reset() {
        console.log('🔄 Сброс снегопада');
        
        // Восстанавливаем настройки по умолчанию
        this.config.snowflakeCount = 100;
        this.config.speedMultiplier = 4;
        this.config.windStrength = 3;
        
        // Пересоздаем снежинки
        this.removeAllSnowflakes();
        this.createInitialSnowflakes();
        
        // Обновляем интервал спавна
        if (this.spawnTimer) {
            clearInterval(this.spawnTimer);
            this.startContinuousSpawning();
        }
        
        // Обновляем слайдеры
        this.updateSliderValues();
        
        // Сохраняем
        this.saveConfig();
        
        console.log('✅ Снегопад сброшен');
        UIAnimations.showMessage('🔄 Снегопад сброшен к настройкам по умолчанию', 'info');
    }
    
    meltSnow() {
        console.log('☀️ Постепенное таяние снега');
        
        if (this.meltInterval) {
            clearInterval(this.meltInterval);
        }
        
        this.meltInterval = setInterval(() => {
            if (this.snowflakes.length === 0) {
                clearInterval(this.meltInterval);
                this.meltInterval = null;
                UIAnimations.showMessage('✅ Снег полностью растаял', 'success');
                return;
            }
            
            // Удаляем 10% снежинок
            const toRemove = Math.max(1, Math.floor(this.snowflakes.length * 0.1));
            for (let i = 0; i < toRemove; i++) {
                if (this.snowflakes.length > 0) {
                    const flake = this.snowflakes.pop();
                    if (flake.element && flake.element.parentNode) {
                        flake.element.remove();
                    }
                }
            }
            
            // Обновляем статистику
            this.updateStatsDisplay();
            
        }, 200);
        
        UIAnimations.showMessage('☀️ Снег начинает таять...', 'info');
    }
    
    async saveConfig() {
        try {
            if (this.firebase) {
                const configToSave = {
                    snowflakeCount: this.config.snowflakeCount,
                    speedMultiplier: this.config.speedMultiplier,
                    windStrength: this.config.windStrength,
                    lastUpdated: Date.now()
                };
                
                await this.firebase.setData(`events/config/${this.name}`, configToSave);
                console.log('💾 Конфигурация сохранена:', configToSave);
            }
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error);
        }
        return this;
    }
    
    async loadConfig() {
        try {
            if (this.firebase) {
                const saved = await this.firebase.getData(`events/config/${this.name}`);
                if (saved) {
                    console.log('📥 Загружена конфигурация:', saved);
                    this.config = { ...this.config, ...saved };
                }
            }
        } catch (error) {
            console.warn('⚠️ Не удалось загрузить конфигурацию:', error);
        }
        return this;
    }
}