export class UIAnimations {
    static addShakeAnimation() {
        const shakeStyles = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-8px); }
            75% { transform: translateX(8px); }
        }
        `;
        
        if (!document.querySelector('#shake-animation')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'shake-animation';
            styleElement.textContent = shakeStyles;
            document.head.appendChild(styleElement);
        }
    }
    
    static pulse(element) {
        if (!element) return;
        
        element.style.transform = 'scale(1.05)';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 300);
    }
    
    static bounce(element) {
        if (!element) return;
        
        element.style.transform = 'translateY(-5px)';
        setTimeout(() => {
            element.style.transform = 'translateY(0)';
        }, 300);
    }
    
    static shake(element) {
        if (!element) return;
        
        element.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            element.style.animation = '';
        }, 500);
    }
    
    static fadeIn(element) {
        if (!element) return;
        
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            element.style.transition = 'all 0.5s ease';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 50);
    }
    
    static fadeOut(element, callback) {
        if (!element) return;
        
        element.style.transition = 'opacity 0.3s ease';
        element.style.opacity = '0';
        
        setTimeout(() => {
            if (callback) callback();
        }, 300);
    }
    
    static slideIn(element, direction = 'up') {
        if (!element) return;
        
        const directions = {
            'up': 'translateY(50px)',
            'down': 'translateY(-50px)',
            'left': 'translateX(50px)',
            'right': 'translateX(-50px)'
        };
        
        element.style.opacity = '0';
        element.style.transform = directions[direction] || 'translateY(50px)';
        
        setTimeout(() => {
            element.style.transition = 'all 0.5s ease';
            element.style.opacity = '1';
            element.style.transform = 'translate(0)';
        }, 50);
    }
    
    static showMessage(text, type = 'info') {
        // Удаляем старые сообщения
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Создаем новое сообщение
        const message = document.createElement('div');
        message.className = `message ${type}-message`;
        message.textContent = text;
        
        // Стилизация
        message.style.cssText = `
            position: fixed;
            top: 25px;
            left: 50%;
            transform: translateX(-50%) translateY(-100px);
            padding: 18px 30px;
            border-radius: 20px;
            z-index: 1000;
            font-weight: 600;
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.2);
            transition: all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
            text-align: center;
            min-width: 300px;
            max-width: 90vw;
            opacity: 0;
        `;
        
        // Цвета в зависимости от типа
        const colors = {
            'success': 'rgba(76, 175, 80, 0.9)',
            'error': 'rgba(244, 67, 54, 0.9)',
            'info': 'rgba(33, 150, 243, 0.9)',
            'warning': 'rgba(255, 152, 0, 0.9)'
        };
        
        message.style.background = colors[type] || colors.info;
        message.style.color = 'white';
        
        document.body.appendChild(message);
        
        // Анимация появления
        setTimeout(() => {
            message.style.opacity = '1';
            message.style.transform = 'translateX(-50%) translateY(0)';
        }, 50);
        
        // Автоматическое скрытие
        setTimeout(() => {
            message.style.transform = 'translateX(-50%) translateY(-100px)';
            message.style.opacity = '0';
            setTimeout(() => {
                if (message.parentNode) {
                    message.remove();
                }
            }, 600);
        }, 4000);
    }
    
    static createQuickLoginButton(savedData, onClick) {
        const button = document.createElement('button');
        button.className = 'quick-login-btn';
        button.innerHTML = `
            <div class="quick-login-content">
                <span class="quick-login-icon">🚀</span>
                <div class="quick-login-info">
                    <div class="quick-login-title">Быстрый вход</div>
                    <div class="quick-login-details">
                        <span>🏫 ${savedData.className}</span>
                        <span>👤 ${savedData.roleName}</span>
                    </div>
                </div>
            </div>
            <div class="quick-login-hint">Нажмите для входа</div>
        `;
        
        button.addEventListener('click', onClick);
        return button;
    }
    
    static createAutofillBadge(className, roleName, onChangeClick) {
        const container = document.createElement('div');
        container.className = 'autofill-info';
        container.innerHTML = `
            <div class="autofill-badge">
                <div style="display: flex; gap: 20px;">
                    <span>🏫 Класс: ${className}</span>
                    <span>👤 Роль: ${roleName}</span>
                </div>
                <button id="change-credentials" class="change-btn">✏️ Изменить</button>
            </div>
        `;
        
        const changeBtn = container.querySelector('#change-credentials');
        changeBtn.addEventListener('click', onChangeClick);
        
        return container;
    }
}