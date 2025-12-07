export class CacheService {
    constructor() {
        this.storageKeys = {
            HOMEWORK: 'homeworkData',
            GALLERY: 'galleryData'
        };
    }
    
    // Домашние задания
    saveHomework(className, homeworkData) {
        const cached = this.getHomeworkCache();
        cached[className] = homeworkData;
        localStorage.setItem(this.storageKeys.HOMEWORK, JSON.stringify(cached));
    }
    
    getHomework(className) {
        const cached = this.getHomeworkCache();
        return cached[className] || null;
    }
    
    getHomeworkCache() {
        return JSON.parse(localStorage.getItem(this.storageKeys.HOMEWORK) || '{}');
    }
    
    // Галерея
    saveGallery(className, galleryData) {
        const cached = this.getGalleryCache();
        cached[className] = galleryData;
        localStorage.setItem(this.storageKeys.GALLERY, JSON.stringify(cached));
    }
    
    getGallery(className) {
        const cached = this.getGalleryCache();
        return cached[className] || null;
    }
    
    getGalleryCache() {
        return JSON.parse(localStorage.getItem(this.storageKeys.GALLERY) || '{}');
    }
    
    // Удаление изображения из кеша
    deleteImageFromCache(className, fileName) {
        const cached = this.getGalleryCache();
        if (cached[className] && cached[className][fileName]) {
            delete cached[className][fileName];
            this.saveGallery(className, cached[className]);
        }
    }
    
    // Добавление изображения в кеш
    addImageToCache(className, fileName, imageData) {
        const cached = this.getGalleryCache();
        if (!cached[className]) cached[className] = {};
        cached[className][fileName] = imageData;
        this.saveGallery(className, cached[className]);
    }
    
    // Очистка всех кешей
    clearAll() {
        localStorage.removeItem(this.storageKeys.HOMEWORK);
        localStorage.removeItem(this.storageKeys.GALLERY);
    }
    
    // Получение размера кеша
    getCacheSize() {
        let total = 0;
        const keys = [this.storageKeys.HOMEWORK, this.storageKeys.GALLERY];
        
        keys.forEach(key => {
            const item = localStorage.getItem(key);
            if (item) {
                total += item.length * 2; // Примерный размер в байтах
            }
        });
        
        return (total / 1024 / 1024).toFixed(2); // MB
    }
}