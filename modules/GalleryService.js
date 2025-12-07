import { FirebaseService } from './FirebaseService.js';
import { StateManager } from './StateManager.js';
import { CacheService } from './CacheService.js';
import { UIAnimations } from './UIAnimations.js';

export class GalleryService {
    constructor(firebaseService, stateManager, cacheService) {
        this.firebase = firebaseService;
        this.state = stateManager;
        this.cache = cacheService;
        this.unsubscribe = null;
        this.imageViewerOverlay = null;
    }
    
    async loadGallery() {
        const className = this.state.getUserClass();
        
        // Отписываемся от предыдущих слушателей
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        
        // Подписываемся на изменения в Firebase
        this.unsubscribe = this.firebase.onDataChange(
            `classes/${className}/gallery`,
            (galleryData) => {
                if (galleryData) {
                    // Сохраняем в кеш
                    this.cache.saveGallery(className, galleryData);
                    this.displayGallery(galleryData);
                } else {
                    this.displayGallery({});
                }
            }
        );
        
        // Показываем данные из кеша сразу
        const cachedData = this.cache.getGallery(className);
        if (cachedData) {
            this.displayGallery(cachedData);
        }
    }
    
    displayGallery(galleryData) {
        const galleryGrid = document.getElementById('gallery-grid');
        const noImages = document.getElementById('no-images');
        
        galleryGrid.innerHTML = '';
        
        const images = Object.entries(galleryData || {});
        
        if (images.length > 0) {
            noImages.style.display = 'none';
            
            // Сортируем по времени загрузки (новые первые)
            images.sort(([,a], [,b]) => b.timestamp - a.timestamp);
            
            let delay = 0;
            images.forEach(([fileName, imageInfo]) => {
                setTimeout(() => {
                    const galleryItem = this.createGalleryItem(fileName, imageInfo);
                    galleryGrid.appendChild(galleryItem);
                }, delay);
                delay += 50; // Легкий эффект каскада
            });
        } else {
            noImages.style.display = 'block';
        }
    }
    
    createGalleryItem(fileName, imageInfo) {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.style.opacity = '0';
        item.style.transform = 'scale(0.8)';
        
        const canEdit = this.state.canUserEdit();
        
        item.innerHTML = `
            <img src="${imageInfo.url}" alt="${imageInfo.originalName}" loading="lazy">
            ${canEdit ? `
                <button class="delete-image" data-file="${fileName}" title="Удалить изображение">
                    ×
                </button>
            ` : ''}
            <div class="image-info">
                ${this.formatDate(imageInfo.uploadedAt)}<br>
                📏 ${Math.round(imageInfo.size / 1024)} KB
            </div>
        `;
        
        // Анимация появления
        setTimeout(() => {
            item.style.transition = 'all 0.5s ease';
            item.style.opacity = '1';
            item.style.transform = 'scale(1)';
        }, 50);
        
        // Обработчик удаления для редакторов
        if (canEdit) {
            const deleteBtn = item.querySelector('.delete-image');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                UIAnimations.pulse(deleteBtn);
                this.deleteImage(fileName);
            });
        }
        
        // Просмотр изображения
        item.addEventListener('click', () => {
            this.viewImage(imageInfo.url, imageInfo.originalName);
        });
        
        return item;
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            return 'Сегодня';
        } else if (diffDays === 2) {
            return 'Вчера';
        } else if (diffDays <= 7) {
            return `${diffDays - 1} дней назад`;
        } else {
            return date.toLocaleDateString('ru-RU');
        }
    }
    
    async uploadBase64Image(base64Data, fileName) {
        if (!this.state.getUserData()) {
            UIAnimations.showMessage('❌ Нет активной сессии', 'error');
            return;
        }
        
        if (!this.state.canUserEdit()) {
            UIAnimations.showMessage('❌ У вас нет прав для загрузки изображений', 'error');
            return;
        }
        
        const className = this.state.getUserClass();
        const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const imageData = {
            url: base64Data,
            fileName: imageId,
            originalName: fileName || 'Изображение',
            uploadedBy: this.state.getUserData().key,
            uploadedAt: new Date().toLocaleString('ru-RU'),
            timestamp: Date.now(),
            type: 'base64',
            size: base64Data.length
        };
        
        // Сохраняем в кеш
        this.cache.addImageToCache(className, imageId, imageData);
        
        // Показываем в интерфейсе
        const cachedData = this.cache.getGallery(className);
        this.displayGallery(cachedData);
        
        // Пробуем загрузить на сервер
        try {
            await this.firebase.setData(
                `classes/${className}/gallery/${imageId}`,
                imageData
            );
            
            UIAnimations.showMessage('✅ Изображение загружено на сервер!', 'success');
        } catch (error) {
            console.error('Ошибка загрузки на сервер:', error);
            
            // Добавляем в очередь синхронизации при ошибке
            this.state.addPendingChange({
                type: 'gallery',
                class: className,
                fileName: imageId,
                data: imageData
            });
            
            UIAnimations.showMessage('✅ Изображение сохранено локально (оффлайн)', 'info');
        }
        
        this.resetUploadForm();
        UIAnimations.pulse(document.getElementById('gallery-container'));
    }
    
    async deleteImage(fileName) {
        if (!confirm('Удалить это изображение из галереи?')) return;
        
        const className = this.state.getUserClass();
        
        // Удаляем из кеша
        this.cache.deleteImageFromCache(className, fileName);
        
        // Обновляем интерфейс
        const cachedData = this.cache.getGallery(className);
        this.displayGallery(cachedData);
        
        // Пробуем удалить с сервера
        try {
            await this.firebase.deleteData(
                `classes/${className}/gallery/${fileName}`
            );
            
            UIAnimations.showMessage('🗑️ Изображение удалено с сервера', 'success');
        } catch (error) {
            console.error('Ошибка удаления с сервера:', error);
            
            // Добавляем в очередь синхронизации
            this.state.addPendingChange({
                type: 'delete_image',
                class: className,
                fileName: fileName
            });
            
            UIAnimations.showMessage('🗑️ Изображение удалено локально (оффлайн)', 'info');
        }
    }
    
    viewImage(url, title) {
        // Закрываем предыдущий просмотрщик
        this.closeImageViewer();
        
        this.imageViewerOverlay = document.createElement('div');
        this.imageViewerOverlay.className = 'image-viewer-overlay';
        this.imageViewerOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.95);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        this.imageViewerOverlay.innerHTML = `
            <div style="color: white; margin-bottom: 20px; text-align: center;">
                <h3 style="margin-bottom: 10px;">${title || 'Изображение'}</h3>
                <p style="opacity: 0.7; font-size: 14px;">Нажмите anywhere или ESC для закрытия</p>
            </div>
            <img src="${url}" style="max-width: 90%; max-height: 70vh; object-fit: contain; border-radius: 15px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); transform: scale(0.9); transition: transform 0.3s ease;">
        `;
        
        this.imageViewerOverlay.addEventListener('click', (e) => {
            if (e.target === this.imageViewerOverlay) {
                this.closeImageViewer();
            }
        });
        
        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeImageViewer();
            }
        };
        
        document.addEventListener('keydown', keyHandler);
        this.imageViewerOverlay._keyHandler = keyHandler;
        
        document.body.appendChild(this.imageViewerOverlay);
        
        setTimeout(() => {
            this.imageViewerOverlay.style.opacity = '1';
            const img = this.imageViewerOverlay.querySelector('img');
            img.style.transform = 'scale(1)';
        }, 50);
    }
    
    closeImageViewer() {
        if (this.imageViewerOverlay) {
            const img = this.imageViewerOverlay.querySelector('img');
            if (img) img.style.transform = 'scale(0.9)';
            
            this.imageViewerOverlay.style.opacity = '0';
            
            setTimeout(() => {
                if (this.imageViewerOverlay._keyHandler) {
                    document.removeEventListener('keydown', this.imageViewerOverlay._keyHandler);
                }
                
                if (this.imageViewerOverlay.parentNode) {
                    document.body.removeChild(this.imageViewerOverlay);
                }
                
                this.imageViewerOverlay = null;
            }, 300);
        }
    }
    
    setupUploadSection() {
        const uploadSection = document.getElementById('upload-section');
        if (this.state.canUserEdit()) {
            uploadSection.classList.remove('hidden');
            UIAnimations.fadeIn(uploadSection);
            this.setupGalleryEvents();
        } else {
            uploadSection.classList.add('hidden');
        }
    }
    
    setupGalleryEvents() {
        const fileInput = document.getElementById('base64-file-input');
        const selectBtn = document.getElementById('select-file-btn');
        const uploadArea = document.getElementById('base64-upload-area');
        
        selectBtn.addEventListener('click', () => {
            UIAnimations.bounce(selectBtn);
            setTimeout(() => fileInput.click(), 150);
        });
        
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag & Drop
        this.setupDragAndDrop(uploadArea, fileInput);
    }
    
    setupDragAndDrop(uploadArea, fileInput) {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
            UIAnimations.pulse(uploadArea);
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                this.handleFileSelect({ target: { files: e.dataTransfer.files } });
            }
        });
    }
    
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            UIAnimations.showMessage('❌ Пожалуйста, выберите файл изображения (JPG, PNG, GIF)', 'error');
            UIAnimations.shake(document.getElementById('base64-upload-area'));
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            UIAnimations.showMessage('❌ Файл слишком большой. Максимальный размер: 5MB', 'error');
            UIAnimations.shake(document.getElementById('base64-upload-area'));
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.showFilePreview(e.target.result, file.name, file.size);
        };
        reader.onerror = () => {
            UIAnimations.showMessage('❌ Ошибка чтения файла', 'error');
        };
        reader.readAsDataURL(file);
    }
    
    showFilePreview(base64Data, fileName, fileSize) {
        const preview = document.getElementById('file-preview');
        
        preview.innerHTML = `
            <div class="preview-container">
                <img id="preview-img" src="${base64Data}" alt="${fileName}">
                <div class="preview-info">
                    <p>✅ Файл готов к загрузке</p>
                    <div style="font-size: 14px; margin-bottom: 15px; color: var(--text-lighter);">
                        📝 ${fileName}<br>
                        💾 ${(fileSize / 1024 / 1024).toFixed(2)} MB
                    </div>
                    <button id="confirm-upload-btn" class="upload-confirm-btn">
                        🚀 Загрузить в галерею
                    </button>
                    <button id="cancel-upload-btn" class="upload-cancel-btn">
                        ❌ Отмена
                    </button>
                </div>
            </div>
        `;
        
        preview.classList.remove('hidden');
        UIAnimations.fadeIn(preview);
        
        document.getElementById('confirm-upload-btn').addEventListener('click', () => {
            this.uploadBase64Image(base64Data, fileName);
        });
        
        document.getElementById('cancel-upload-btn').addEventListener('click', () => {
            this.resetUploadForm();
        });
    }
    
    resetUploadForm() {
        const preview = document.getElementById('file-preview');
        const fileInput = document.getElementById('base64-file-input');
        
        preview.classList.add('hidden');
        preview.innerHTML = '';
        fileInput.value = '';
    }
    
    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        
        this.closeImageViewer();
    }
}