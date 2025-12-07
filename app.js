import { FirebaseService } from './modules/FirebaseService.js';
import { StateManager } from './modules/StateManager.js';
import { CacheService } from './modules/CacheService.js';
import { UIAnimations } from './modules/UIAnimations.js';
import { AuthService } from './modules/AuthService.js';
import { HomeworkService } from './modules/HomeworkService.js';
import { GalleryService } from './modules/GalleryService.js';

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
        
        // Настройка глобальных обработчиков
        this.setupGlobalHandlers();
    }
    
    async initialize() {
        console.log('🎓 Школьный портал с WYSIWYG редактором инициализирован!');
        
        // Добавляем CSS анимации
        UIAnimations.addShakeAnimation();
        
        // Загружаем ожидающие изменения
        this.stateManager.loadPendingChanges();
        
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
                    this.showKeyInput();
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
        
        // Ввод ключа
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
        
        // Добавляем кнопку быстрого входа
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
        console.log('=== END DEBUG ===');
    }
}

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    const app = new SchoolPortalApp();
    window.schoolPortal = app; // Для отладки в консоли
    app.initialize();
});