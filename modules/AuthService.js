import { FirebaseService } from './FirebaseService.js';
import { StateManager } from './StateManager.js';
import { UIAnimations } from './UIAnimations.js';

export class AuthService {
    constructor(firebaseService, stateManager) {
        this.firebase = firebaseService;
        this.state = stateManager;
        this.quickLoginButtonAdded = false;
    }
    
    async checkAccessKey(key) {
        const keyInput = document.getElementById('access-key');
        
        if (!key) {
            UIAnimations.showMessage('❌ Введите ключ доступа', 'error');
            UIAnimations.shake(keyInput);
            return false;
        }
        
        const className = this.state.getSelectedClass();
        const role = this.state.getSelectedRole();
        
        if (!className || !role) {
            UIAnimations.showMessage('❌ Сначала выберите класс и роль', 'error');
            return false;
        }
        
        UIAnimations.showMessage('🔍 Проверка ключа...', 'info');
        UIAnimations.pulse(document.getElementById('submit-key'));
        
        try {
            const usersData = await this.firebase.getData('users');
            
            if (!usersData) {
                UIAnimations.showMessage('❌ Ошибка базы данных', 'error');
                return false;
            }
            
            let userData = null;
            
            // Проверка администрации
            if (usersData.administration && usersData.administration[key]) {
                const user = usersData.administration[key];
                if (user.active !== false) {
                    userData = {
                        ...user,
                        key: key,
                        userType: 'admin',
                        class: null,
                        loginTime: Date.now()
                    };
                }
            } 
            // Проверка пользователей класса
            else if (usersData[className] && usersData[className][key]) {
                const user = usersData[className][key];
                if (user.active !== false) {
                    if (role !== user.type) {
                        const roleName = this.state.getRoleDisplayName(role);
                        UIAnimations.showMessage(`❌ Ключ не соответствует выбранной роли "${roleName}"`, 'error');
                        UIAnimations.shake(keyInput);
                        return false;
                    }
                    
                    userData = {
                        ...user,
                        key: key,
                        userType: 'class',
                        class: className,
                        loginTime: Date.now()
                    };
                }
            }
            
            if (userData) {
                // Сохраняем данные для быстрого входа
                this.state.saveCredentials(key, className, role);
                this.state.setUserData(userData);
                
                UIAnimations.showMessage('🎉 Успешный вход!', 'success');
                return true;
            } else {
                UIAnimations.showMessage('❌ Неверный ключ или доступ заблокирован', 'error');
                UIAnimations.shake(keyInput);
                return false;
            }
        } catch (error) {
            console.error('Ошибка проверки ключа:', error);
            UIAnimations.showMessage('📡 Ошибка подключения к базе данных', 'error');
            return false;
        }
    }
    
    async syncPendingChanges() {
        const pendingChanges = this.state.getPendingChanges();
        if (pendingChanges.length === 0) return;
        
        UIAnimations.showMessage('🔄 Синхронизация изменений...', 'info');
        
        const successfulSyncs = [];
        
        for (const change of pendingChanges) {
            try {
                switch (change.type) {
                    case 'homework':
                        await this.firebase.updateData(
                            `classes/${change.class}`,
                            {
                                homework: change.data,
                                lastUpdate: new Date().toLocaleString('ru-RU')
                            }
                        );
                        successfulSyncs.push(change.id);
                        break;
                        
                    case 'gallery':
                        await this.firebase.setData(
                            `classes/${change.class}/gallery/${change.fileName}`,
                            change.data
                        );
                        successfulSyncs.push(change.id);
                        break;
                        
                    case 'delete_image':
                        await this.firebase.deleteData(
                            `classes/${change.class}/gallery/${change.fileName}`
                        );
                        successfulSyncs.push(change.id);
                        break;
                }
            } catch (error) {
                console.error('Ошибка синхронизации:', error);
            }
        }
        
        // Удаляем успешно синхронизированные
        successfulSyncs.forEach(id => {
            this.state.removePendingChange(id);
        });
        
        if (successfulSyncs.length > 0) {
            UIAnimations.showMessage(`✅ Синхронизировано ${successfulSyncs.length} изменений`, 'success');
        }
    }
    
    addQuickLoginButton() {
        const saved = this.state.getSavedCredentials();
        
        if (saved.key && saved.className && saved.role && !this.quickLoginButtonAdded) {
            // Удаляем старую кнопку если есть
            const oldBtn = document.getElementById('quick-login-btn');
            if (oldBtn) oldBtn.remove();
            
            this.quickLoginButtonAdded = true;
            
            const quickLoginBtn = UIAnimations.createQuickLoginButton(
                {
                    className: saved.className,
                    roleName: this.state.getRoleDisplayName(saved.role)
                },
                () => {
                    UIAnimations.pulse(quickLoginBtn);
                    this.state.setSelectedClass(saved.className);
                    this.state.setSelectedRole(saved.role);
                    
                    // Показываем экран ввода ключа с автозаполнением
                    this.showKeyInputWithAutofill(saved.key, saved.className, saved.role);
                }
            );
            
            quickLoginBtn.id = 'quick-login-btn';
            
            // Добавляем на экран
            const classGrid = document.querySelector('.class-grid');
            const title = document.querySelector('#class-selection h1');
            
            const container = document.getElementById('quick-login-container');
            if (container) {
                container.appendChild(quickLoginBtn);
            } else {
                title.parentNode.insertBefore(quickLoginBtn, classGrid);
            }
        }
    }
    
    showKeyInputWithAutofill(key, className, role) {
        // Скрываем все экраны
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // Показываем экран ввода ключа
        const screen = document.getElementById('key-input');
        screen.classList.remove('hidden');
        UIAnimations.fadeIn(screen);
        
        // Добавляем информацию об авто-заполнении
        const autofillContainer = document.getElementById('autofill-container');
        autofillContainer.innerHTML = '';
        
        const autofillBadge = UIAnimations.createAutofillBadge(
            className,
            this.state.getRoleDisplayName(role),
            () => {
                this.clearSavedCredentials();
                this.quickLoginButtonAdded = false;
                document.dispatchEvent(new CustomEvent('show-class-selection'));
            }
        );
        
        autofillContainer.appendChild(autofillBadge);
        
        // Заполняем поле ключа
        const keyInput = document.getElementById('access-key');
        keyInput.value = key;
        keyInput.focus();
        keyInput.select();
    }
    
    clearSavedCredentials() {
        this.state.clearCredentials();
        this.quickLoginButtonAdded = false;
        
        // Удаляем кнопку быстрого входа
        const quickLoginBtn = document.getElementById('quick-login-btn');
        if (quickLoginBtn) quickLoginBtn.remove();
    }
    
    resetQuickLoginFlag() {
        this.quickLoginButtonAdded = false;
    }
}