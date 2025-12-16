import { FirebaseService } from '../modules/FirebaseService.js';
import { UIAnimations } from '../modules/UIAnimations.js';

export class EventManager {
    constructor(firebaseService) {
        this.firebase = firebaseService;
        this.events = new Map();
        this.currentEvent = null;
        this.eventContainer = null;
        this.controlPanel = null;
        this.isInitialized = false;
    }
    
    async initialize() {
        console.log('🎉 Инициализация менеджера ивентов');
        
        if (this.isInitialized) return this;
        
        try {
            // Создаем контейнер для ивентов
            this.eventContainer = document.createElement('div');
            this.eventContainer.id = 'event-container';
            this.eventContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 9999;
                overflow: hidden;
            `;
            document.body.appendChild(this.eventContainer);
            
            // Создаем панель управления
            this.createControlPanel();
            
            // Загружаем ивенты
            await this.loadAllEvents();
            
            // Восстанавливаем активный ивент
            await this.loadActiveEvent();
            
            this.isInitialized = true;
            console.log('✅ Менеджер ивентов инициализирован');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
        }
        
        return this;
    }
    
    createControlPanel() {
        this.controlPanel = document.createElement('div');
        this.controlPanel.id = 'event-control-panel';
        this.controlPanel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.95);
            background: rgba(0, 20, 40, 0.98);
            backdrop-filter: blur(30px);
            border-radius: 20px;
            padding: 30px;
            z-index: 10001;
            border: 3px solid rgba(128, 212, 255, 0.4);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
            max-width: 450px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            pointer-events: auto;
            color: white;
        `;
        
        document.body.appendChild(this.controlPanel);
        
        // Скрытие при клике на оверлей
        this.overlay = document.createElement('div');
        this.overlay.id = 'event-control-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(5px);
            z-index: 10000;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        `;
        
        this.overlay.addEventListener('click', () => {
            this.hideControlPanel();
        });
        
        document.body.appendChild(this.overlay);
    }
    
    async loadAllEvents() {
        try {
            console.log('📂 Загрузка доступных ивентов...');
            
            // Загружаем снежный ивент
            try {
                const { default: SnowEvent } = await import('./event-types/snow-event/index.js');
                this.registerEvent('snow-event', SnowEvent);
                console.log('✅ Снежный ивент загружен');
            } catch (error) {
                console.error('❌ Ошибка загрузки снежного ивента:', error);
            }
            
        } catch (error) {
            console.error('❌ Ошибка загрузки ивентов:', error);
        }
    }
    
    registerEvent(eventName, eventClass) {
        this.events.set(eventName, eventClass);
        console.log(`📝 Зарегистрирован ивент: ${eventName}`);
    }
    
    async activateEvent(eventName, userRole) {
        try {
            console.log(`🎯 Активация ивента: ${eventName}`);
            
            const EventClass = this.events.get(eventName);
            if (!EventClass) {
                throw new Error(`Ивент "${eventName}" не найден`);
            }
            
            const event = new EventClass();
            
            // Проверка прав
            if (event.requiresAdmin && userRole !== 'admin') {
                UIAnimations.showMessage('❌ Только администраторы могут активировать этот ивент', 'error');
                return false;
            }
            
            // Деактивируем текущий ивент если есть
            if (this.currentEvent) {
                await this.deactivateEvent();
            }
            
            // Активируем новый ивент
            const activatedEvent = await event.activate(this.eventContainer, this.firebase);
            if (!activatedEvent) {
                throw new Error(`Не удалось активировать ивент ${eventName}`);
            }
            
            this.currentEvent = activatedEvent;
            
            // Сохраняем в Firebase
            await this.firebase.setData('events/active', {
                name: eventName,
                activatedAt: Date.now(),
                activatedBy: userRole
            });
            
            // Показываем уведомление
            UIAnimations.showMessage(`✅ Ивент "${activatedEvent.name}" активирован`, 'success');
            console.log(`✅ Ивент ${eventName} активирован`);
            
            return true;
            
        } catch (error) {
            console.error(`❌ Ошибка активации ивента ${eventName}:`, error);
            UIAnimations.showMessage(`❌ Ошибка: ${error.message}`, 'error');
            return false;
        }
    }
    
    async deactivateEvent() {
        try {
            if (!this.currentEvent) return;
            
            const eventName = this.currentEvent.name;
            console.log(`🛑 Деактивация ивента: ${eventName}`);
            
            await this.currentEvent.deactivate();
            
            // Очищаем Firebase
            await this.firebase.setData('events/active', null);
            
            // Скрываем панель управления
            this.hideControlPanel();
            
            this.currentEvent = null;
            UIAnimations.showMessage(`❌ Ивент "${eventName}" деактивирован`, 'info');
            console.log(`✅ Ивент ${eventName} деактивирован`);
            
        } catch (error) {
            console.error('❌ Ошибка деактивации ивента:', error);
        }
    }
    
    async loadActiveEvent() {
        try {
            console.log('📥 Загрузка активного ивента...');
            
            const activeEventData = await this.firebase.getData('events/active');
            
            if (activeEventData && activeEventData.name) {
                console.log('📊 Найден активный ивент:', activeEventData);
                
                const EventClass = this.events.get(activeEventData.name);
                if (EventClass) {
                    const event = new EventClass();
                    
                    // Активируем ивент
                    const activatedEvent = await event.activate(this.eventContainer, this.firebase);
                    this.currentEvent = activatedEvent;
                    
                    console.log(`✅ Восстановлен активный ивент: ${activeEventData.name}`);
                }
            }
            
        } catch (error) {
            console.error('❌ Ошибка загрузки активного ивента:', error);
        }
    }
    
    async showEventControls(eventName = null) {
        const targetEventName = eventName || (this.currentEvent ? this.currentEvent.name : null);
        
        if (!targetEventName) {
            console.warn('⚠️ Нет активного ивента для показа контролов');
            return;
        }
        
        try {
            console.log(`🎛️ Загрузка контролов для: ${targetEventName}`);
            
            // Загружаем HTML
            const response = await fetch(`events/event-types/${targetEventName}/controls.html`);
            if (!response.ok) {
                throw new Error('HTML не найден');
            }
            
            const controlsHTML = await response.text();
            this.controlPanel.innerHTML = controlsHTML;
            
            // Добавляем стили
            this.addControlStyles();
            
            // Настраиваем базовые обработчики
            this.setupControlHandlers();
            
            // Передаем управление ивенту
            if (this.currentEvent && this.currentEvent.setupControls) {
                this.currentEvent.setupControls(this.controlPanel);
            }
            
            // Показываем панель
            this.showControlPanel();
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки контролов:`, error);
            this.showSimpleControls(targetEventName);
        }
    }
    
    showSimpleControls(eventName) {
        this.controlPanel.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <h3 style="color: #80d4ff; margin-bottom: 15px;">🎪 ${eventName}</h3>
                <p>Контролы не найдены для этого ивента</p>
                <button id="close-panel-btn" style="
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: white;
                    padding: 10px 20px;
                    border-radius: 8px;
                    margin-top: 20px;
                    cursor: pointer;
                ">Закрыть</button>
            </div>
        `;
        
        document.getElementById('close-panel-btn').addEventListener('click', () => {
            this.hideControlPanel();
        });
        
        this.showControlPanel();
    }
    
    addControlStyles() {
        const styleId = 'event-control-styles';
        let style = document.getElementById(styleId);
        
        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            document.head.appendChild(style);
        }
        
        style.textContent = `
            #event-control-panel h3 {
                color: #80d4ff;
                margin: 0 0 20px 0;
                font-size: 1.5rem;
                text-align: center;
            }
            
            #event-control-panel .close-btn {
                position: absolute;
                top: 15px;
                right: 15px;
                background: rgba(255,255,255,0.1);
                border: none;
                color: white;
                font-size: 1.8rem;
                width: 35px;
                height: 35px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                z-index: 1;
            }
            
            #event-control-panel .close-btn:hover {
                background: rgba(255,255,255,0.2);
                transform: rotate(90deg);
            }
            
            #event-control-panel input[type="range"] {
                width: 100%;
                height: 8px;
                border-radius: 4px;
                background: linear-gradient(to right, #1a3a5f, #2a5a8a);
                outline: none;
                -webkit-appearance: none;
                margin: 10px 0;
            }
            
            #event-control-panel input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 22px;
                height: 22px;
                border-radius: 50%;
                background: #80d4ff;
                border: 3px solid white;
                cursor: pointer;
                box-shadow: 0 0 10px rgba(128, 212, 255, 0.8);
            }
            
            #event-control-panel .btn {
                padding: 12px 20px;
                font-size: 1rem;
                font-weight: 600;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                width: 100%;
                margin: 8px 0;
            }
            
            #event-control-panel .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            }
        `;
    }
    
    setupControlHandlers() {
        // Кнопка закрытия
        const closeBtn = this.controlPanel.querySelector('#close-event-controls');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideControlPanel();
            });
        }
        
        // ESC для закрытия
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.hideControlPanel();
                document.removeEventListener('keydown', escHandler);
            }
        };
        
        document.addEventListener('keydown', escHandler);
        
        // Сохраняем обработчик для очистки
        this.currentEscHandler = escHandler;
    }
    
    showControlPanel() {
        if (!this.controlPanel || !this.overlay) return;
        
        this.controlPanel.style.opacity = '1';
        this.controlPanel.style.visibility = 'visible';
        this.controlPanel.style.transform = 'translate(-50%, -50%) scale(1)';
        
        this.overlay.style.opacity = '1';
        this.overlay.style.visibility = 'visible';
        
        // Блокируем прокрутку фона
        document.body.style.overflow = 'hidden';
        
        console.log('📋 Панель управления показана');
    }
    
    hideControlPanel() {
        if (!this.controlPanel || !this.overlay) return;
        
        this.controlPanel.style.opacity = '0';
        this.controlPanel.style.visibility = 'hidden';
        this.controlPanel.style.transform = 'translate(-50%, -50%) scale(0.95)';
        
        this.overlay.style.opacity = '0';
        this.overlay.style.visibility = 'hidden';
        
        // Разблокируем прокрутку
        document.body.style.overflow = '';
        
        // Удаляем обработчик ESC
        if (this.currentEscHandler) {
            document.removeEventListener('keydown', this.currentEscHandler);
            this.currentEscHandler = null;
        }
        
        console.log('📋 Панель управления скрыта');
    }
    
    getActiveEvent() {
        return this.currentEvent;
    }
    
    getAllEvents() {
        return Array.from(this.events.keys());
    }
    
    isEventActive(eventName) {
        return this.currentEvent && this.currentEvent.name === eventName;
    }
    
    // Утилита для отладки
    debug() {
        console.group('🎪 EventManager Debug');
        console.log('Инициализирован:', this.isInitialized);
        console.log('Активный ивент:', this.currentEvent?.name || 'Нет');
        console.log('Все ивенты:', Array.from(this.events.keys()));
        console.log('Контейнер создан:', !!this.eventContainer);
        console.log('Панель создана:', !!this.controlPanel);
        console.groupEnd();
    }
}