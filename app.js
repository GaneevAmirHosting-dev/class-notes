import { FirebaseService } from './modules/FirebaseService.js';
import { StateManager } from './modules/StateManager.js';
import { CacheService } from './modules/CacheService.js';
import { UIAnimations } from './modules/UIAnimations.js';
import { AuthService } from './modules/AuthService.js';
import { HomeworkService } from './modules/HomeworkService.js';
import { GalleryService } from './modules/GalleryService.js';
import { EventManager } from './events/EventManager.js';

class SchoolPortalApp {
    constructor() {
        // Инициализируем сервисы
        this.firebaseService = FirebaseService.getInstance();
        this.stateManager = new StateManager();
        this.cacheService = new CacheService();
        this.uiAnimations = UIAnimations;
        
        // Инициализируем функциональные сервисы
        this.authService = new AuthService(
            this.firebaseService, 
            this.stateManager
        );
        
        this.homeworkService = new HomeworkService(
            this.firebaseService,
            this.stateManager,
            this.cacheService
        );
        
        this.galleryService = new GalleryService(
            this.firebaseService,
            this.stateManager,
            this.cacheService
        );
        
        // Инициализируем менеджер ивентов
        this.eventManager = new EventManager(this.firebaseService);
        
        // Настройка глобальных обработчиков
        this.setupGlobalHandlers();
    }
    
    async initialize() {
        console.log('🎓 Школьный портал с WYSIWYG редактором инициализирован!');
        
        // Добавляем CSS анимации
        UIAnimations.addShakeAnimation();
        
        // Загружаем ожидающие изменения
        this.stateManager.loadPendingChanges();
        
        // Инициализируем менеджер ивентов
        await this.eventManager.initialize();
        
        // Показываем экран выбора класса
        this.showClassSelection();
        
        // Настройка слушателей событий
        this.setupEventListeners();
        
        // Глобальные обработчики ошибок
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            UIAnimations.showMessage('⚠️ Произошла непредвиденная ошибка', 'error');
        });
        
        // Проверяем подключение к Firebase
        this.checkFirebaseConnection();
    }
    
    setupGlobalHandlers() {
        // Событие для показа экрана выбора класса
        document.addEventListener('show-class-selection', () => {
            this.showClassSelection();
        });
        
        // Событие для показа главного экрана
        document.addEventListener('show-main-screen', () => {
            this.showMainScreen();
        });
        
        // Горячие клавиши для управления ивентами (только для админов)
        document.addEventListener('keydown', (e) => {
            const userData = this.stateManager.getUserData();
            if (userData && userData.type === 'admin') {
                // Ctrl+E для показа панели ивентов
                if (e.ctrlKey && e.key === 'i') {
                    e.preventDefault();
                    this.showEventManagementPanel();
                }
            }
        });
    }
    
    setupEventListeners() {
        // Выбор класса
        document.querySelectorAll('.class-card').forEach(card => {
            card.addEventListener('click', (e) => {
                UIAnimations.pulse(e.target);
                setTimeout(() => {
                    this.stateManager.setSelectedClass(e.target.dataset.class);
                    this.showRoleSelection();
                }, 300);
            });
        });
        
        // Выбор роли
        document.querySelectorAll('.role-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                UIAnimations.pulse(e.target);
                setTimeout(() => {
                    this.stateManager.setSelectedRole(e.target.dataset.role);
                    
                    // Если ученик - сразу идем на главный экран
                    if (e.target.dataset.role === 'student') {
                        const userData = {
                            type: 'student',
                            key: 'student_auto',
                            userType: 'class',
                            class: this.stateManager.getSelectedClass(),
                            loginTime: Date.now(),
                            name: 'Ученик'
                        };
                        this.stateManager.setUserData(userData);
                        this.showMainScreen();
                    } else {
                        // Для старост и админов показываем экран ввода ключа
                        this.showKeyInput();
                    }
                }, 300);
            });
        });
        
        // Навигация назад
        document.getElementById('back-to-class').addEventListener('click', () => {
            this.showClassSelection();
        });
        
        document.getElementById('back-to-role').addEventListener('click', () => {
            this.showRoleSelection();
        });
        
        // Ввод ключа (только для старост и админов)
        document.getElementById('submit-key').addEventListener('click', async () => {
            const key = document.getElementById('access-key').value.trim();
            const success = await this.authService.checkAccessKey(key);
            
            if (success) {
                // Синхронизируем ожидающие изменения
                await this.authService.syncPendingChanges();
                
                // Показываем главный экран
                document.dispatchEvent(new CustomEvent('show-main-screen'));
            }
        });
        
        document.getElementById('access-key').addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const key = document.getElementById('access-key').value.trim();
                const success = await this.authService.checkAccessKey(key);
                
                if (success) {
                    await this.authService.syncPendingChanges();
                    document.dispatchEvent(new CustomEvent('show-main-screen'));
                }
            }
        });
        
        // Выход
        document.getElementById('logout').addEventListener('click', () => {
            this.logout();
        });
        
        // Сохранение ДЗ
        document.getElementById('save-homework').addEventListener('click', () => {
            this.homeworkService.saveHomework();
        });
    }
    
    showClassSelection() {
        this.hideAllScreens();
        
        const screen = document.getElementById('class-selection');
        screen.classList.remove('hidden');
        UIAnimations.fadeIn(screen);
        
        // Сбрасываем состояние
        this.stateManager.reset();
        this.authService.resetQuickLoginFlag();
        
        // Добавляем кнопку быстрого входа (только для старост и админов)
        this.authService.addQuickLoginButton();
    }
    
    showRoleSelection() {
        this.hideAllScreens();
        
        const screen = document.getElementById('role-selection');
        screen.classList.remove('hidden');
        UIAnimations.fadeIn(screen);
    }
    
    showKeyInput() {
        this.hideAllScreens();
        
        const screen = document.getElementById('key-input');
        screen.classList.remove('hidden');
        UIAnimations.fadeIn(screen);
        
        // Очищаем контейнер автозаполнения
        document.getElementById('autofill-container').innerHTML = '';
        
        // Фокусируемся на поле ввода
        document.getElementById('access-key').value = '';
        document.getElementById('access-key').focus();
    }
    
    async showMainScreen() {
        this.hideAllScreens();
        
        const screen = document.getElementById('main-screen');
        screen.classList.remove('hidden');
        UIAnimations.fadeIn(screen);
        
        // Обновляем информацию о пользователе
        this.updateUserInfo();
        
        // Настраиваем интерфейс
        this.homeworkService.setupEditor();
        this.galleryService.setupUploadSection();
        
        // Добавляем кнопку управления ивентами для админов
        this.addEventManagementButton();
        
        // Загружаем данные
        await this.homeworkService.loadHomework();
        await this.galleryService.loadGallery();
    }
    
    hideAllScreens() {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
    }
    
    updateUserInfo() {
        const userClass = document.getElementById('user-class');
        const userRole = document.getElementById('user-role');
        const userData = this.stateManager.getUserData();
        
        if (userData.userType === 'admin') {
            userClass.textContent = `👑 Администрация`;
            userRole.textContent = this.stateManager.getRoleDisplayName(userData.type);
        } else {
            userClass.textContent = `🏫 Класс: ${userData.class}`;
            userRole.textContent = this.stateManager.getRoleDisplayName(userData.type);
        }
        
        UIAnimations.pulse(userClass);
    }
    
    addEventManagementButton() {
        const userData = this.stateManager.getUserData();
        
        if (userData && userData.type === 'admin') {
            // Удаляем старую кнопку если есть
            const oldBtn = document.getElementById('event-management-btn');
            if (oldBtn) oldBtn.remove();
            
            const userInfo = document.querySelector('.user-info');
            if (!userInfo) return;
            
            const eventBtn = document.createElement('button');
            eventBtn.id = 'event-management-btn';
            eventBtn.className = 'event-btn';
            eventBtn.innerHTML = '🎪 Управление ивентами';
            eventBtn.style.cssText = `
                background: linear-gradient(145deg, #9b59b6, #8e44ad);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 10px;
                cursor: pointer;
                font-weight: 600;
                margin-left: 10px;
                transition: all 0.3s ease;
            `;
            
            eventBtn.addEventListener('mouseenter', () => {
                eventBtn.style.transform = 'translateY(-2px)';
                eventBtn.style.boxShadow = '0 5px 15px rgba(155, 89, 182, 0.4)';
            });
            
            eventBtn.addEventListener('mouseleave', () => {
                eventBtn.style.transform = 'translateY(0)';
                eventBtn.style.boxShadow = 'none';
            });
            
            eventBtn.addEventListener('click', () => {
                this.showEventManagementPanel();
            });
            
            userInfo.appendChild(eventBtn);
        }
    }
    
    showEventManagementPanel() {
        // Удаляем старую панель если есть
        const oldPanel = document.getElementById('event-management-panel');
        if (oldPanel) oldPanel.remove();
        
        const activeEvent = this.eventManager.getActiveEvent();
        const allEvents = this.eventManager.getAllEvents();
        
        const panel = document.createElement('div');
        panel.id = 'event-management-panel';
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 20, 40, 0.98);
            backdrop-filter: blur(30px);
            border-radius: 20px;
            padding: 30px;
            z-index: 10002;
            border: 3px solid rgba(128, 212, 255, 0.4);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
            max-width: 500px;
            width: 90%;
            color: white;
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px solid rgba(128, 212, 255, 0.3);">
                <h3 style="margin: 0; color: #80d4ff; font-size: 1.5rem;">🎪 Управление ивентами</h3>
                <button id="close-event-panel" style="background: rgba(255,255,255,0.1); border: none; color: white; font-size: 28px; cursor: pointer; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;">
                    &times;
                </button>
            </div>
            
            <div style="margin-bottom: 25px; background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; border: 1px solid rgba(128, 212, 255, 0.2);">
                <h4 style="margin-top: 0; margin-bottom: 10px; color: #a3d9ff;">📊 Статус ивентов</h4>
                <p style="margin: 0;"><strong>Текущий активный ивент:</strong></p>
                <div style="display: flex; align-items: center; margin-top: 10px;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: ${activeEvent ? '#27ae60' : '#e74c3c'}; margin-right: 10px;"></div>
                    <span style="font-size: 1.1rem; font-weight: 600;">${activeEvent ? activeEvent.name : '❌ Нет активных ивентов'}</span>
                </div>
                ${activeEvent ? `<p style="margin-top: 10px; opacity: 0.8; font-style: italic;">${activeEvent.description || ''}</p>` : ''}
            </div>
            
            <div style="margin-bottom: 30px;">
                <h4 style="margin-top: 0; margin-bottom: 15px; color: #a3d9ff;">🎮 Доступные ивенты</h4>
                <div style="display: grid; gap: 12px;">
                    ${allEvents.map(eventName => {
                        const isActive = this.eventManager.isEventActive(eventName);
                        return `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: ${isActive ? 'rgba(39, 174, 96, 0.1)' : 'rgba(255,255,255,0.05)'}; border-radius: 10px; border: 2px solid ${isActive ? 'rgba(39, 174, 96, 0.3)' : 'rgba(255,255,255,0.1)'};">
                                <div>
                                    <div style="font-weight: 600; font-size: 1.1rem;">${eventName}</div>
                                    <div style="font-size: 0.9rem; opacity: 0.8; margin-top: 5px;">${this.getEventDescription(eventName)}</div>
                                </div>
                                <div style="display: flex; gap: 10px;">
                                    ${!isActive ? `
                                        <button class="activate-event-btn" data-event="${eventName}" style="background: linear-gradient(145deg, #27ae60, #2ecc71); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s ease; min-width: 120px;">
                                            ▶️ Активировать
                                        </button>
                                    ` : `
                                        <div style="display: flex; gap: 10px;">
                                            <button class="configure-event-btn" data-event="${eventName}" style="background: linear-gradient(145deg, #3498db, #2980b9); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s ease;">
                                                ⚙️ Настроить
                                            </button>
                                            <button class="deactivate-single-event-btn" data-event="${eventName}" style="background: linear-gradient(145deg, #e74c3c, #c0392b); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s ease;">
                                                ⏹️ Остановить
                                            </button>
                                        </div>
                                    `}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <div style="border-top: 2px solid rgba(255,255,255,0.1); padding-top: 20px; display: flex; gap: 15px; justify-content: center;">
                <button id="deactivate-all-events" style="background: linear-gradient(145deg, #e74c3c, #c0392b); color: white; border: none; padding: 12px 25px; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.3s ease; flex: 1;">
                    🚫 Деактивировать все ивенты
                </button>
                <button id="refresh-events" style="background: linear-gradient(145deg, #9b59b6, #8e44ad); color: white; border: none; padding: 12px 25px; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.3s ease; flex: 1;">
                    🔄 Обновить список
                </button>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: rgba(255, 204, 0, 0.1); border-radius: 10px; border-left: 4px solid #ffcc00;">
                <p style="margin: 0; font-size: 0.9rem; color: #ffcc00;">
                    💡 <strong>Подсказка:</strong> Ивенты синхронизируются через Firebase. Все изменения видны всем пользователям в реальном времени.
                </p>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Анимация появления
        panel.style.opacity = '0';
        panel.style.transform = 'translate(-50%, -50%) scale(0.9)';
        setTimeout(() => {
            panel.style.transition = 'all 0.3s ease';
            panel.style.opacity = '1';
            panel.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 10);
        
        // Обработчики событий
        const closeBtn = document.getElementById('close-event-panel');
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = 'rgba(255,255,255,0.2)';
            closeBtn.style.transform = 'rotate(90deg)';
        });
        
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = 'rgba(255,255,255,0.1)';
            closeBtn.style.transform = 'rotate(0deg)';
        });
        
        closeBtn.addEventListener('click', () => {
            panel.style.opacity = '0';
            panel.style.transform = 'translate(-50%, -50%) scale(0.9)';
            setTimeout(() => {
                if (panel.parentNode) {
                    panel.remove();
                }
            }, 300);
        });
        
        // Активация ивентов
        panel.querySelectorAll('.activate-event-btn').forEach(btn => {
            this.setupButtonHover(btn);
            
            btn.addEventListener('click', async (e) => {
                const eventName = e.target.dataset.event;
                UIAnimations.pulse(e.target);
                
                panel.style.opacity = '0';
                panel.style.transform = 'translate(-50%, -50%) scale(0.9)';
                
                setTimeout(async () => {
                    const success = await this.eventManager.activateEvent(eventName, 'admin');
                    if (success) {
                        UIAnimations.showMessage(`✅ Ивент "${eventName}" активирован`, 'success');
                        panel.remove();
                        this.showEventManagementPanel();
                    } else {
                        panel.style.opacity = '1';
                        panel.style.transform = 'translate(-50%, -50%) scale(1)';
                    }
                }, 300);
            });
        });
        
        // Деактивация конкретного ивента
        panel.querySelectorAll('.deactivate-single-event-btn').forEach(btn => {
            this.setupButtonHover(btn);
            
            btn.addEventListener('click', async (e) => {
                const eventName = e.target.dataset.event;
                UIAnimations.pulse(e.target);
                
                await this.eventManager.deactivateEvent();
                UIAnimations.showMessage(`❌ Ивент "${eventName}" деактивирован`, 'info');
                panel.remove();
                this.showEventManagementPanel();
            });
        });
        
        // Настройка активного ивента
        panel.querySelectorAll('.configure-event-btn').forEach(btn => {
            this.setupButtonHover(btn);
            
            btn.addEventListener('click', async (e) => {
                const eventName = e.target.dataset.event;
                UIAnimations.pulse(e.target);
                
                panel.style.opacity = '0';
                panel.style.transform = 'translate(-50%, -50%) scale(0.9)';
                
                setTimeout(async () => {
                    panel.remove();
                    
                    // Показываем контролы ивента
                    if (this.eventManager.isEventActive(eventName)) {
                        await this.eventManager.showEventControls(eventName);
                    } else {
                        UIAnimations.showMessage('❌ Ивент не активен', 'error');
                    }
                }, 300);
            });
        });
        
        // Деактивация всех ивентов
        const deactivateAllBtn = document.getElementById('deactivate-all-events');
        this.setupButtonHover(deactivateAllBtn);
        
        deactivateAllBtn.addEventListener('click', async () => {
            UIAnimations.pulse(deactivateAllBtn);
            
            await this.eventManager.deactivateEvent();
            UIAnimations.showMessage('❌ Все ивенты деактивированы', 'info');
            panel.remove();
            this.showEventManagementPanel();
        });
        
        // Обновление списка ивентов
        const refreshBtn = document.getElementById('refresh-events');
        this.setupButtonHover(refreshBtn);
        
        refreshBtn.addEventListener('click', async () => {
            UIAnimations.pulse(refreshBtn);
            
            await this.eventManager.loadAllEvents();
            UIAnimations.showMessage('🔄 Список ивентов обновлен', 'success');
            panel.remove();
            this.showEventManagementPanel();
        });
        
        // Закрытие по клику вне панели
        const overlayClickHandler = (e) => {
            if (!panel.contains(e.target) && e.target.id !== 'event-management-btn') {
                panel.style.opacity = '0';
                panel.style.transform = 'translate(-50%, -50%) scale(0.9)';
                setTimeout(() => {
                    if (panel.parentNode) {
                        panel.remove();
                    }
                }, 300);
                document.removeEventListener('click', overlayClickHandler);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', overlayClickHandler);
        }, 100);
    }
    
    setupButtonHover(button) {
        if (!button) return;
        
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = 'none';
        });
    }
    
    getEventDescription(eventName) {
        const descriptions = {
            'snow-event': 'Красивый снегопад на странице',
            'rain-event': 'Реалистичный дождь',
            'confetti-event': 'Праздничные конфетти'
        };
        
        return descriptions[eventName] || 'Специальный ивент';
    }
    
    logout() {
        UIAnimations.pulse(document.getElementById('logout'));
        UIAnimations.showMessage('👋 Выход из системы...', 'info');
        
        // Очищаем сервисы
        this.homeworkService.cleanup();
        this.galleryService.cleanup();
        
        setTimeout(() => {
            // Показываем экран выбора класса
            this.showClassSelection();
        }, 1000);
    }
    
    async checkFirebaseConnection() {
        try {
            await this.firebaseService.getData('.info/connected');
            console.log('✅ Подключение к Firebase установлено');
        } catch (error) {
            console.warn('⚠️ Нет подключения к Firebase, работаем в оффлайн режиме');
            UIAnimations.showMessage('📡 Работаем в оффлайн режиме', 'warning');
        }
    }
    
    debugState() {
        console.log('=== DEBUG STATE ===');
        const state = this.stateManager.getState();
        console.log('Current state:', state);
        console.log('Cache size:', this.cacheService.getCacheSize(), 'MB');
        console.log('Active event:', this.eventManager.getActiveEvent()?.name || 'None');
        console.log('=== END DEBUG ===');
    }
}

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    const app = new SchoolPortalApp();
    window.schoolPortal = app; // Для отладки в консоли
    
    // Добавляем глобальные функции для отладки
    window.toggleEventPanel = () => app.showEventManagementPanel();
    window.getActiveEvent = () => app.eventManager.getActiveEvent();
    window.deactivateEvents = () => app.eventManager.deactivateEvent();
    
    app.initialize();
    
    // Консольное сообщение
    console.log('%c🎓 Школьный портал инициализирован!', 'color: #3498db; font-size: 16px; font-weight: bold;');
    console.log('%c🛠️  Для админов: Ctrl+I - управление ивентами', 'color: #9b59b6;');
});