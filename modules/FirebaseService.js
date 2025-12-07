export class FirebaseService {
    static instance = null;
    
    constructor() {
        if (FirebaseService.instance) {
            return FirebaseService.instance;
        }
        
        const firebaseConfig = {
            apiKey: "AIzaSyCSq4TsWgG1k25auTQRPINE_GZ3oCYE9q4",
            authDomain: "note-home-work-all.firebaseapp.com",
            databaseURL: "https://note-home-work-all-default-rtdb.europe-west1.firebasedatabase.app",
            projectId: "note-home-work-all",
            storageBucket: "note-home-work-all.firebasestorage.app",
            messagingSenderId: "994706152544",
            appId: "1:994706152544:web:77a415a313b5fd5348b705",
            measurementId: "G-BYKKZ0KXK1"
        };
        
        firebase.initializeApp(firebaseConfig);
        this.database = firebase.database();
        FirebaseService.instance = this;
    }
    
    static getInstance() {
        if (!FirebaseService.instance) {
            FirebaseService.instance = new FirebaseService();
        }
        return FirebaseService.instance;
    }
    
    // Универсальные методы
    async getData(path) {
        const snapshot = await this.database.ref(path).once('value');
        return snapshot.val();
    }
    
    async setData(path, data) {
        await this.database.ref(path).set(data);
    }
    
    async updateData(path, data) {
        await this.database.ref(path).update(data);
    }
    
    async deleteData(path) {
        await this.database.ref(path).remove();
    }
    
    onDataChange(path, callback) {
        const ref = this.database.ref(path);
        ref.on('value', (snapshot) => callback(snapshot.val()));
        return () => ref.off('value', callback);
    }
    
    // Специфичные методы для структуры классов
    getClassPath(className) {
        return `classes/${className}`;
    }
    
    getGalleryPath(className) {
        return `classes/${className}/gallery`;
    }
    
    getUsersPath(className = null) {
        return className ? `users/${className}` : 'users';
    }
}