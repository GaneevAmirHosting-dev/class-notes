import { FirebaseService } from './FirebaseService.js';
import { StateManager } from './StateManager.js';
import { CacheService } from './CacheService.js';
import { UIAnimations } from './UIAnimations.js';
import { EditorService } from './EditorService.js';

export class HomeworkService {
    constructor(firebaseService, stateManager, cacheService) {
        this.firebase = firebaseService;
        this.state = stateManager;
        this.cache = cacheService;
        this.unsubscribe = null;
        this.editorService = new EditorService();
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSteps = 50;
    }
    
    async loadHomework() {
        const className = this.state.getUserClass();
        
        // Отписываемся от предыдущих слушателей
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        
        // Подписываемся на изменения в Firebase
        this.unsubscribe = this.firebase.onDataChange(
            `classes/${className}`,
            (classData) => {
                if (classData) {
                    // Сохраняем в кеш
                    this.cache.saveHomework(className, classData);
                    this.displayHomework(classData);
                }
            }
        );
        
        // Показываем данные из кеша сразу
        const cachedData = this.cache.getHomework(className);
        if (cachedData) {
            this.displayHomework(cachedData);
        }
    }
    
    displayHomework(classData) {
        const homeworkDisplay = document.getElementById('homework-display');
        
        if (classData && classData.homework) {
            homeworkDisplay.innerHTML = `
                <div class="homework-content wysiwyg-content">${classData.homework}</div>
                ${classData.lastUpdate ? 
                    `<div class="last-updated">📅 Обновлено: ${classData.lastUpdate}</div>` : 
                    ''
                }
            `;
        } else {
            homeworkDisplay.innerHTML = '<div class="no-homework">📝 Домашние задания пока не добавлены</div>';
        }
        
        UIAnimations.fadeIn(homeworkDisplay);
    }
    
    setupEditor() {
        const editorSection = document.getElementById('editor-section');
        if (this.state.canUserEdit()) {
            editorSection.classList.remove('hidden');
            UIAnimations.fadeIn(editorSection);
            this.initEditor();
        } else {
            editorSection.classList.add('hidden');
        }
    }
    
    initEditor() {
        const editorElement = document.getElementById('homework-editor');
        if (!editorElement) {
            console.error('Editor element not found!');
            return;
        }
        
        // Инициализируем сервис редактора
        this.editorService.init(editorElement);
        
        // Загружаем сохраненные данные
        this.loadHomeworkForEditing();
        
        // Настраиваем дополнительные обработчики
        this.setupAdditionalEvents();
        
        // Фокусируемся на редакторе
        setTimeout(() => {
            this.editorService.focus();
            this.saveState();
        }, 200);
    }
    
    setupAdditionalEvents() {
        const editorElement = document.getElementById('homework-editor');
        if (!editorElement) return;
        
        // Сохраняем состояние для undo/redo
        editorElement.addEventListener('input', () => {
            this.saveState();
        });
        
        // Обработка специальных кнопок
        document.querySelectorAll('.toolbar-btn[data-command="undo"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.undo();
            });
        });
        
        document.querySelectorAll('.toolbar-btn[data-command="redo"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.redo();
            });
        });
    }
    
    saveState() {
        const currentContent = this.editorService.getContent();
        
        // Не сохраняем если состояние не изменилось
        if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === currentContent) {
            return;
        }
        
        // Сохраняем состояние
        this.undoStack.push(currentContent);
        
        // Ограничиваем размер стека
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }
        
        // Очищаем стек redo при новом действии
        this.redoStack = [];
    }
    
    undo() {
        if (this.undoStack.length > 1) {
            // Сохраняем текущее состояние в redo стек
            this.redoStack.push(this.undoStack.pop());
            
            // Восстанавливаем предыдущее состояние
            const previousState = this.undoStack[this.undoStack.length - 1];
            this.editorService.setContent(previousState);
            
            UIAnimations.showMessage('↩️ Отменено', 'info');
        }
    }
    
    redo() {
        if (this.redoStack.length > 0) {
            // Восстанавливаем отмененное состояние
            const nextState = this.redoStack.pop();
            this.undoStack.push(nextState);
            this.editorService.setContent(nextState);
            
            UIAnimations.showMessage('↪️ Повторено', 'info');
        }
    }
    
    loadHomeworkForEditing() {
        const className = this.state.getUserClass();
        const cachedData = this.cache.getHomework(className);
        const homework = (cachedData && cachedData.homework) || '';
        
        if (homework) {
            this.editorService.setContent(homework);
            this.saveState();
        }
    }
    
    async saveHomework() {
        if (!this.state.getUserData()) {
            UIAnimations.showMessage('❌ Нет активной сессии', 'error');
            return;
        }
        
        if (!this.state.canUserEdit()) {
            UIAnimations.showMessage('❌ У вас нет прав для редактирования', 'error');
            return;
        }
        
        const content = this.editorService.getContent();
        const saveBtn = document.getElementById('save-homework');
        
        // Проверка на пустое содержимое
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        
        if (!textContent.trim() || textContent === 'Введите домашние задания здесь...') {
            UIAnimations.showMessage('📝 Введите домашние задания', 'error');
            UIAnimations.shake(document.getElementById('homework-editor'));
            return;
        }
        
        const className = this.state.getUserClass();
        
        // Обновляем кеш
        const homeworkData = {
            homework: content,
            lastUpdate: new Date().toLocaleString('ru-RU'),
            _editedBy: this.state.getUserData().key,
            _editor: Date.now().toString(),
            _timestamp: Date.now()
        };
        
        this.cache.saveHomework(className, homeworkData);
        
        // Показываем изменения
        this.displayHomework(homeworkData);
        
        // Добавляем в очередь синхронизации
        this.state.addPendingChange({
            type: 'homework',
            class: className,
            data: content
        });
        
        UIAnimations.pulse(saveBtn);
        UIAnimations.showMessage('✅ Домашние задания сохранены локально!', 'success');
        UIAnimations.pulse(document.getElementById('homework-display'));
        
        // Пробуем сразу синхронизировать
        try {
            await this.firebase.updateData(
                `classes/${className}`,
                homeworkData
            );
            
            // Удаляем из очереди при успехе
            const pendingChanges = this.state.getPendingChanges();
            const change = pendingChanges.find(c => c.type === 'homework' && c.data === content);
            if (change) {
                this.state.removePendingChange(change.id);
            }
            
            UIAnimations.showMessage('✅ Домашние задания сохранены на сервере!', 'success');
        } catch (error) {
            console.error('Ошибка сохранения на сервере:', error);
            UIAnimations.showMessage('⚠️ Сохранено локально (оффлайн)', 'warning');
        }
    }
    
    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        
        // Очищаем редактор
        this.editorService.destroy();
        
        // Очищаем стеки
        this.undoStack = [];
        this.redoStack = [];
    }
}