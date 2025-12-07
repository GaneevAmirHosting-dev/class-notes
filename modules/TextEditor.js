import { UIAnimations } from './UIAnimations.js';

export class TextEditor {
    constructor() {
        this.editor = document.getElementById('homework-editor');
        this.previewContent = document.getElementById('preview-content');
        this.previewVisible = false;
    }
    
    init() {
        this.setupToolbar();
        this.setupPreview();
        this.setupHotkeys();
    }
    
    setupToolbar() {
        document.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.dataset.action;
                this.applyFormatting(action);
                UIAnimations.pulse(btn);
            });
        });
    }
    
    setupPreview() {
        const previewToggle = document.getElementById('toggle-preview');
        
        previewToggle.addEventListener('click', () => {
            const previewPanel = document.querySelector('.editor-preview');
            this.previewVisible = !this.previewVisible;
            
            if (this.previewVisible) {
                previewPanel.classList.remove('hidden');
                previewToggle.innerHTML = '📝 Редактировать';
                this.updatePreview();
            } else {
                previewPanel.classList.add('hidden');
                previewToggle.innerHTML = '👁️ Предпросмотр';
            }
            
            UIAnimations.pulse(previewToggle);
        });
        
        this.editor.addEventListener('input', () => {
            if (this.previewVisible) {
                this.updatePreview();
            }
        });
    }
    
    setupHotkeys() {
        this.editor.addEventListener('keydown', (e) => {
            if (e.ctrlKey) {
                switch(e.key) {
                    case 'b':
                        e.preventDefault();
                        this.applyFormatting('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.applyFormatting('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        this.applyFormatting('underline');
                        break;
                }
            }
        });
    }
    
    applyFormatting(action) {
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        const text = this.editor.value;
        const selectedText = text.substring(start, end);
        
        let formattedText = '';
        let newCursorPos = 0;
        
        switch(action) {
            case 'bold':
                formattedText = `**${selectedText}**`;
                newCursorPos = start + 2;
                break;
                
            case 'italic':
                formattedText = `*${selectedText}*`;
                newCursorPos = start + 1;
                break;
                
            case 'underline':
                formattedText = `_${selectedText}_`;
                newCursorPos = start + 1;
                break;
                
            case 'link':
                const url = prompt('Введите URL ссылки:', 'https://');
                if (url) {
                    formattedText = `[${selectedText}](${url})`;
                    newCursorPos = start + 1;
                }
                break;
                
            case 'list-ul':
                formattedText = selectedText.split('\n')
                    .map(line => line.trim() ? `• ${line}` : '')
                    .join('\n');
                newCursorPos = start + 2;
                break;
                
            case 'list-ol':
                let counter = 1;
                formattedText = selectedText.split('\n')
                    .map(line => line.trim() ? `${counter++}. ${line}` : '')
                    .join('\n');
                newCursorPos = start + 3;
                break;
                
            case 'color-red':
                formattedText = `[красный]${selectedText}[/красный]`;
                newCursorPos = start + 9;
                break;
                
            case 'color-blue':
                formattedText = `[синий]${selectedText}[/синий]`;
                newCursorPos = start + 7;
                break;
                
            case 'color-green':
                formattedText = `[зеленый]${selectedText}[/зеленый]`;
                newCursorPos = start + 9;
                break;
                
            case 'color-yellow':
                formattedText = `[желтый]${selectedText}[/желтый]`;
                newCursorPos = start + 8;
                break;
                
            case 'header':
                formattedText = `## ${selectedText}`;
                newCursorPos = start + 3;
                break;
                
            case 'code':
                formattedText = `\`${selectedText}\``;
                newCursorPos = start + 1;
                break;
                
            case 'clear':
                formattedText = selectedText
                    .replace(/\*\*(.*?)\*\*/g, '$1')
                    .replace(/\*(.*?)\*/g, '$1')
                    .replace(/_(.*?)_/g, '$1')
                    .replace(/\[(.*?)\](.*?)\[\/(.*?)\]/g, '$2')
                    .replace(/`(.*?)`/g, '$1');
                newCursorPos = start;
                break;
        }
        
        if (formattedText !== '') {
            this.editor.value = text.substring(0, start) + formattedText + text.substring(end);
            this.editor.focus();
            this.editor.setSelectionRange(newCursorPos, newCursorPos + selectedText.length);
            
            if (this.previewVisible) {
                this.updatePreview();
            }
        }
    }
    
    updatePreview() {
        const markdownText = this.editor.value;
        const html = this.formatMarkdown(markdownText);
        this.previewContent.innerHTML = html;
    }
    
    formatMarkdown(text) {
        if (!text) return '';
        
        // Цвета
        let formatted = text
            .replace(/\[красный\](.*?)\[\/красный\]/g, '<span style="color: #ff5252;">$1</span>')
            .replace(/\[синий\](.*?)\[\/синий\]/g, '<span style="color: #448aff;">$1</span>')
            .replace(/\[зеленый\](.*?)\[\/зеленый\]/g, '<span style="color: #00e676;">$1</span>')
            .replace(/\[желтый\](.*?)\[\/желтый\]/g, '<span style="color: #ffcc00;">$1</span>');
        
        // Основное форматирование
        formatted = formatted
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/_(.*?)_/g, '<u>$1</u>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/## (.*?)(<br>|$)/g, '<h4>$1</h4>')
            .replace(/\n• (.*?)(?=\n|$)/g, '<li>$1</li>')
            .replace(/\n\d+\. (.*?)(?=\n|$)/g, '<li>$1</li>')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color: var(--stellar-cyan);">$1</a>');
        
        // Группируем списки
        formatted = formatted
            .replace(/(<li>.*?<\/li>)+/g, (match) => {
                if (match.includes('•')) {
                    return `<ul>${match}</ul>`;
                } else {
                    return `<ol>${match}</ol>`;
                }
            });
        
        return formatted;
    }
    
    getValue() {
        return this.editor.value;
    }
    
    setValue(value) {
        this.editor.value = value;
        if (this.previewVisible) {
            this.updatePreview();
        }
    }
}