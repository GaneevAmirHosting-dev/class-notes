import { UIAnimations } from './UIAnimations.js';

export class EditorService {
    constructor() {
        this.editor = null;
        this.isInitialized = false;
        this.savedRange = null;
        this.buttonHandlers = new Map(); // Храним обработчики для очистки
    }
    
    init(editorElement) {
        if (!editorElement) {
            console.error('Editor element not provided');
            return;
        }
        
        console.log('EditorService: Initializing...');
        
        this.editor = editorElement;
        this.setupEditor();
        this.setupToolbar();
        this.setupEventListeners();
        this.isInitialized = true;
        
        console.log('EditorService initialized successfully');
    }
    
    setupEditor() {
        // Устанавливаем необходимые атрибуты
        this.editor.setAttribute('contenteditable', 'true');
        this.editor.setAttribute('spellcheck', 'true');
        
        // Стили для правильной работы
        this.editor.style.outline = 'none';
        this.editor.style.minHeight = '300px';
        this.editor.style.cursor = 'text';
        
        console.log('Editor setup complete');
    }
    
    setupToolbar() {
        console.log('Setting up toolbar...');
        
        try {
            // Находим ВСЕ кнопки на странице (не только в редакторе)
            const allButtons = document.querySelectorAll('button');
            console.log(`Total buttons on page: ${allButtons.length}`);
            
            // Находим кнопки в панели инструментов редактора
            const toolbarButtons = document.querySelectorAll('.editor-toolbar .toolbar-btn');
            console.log(`Found ${toolbarButtons.length} toolbar buttons`);
            
            if (toolbarButtons.length === 0) {
                console.warn('No toolbar buttons found! Checking alternative selectors...');
                
                // Попробуем другие селекторы
                const alternativeButtons = document.querySelectorAll('.toolbar-btn');
                console.log(`Alternative search found: ${alternativeButtons.length} buttons`);
                
                this.setupToolbarButtons(alternativeButtons);
            } else {
                this.setupToolbarButtons(toolbarButtons);
            }
            
            // Настройка селекторов
            this.setupSelectors();
            
        } catch (error) {
            console.error('Error setting up toolbar:', error);
        }
    }
    
    setupToolbarButtons(buttons) {
        if (!buttons || buttons.length === 0) {
            console.warn('No buttons to setup');
            return;
        }
        
        buttons.forEach((btn, index) => {
            if (!btn) {
                console.warn(`Button at index ${index} is null`);
                return;
            }
            
            const command = btn.dataset.command;
            const color = btn.dataset.color;
            
            console.log(`Setting up button ${index}:`, {
                text: btn.textContent?.trim(),
                command,
                color,
                className: btn.className
            });
            
            // Создаем уникальный идентификатор для кнопки
            const buttonId = `btn_${index}_${command || color || 'unknown'}`;
            
            if (command) {
                this.setupCommandButton(btn, command, buttonId);
            } else if (color) {
                this.setupColorButton(btn, color, buttonId);
            }
        });
    }
    
    setupCommandButton(button, command, buttonId) {
        // Создаем обработчик
        const handler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log(`Command button clicked: ${command} (id: ${buttonId})`);
            
            // Фокусируемся на редакторе
            this.editor.focus();
            
            // Сохраняем выделение
            this.saveSelection();
            
            // Выполняем команду
            if (command === 'removeFormat') {
                this.removeFormat();
            } else if (command === 'undo' || command === 'redo') {
                // Эти команды будут обработаны в HomeworkService
                return;
            } else {
                this.execCommand(command);
            }
            
            // Обновляем состояние кнопок
            setTimeout(() => this.updateToolbarState(), 10);
            
            // Анимация
            UIAnimations.pulse(button);
        };
        
        // Сохраняем обработчик для последующей очистки
        this.buttonHandlers.set(buttonId, { button, handler, type: 'command', value: command });
        
        // Назначаем обработчик
        button.addEventListener('click', handler);
        
        console.log(`Command button setup: ${command}`);
    }
    
    setupColorButton(button, color, buttonId) {
        // Создаем обработчик
        const handler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log(`Color button clicked: ${color} (id: ${buttonId})`);
            
            // Фокусируемся на редакторе
            this.editor.focus();
            
            // Сохраняем выделение
            this.saveSelection();
            
            // Применяем цвет
            this.execCommand('foreColor', color);
            
            // Обновляем состояние кнопок
            setTimeout(() => this.updateToolbarState(), 10);
            
            // Анимация
            UIAnimations.pulse(button);
        };
        
        // Сохраняем обработчик
        this.buttonHandlers.set(buttonId, { button, handler, type: 'color', value: color });
        
        // Назначаем обработчик
        button.addEventListener('click', handler);
        
        console.log(`Color button setup: ${color}`);
    }
    
    setupSelectors() {
        try {
            // Размер шрифта
            const fontSizeSelect = document.getElementById('font-size');
            if (fontSizeSelect) {
                fontSizeSelect.addEventListener('change', (e) => {
                    if (e.target.value) {
                        this.editor.focus();
                        this.saveSelection();
                        this.execCommand('fontSize', e.target.value);
                    }
                });
                console.log('Font size selector setup');
            } else {
                console.warn('Font size selector not found');
            }
            
            // Шрифт
            const fontFamilySelect = document.getElementById('font-family');
            if (fontFamilySelect) {
                fontFamilySelect.addEventListener('change', (e) => {
                    if (e.target.value) {
                        this.editor.focus();
                        this.saveSelection();
                        this.execCommand('fontName', e.target.value);
                    }
                });
                console.log('Font family selector setup');
            } else {
                console.warn('Font family selector not found');
            }
            
            // Цветовые пикеры
            const textColorPicker = document.getElementById('text-color');
            if (textColorPicker) {
                textColorPicker.addEventListener('input', (e) => {
                    this.editor.focus();
                    this.saveSelection();
                    this.execCommand('foreColor', e.target.value);
                });
                console.log('Text color picker setup');
            } else {
                console.warn('Text color picker not found');
            }
            
            const bgColorPicker = document.getElementById('bg-color');
            if (bgColorPicker) {
                bgColorPicker.addEventListener('input', (e) => {
                    this.editor.focus();
                    this.saveSelection();
                    this.execCommand('backColor', e.target.value);
                });
                console.log('Background color picker setup');
            } else {
                console.warn('Background color picker not found');
            }
            
        } catch (error) {
            console.error('Error setting up selectors:', error);
        }
    }
    
    setupEventListeners() {
        if (!this.editor) return;
        
        try {
            // Обновление состояния кнопок при изменении выделения
            document.addEventListener('selectionchange', () => {
                if (this.isInitialized) {
                    this.updateToolbarState();
                }
            });
            
            // Обновление при клике в редакторе
            this.editor.addEventListener('mouseup', () => {
                this.updateToolbarState();
            });
            
            this.editor.addEventListener('keyup', () => {
                this.updateToolbarState();
            });
            
            // Горячие клавиши
            this.editor.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    switch(e.key.toLowerCase()) {
                        case 'b':
                            e.preventDefault();
                            this.toggleFormat('bold');
                            break;
                        case 'i':
                            e.preventDefault();
                            this.toggleFormat('italic');
                            break;
                        case 'u':
                            e.preventDefault();
                            this.toggleFormat('underline');
                            break;
                    }
                }
            });
            
            // Обработка вставки
            this.editor.addEventListener('paste', (e) => {
                e.preventDefault();
                const text = e.clipboardData.getData('text/plain');
                this.insertText(text);
            });
            
            console.log('Editor event listeners setup');
            
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }
    
    execCommand(command, value = null) {
        if (!this.editor) {
            console.error('Cannot exec command: editor not available');
            return;
        }
        
        try {
            // Восстанавливаем выделение
            this.restoreSelection();
            
            console.log(`Executing command: ${command}${value ? '=' + value : ''}`);
            
            if (value) {
                document.execCommand(command, false, value);
            } else {
                document.execCommand(command, false, null);
            }
            
            // Возвращаем фокус редактору
            this.editor.focus();
            
        } catch (error) {
            console.error(`Error executing command ${command}:`, error);
            
            // Альтернативная реализация для основных команд
            if (command === 'bold' || command === 'italic' || command === 'underline') {
                this.applyFormatManually(command);
            }
        }
    }
    
    toggleFormat(command) {
        this.execCommand(command);
        this.updateToolbarState();
    }
    
    applyFormatManually(command) {
        try {
            const selection = window.getSelection();
            if (!selection.rangeCount) {
                console.log('No selection for manual formatting');
                return;
            }
            
            const range = selection.getRangeAt(0);
            const selectedText = range.toString();
            
            if (selectedText) {
                const span = document.createElement('span');
                
                switch(command) {
                    case 'bold':
                        span.style.fontWeight = 'bold';
                        break;
                    case 'italic':
                        span.style.fontStyle = 'italic';
                        break;
                    case 'underline':
                        span.style.textDecoration = 'underline';
                        break;
                }
                
                span.textContent = selectedText;
                range.deleteContents();
                range.insertNode(span);
                
                // Устанавливаем курсор после вставленного элемента
                const newRange = document.createRange();
                newRange.setStartAfter(span);
                newRange.setEndAfter(span);
                selection.removeAllRanges();
                selection.addRange(newRange);
                
                console.log(`Manual format applied: ${command}`);
            }
            
        } catch (error) {
            console.error(`Error applying manual format ${command}:`, error);
        }
    }
    
    removeFormat() {
        try {
            document.execCommand('removeFormat', false, null);
            document.execCommand('unlink', false, null);
            console.log('Format removed');
        } catch (error) {
            console.error('Error removing format:', error);
        }
    }
    
    insertText(text) {
        try {
            document.execCommand('insertText', false, text);
            console.log('Text inserted');
        } catch (error) {
            console.error('Error inserting text:', error);
        }
    }
    
    updateToolbarState() {
        if (!this.editor || !this.isInitialized) return;
        
        try {
            // Проверяем состояние форматирования
            const isBold = document.queryCommandState('bold');
            const isItalic = document.queryCommandState('italic');
            const isUnderline = document.queryCommandState('underline');
            
            // Обновляем кнопки форматирования
            this.buttonHandlers.forEach((data, buttonId) => {
                if (!data || !data.button) return;
                
                if (data.type === 'command') {
                    let isActive = false;
                    
                    switch(data.value) {
                        case 'bold':
                            isActive = isBold;
                            break;
                        case 'italic':
                            isActive = isItalic;
                            break;
                        case 'underline':
                            isActive = isUnderline;
                            break;
                    }
                    
                    this.setButtonActive(data.button, isActive);
                }
            });
            
        } catch (error) {
            console.error('Error updating toolbar state:', error);
        }
    }
    
    setButtonActive(button, isActive) {
        if (!button) return;
        
        try {
            if (isActive) {
                button.classList.add('active');
                button.style.background = 'linear-gradient(145deg, rgba(0, 198, 255, 0.3), rgba(106, 17, 203, 0.2))';
                button.style.borderColor = 'var(--quasar-yellow)';
                button.style.boxShadow = 'inset 0 0 10px rgba(255, 204, 0, 0.2), 0 0 8px rgba(255, 204, 0, 0.3)';
            } else {
                button.classList.remove('active');
                button.style.background = '';
                button.style.borderColor = '';
                button.style.boxShadow = '';
            }
        } catch (error) {
            console.error('Error setting button active state:', error);
        }
    }
    
    saveSelection() {
        try {
            const selection = window.getSelection();
            if (selection.rangeCount > 0 && this.editor.contains(selection.anchorNode)) {
                this.savedRange = selection.getRangeAt(0).cloneRange();
            }
        } catch (error) {
            console.error('Error saving selection:', error);
        }
    }
    
    restoreSelection() {
        if (!this.savedRange) return;
        
        try {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(this.savedRange);
        } catch (error) {
            console.error('Error restoring selection:', error);
        }
    }
    
    getContent() {
        return this.editor ? this.editor.innerHTML : '';
    }
    
    setContent(content) {
        if (this.editor) {
            this.editor.innerHTML = content || '';
        }
    }
    
    focus() {
        if (this.editor) {
            this.editor.focus();
        }
    }
    
    destroy() {
        // Удаляем все обработчики
        this.buttonHandlers.forEach((data, buttonId) => {
            if (data && data.button && data.handler) {
                data.button.removeEventListener('click', data.handler);
            }
        });
        
        this.buttonHandlers.clear();
        this.isInitialized = false;
        this.editor = null;
        this.savedRange = null;
        
        console.log('EditorService destroyed');
    }
}