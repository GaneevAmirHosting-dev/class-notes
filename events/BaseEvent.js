export class BaseEvent {
    constructor(config) {
        this.name = config.name;
        this.description = config.description;
        this.requiresAdmin = config.requiresAdmin || false;
        this.isActive = false;
        this.adminOnly = config.adminOnly || false;
        this.config = config;
        this.firebase = null;
        this.container = null;
    }
    
    async activate(container, firebaseService) {
        this.isActive = true;
        this.container = container;
        this.firebase = firebaseService;
        
        // Загружаем конфигурацию из Firebase
        await this.loadConfig();
        
        return this;
    }
    
    async deactivate() {
        this.isActive = false;
        if (this.container) {
            this.container.innerHTML = '';
        }
        return this;
    }
    
    async loadConfig() {
        try {
            if (this.firebase) {
                const saved = await this.firebase.getData(`events/config/${this.name}`);
                if (saved) {
                    console.log(`📥 Загружена конфигурация для ${this.name}:`, saved);
                    this.config = { ...this.config, ...saved };
                }
            }
        } catch (error) {
            console.error(`❌ Ошибка загрузки конфигурации для ${this.name}:`, error);
        }
        return this;
    }
    
    async saveConfig() {
        try {
            if (this.firebase) {
                // Сохраняем только основные настройки
                const configToSave = {
                    snowflakeCount: this.config.snowflakeCount,
                    speedMultiplier: this.config.speedMultiplier,
                    windStrength: this.config.windStrength
                };
                
                await this.firebase.setData(`events/config/${this.name}`, configToSave);
                console.log(`💾 Конфигурация сохранена для ${this.name}:`, configToSave);
            }
        } catch (error) {
            console.error(`❌ Ошибка сохранения конфигурации для ${this.name}:`, error);
        }
        return this;
    }
    
    getStatus() {
        return {
            name: this.name,
            description: this.description,
            isActive: this.isActive,
            requiresAdmin: this.requiresAdmin,
            config: this.config
        };
    }
}