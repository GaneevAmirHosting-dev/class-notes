export class StateManager {
    constructor() {
        this.currentState = {
            selectedClass: null,
            selectedRole: null,
            userData: null,
            pendingChanges: []
        };
        
        this.storageKeys = {
            LAST_KEY: 'school_last_key',
            LAST_CLASS: 'school_last_class',
            LAST_ROLE: 'school_last_role',
            HOMEWORK: 'homeworkData',
            GALLERY: 'galleryData',
            PENDING: 'pendingChanges'
        };
    }
    
    getState() {
        return { ...this.currentState };
    }
    
    setState(updates) {
        this.currentState = { ...this.currentState, ...updates };
    }
    
    getSelectedClass() {
        return this.currentState.selectedClass;
    }
    
    setSelectedClass(className) {
        this.currentState.selectedClass = className;
    }
    
    getSelectedRole() {
        return this.currentState.selectedRole;
    }
    
    setSelectedRole(role) {
        this.currentState.selectedRole = role;
    }
    
    getUserData() {
        return this.currentState.userData;
    }
    
    setUserData(userData) {
        this.currentState.userData = userData;
    }
    
    getPendingChanges() {
        return [...this.currentState.pendingChanges];
    }
    
    addPendingChange(change) {
        this.currentState.pendingChanges.push({
            ...change,
            timestamp: Date.now(),
            id: Math.random().toString(36).substr(2, 9)
        });
        this.savePendingChanges();
    }
    
    removePendingChange(changeId) {
        this.currentState.pendingChanges = this.currentState.pendingChanges.filter(
            change => change.id !== changeId
        );
        this.savePendingChanges();
    }
    
    clearPendingChanges() {
        this.currentState.pendingChanges = [];
        this.savePendingChanges();
    }
    
    canUserEdit() {
        if (!this.currentState.userData) return false;
        const editorRoles = ['admin', 'subadmin', 'elder'];
        return editorRoles.includes(this.currentState.userData.type);
    }
    
    getUserClass() {
        if (!this.currentState.userData) return null;
        
        if (this.currentState.userData.userType === 'admin') {
            return this.currentState.selectedClass || '10-M';
        }
        
        return this.currentState.userData.class;
    }
    
    getRoleDisplayName(roleType) {
        const roleNames = {
            'admin': 'Администратор',
            'subadmin': 'Суб-админ',
            'tester': 'Тестировщик',
            'elder': 'Староста',
            'student': 'Ученик'
        };
        return roleNames[roleType] || roleType;
    }
    
    // Работа с localStorage
    saveCredentials(key, className, role) {
        localStorage.setItem(this.storageKeys.LAST_KEY, key);
        localStorage.setItem(this.storageKeys.LAST_CLASS, className);
        localStorage.setItem(this.storageKeys.LAST_ROLE, role);
    }
    
    getSavedCredentials() {
        return {
            key: localStorage.getItem(this.storageKeys.LAST_KEY),
            className: localStorage.getItem(this.storageKeys.LAST_CLASS),
            role: localStorage.getItem(this.storageKeys.LAST_ROLE)
        };
    }
    
    clearCredentials() {
        localStorage.removeItem(this.storageKeys.LAST_KEY);
        localStorage.removeItem(this.storageKeys.LAST_CLASS);
        localStorage.removeItem(this.storageKeys.LAST_ROLE);
    }
    
    savePendingChanges() {
        localStorage.setItem(
            this.storageKeys.PENDING, 
            JSON.stringify(this.currentState.pendingChanges)
        );
    }
    
    loadPendingChanges() {
        const pending = localStorage.getItem(this.storageKeys.PENDING);
        if (pending) {
            this.currentState.pendingChanges = JSON.parse(pending);
        }
    }
    
    reset() {
        this.currentState = {
            selectedClass: null,
            selectedRole: null,
            userData: null,
            pendingChanges: this.currentState.pendingChanges // Сохраняем ожидающие изменения
        };
    }
}