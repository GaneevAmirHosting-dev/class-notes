// Конфигурация Firebase
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

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Текущее состояние приложения
let currentState = {
    selectedClass: null,
    selectedRole: null,
    userData: null,
    pendingChanges: []
};

// Ключи для LocalStorage
const STORAGE_KEYS = {
    LAST_KEY: 'school_last_key',
    LAST_CLASS: 'school_last_class',
    LAST_ROLE: 'school_last_role',
    HOMEWORK: 'homeworkData',
    GALLERY: 'galleryData',
    PENDING: 'pendingChanges'
};

// Анимации и утилиты
const Animations = {
    pulse: (element) => {
        element.style.transform = 'scale(1.05)';
        setTimeout(() => element.style.transform = 'scale(1)', 300);
    },
    
    bounce: (element) => {
        element.style.transform = 'translateY(-5px)';
        setTimeout(() => element.style.transform = 'translateY(0)', 300);
    },
    
    shake: (element) => {
        element.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => element.style.animation = '', 500);
    },
    
    fadeIn: (element) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        setTimeout(() => {
            element.style.transition = 'all 0.5s ease';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 50);
    }
};

// Добавляем CSS анимацию shake
const shakeStyles = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-8px); }
    75% { transform: translateX(8px); }
}
`;
document.head.insertAdjacentHTML('beforeend', `<style>${shakeStyles}</style>`);

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    debugState();
    
    // Ждем полной загрузки DOM
    if (document.readyState !== 'complete') {
        await new Promise(resolve => window.addEventListener('load', resolve));
    }
    
    // ВСЕГДА начинаем с экрана выбора класса
    showClassSelection();
    
    setupEventListeners();
}

function debugState() {
    console.log('=== DEBUG STATE ===');
    console.log('Saved key:', localStorage.getItem(STORAGE_KEYS.LAST_KEY));
    console.log('Saved class:', localStorage.getItem(STORAGE_KEYS.LAST_CLASS));
    console.log('Saved role:', localStorage.getItem(STORAGE_KEYS.LAST_ROLE));
    console.log('Current state:', currentState);
    console.log('=== END DEBUG ===');
}

// Загрузка кешированных данных (для уже вошедших пользователей)
function loadCachedData() {
    // Загружаем домашние задания из кеша
    const cachedHomework = localStorage.getItem(STORAGE_KEYS.HOMEWORK);
    if (cachedHomework) {
        const homeworkData = JSON.parse(cachedHomework);
        displayHomeworkFromCache(homeworkData);
    }
    
    // Загружаем галерею из кеша
    const cachedGallery = localStorage.getItem(STORAGE_KEYS.GALLERY);
    if (cachedGallery) {
        const galleryData = JSON.parse(cachedGallery);
        displayGalleryFromCache(galleryData);
    }
    
    // Загружаем ожидающие изменения
    const pendingChanges = localStorage.getItem(STORAGE_KEYS.PENDING);
    if (pendingChanges) {
        currentState.pendingChanges = JSON.parse(pendingChanges);
    }
}

// Синхронизация ожидающих изменений
async function syncPendingChanges() {
    if (currentState.pendingChanges.length === 0) return;
    
    showMessage('🔄 Синхронизация изменений...', 'info');
    
    const successfulSyncs = [];
    
    for (const change of currentState.pendingChanges) {
        try {
            switch (change.type) {
                case 'homework':
                    await database.ref(`classes/${change.class}`).update({
                        homework: change.data,
                        lastUpdate: new Date().toLocaleString('ru-RU')
                    });
                    successfulSyncs.push(change);
                    break;
                    
                case 'gallery':
                    await database.ref(`gallery/${change.class}/${change.fileName}`).set(change.data);
                    successfulSyncs.push(change);
                    break;
                    
                case 'delete_image':
                    await database.ref(`gallery/${change.class}/${change.fileName}`).remove();
                    successfulSyncs.push(change);
                    break;
            }
        } catch (error) {
            console.error('Ошибка синхронизации:', error);
        }
    }
    
    // Удаляем успешно синхронизированные изменения
    currentState.pendingChanges = currentState.pendingChanges.filter(
        change => !successfulSyncs.includes(change)
    );
    
    // Сохраняем обновленный список ожидающих изменений
    localStorage.setItem(STORAGE_KEYS.PENDING, JSON.stringify(currentState.pendingChanges));
    
    if (successfulSyncs.length > 0) {
        showMessage(`✅ Синхронизировано ${successfulSyncs.length} изменений`, 'success');
    }
}

function setupEventListeners() {
    // Выбор класса
    document.querySelectorAll('.class-card').forEach(card => {
        card.addEventListener('click', (e) => {
            Animations.pulse(e.target);
            setTimeout(() => {
                currentState.selectedClass = e.target.dataset.class;
                showRoleSelection();
            }, 300);
        });
    });

    // Выбор роли
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            Animations.pulse(e.target);
            setTimeout(() => {
                currentState.selectedRole = e.target.dataset.role;
                showKeyInput();
            }, 300);
        });
    });

    // Навигация назад
    document.getElementById('back-to-class').addEventListener('click', showClassSelection);
    document.getElementById('back-to-role').addEventListener('click', showRoleSelection);

    // Ввод ключа
    document.getElementById('submit-key').addEventListener('click', checkAccessKey);
    document.getElementById('access-key').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkAccessKey();
    });

    // Выход
    document.getElementById('logout').addEventListener('click', logout);

    // Сохранение ДЗ
    document.getElementById('save-homework').addEventListener('click', saveHomework);

    // Галерея Base64
    setupGalleryEvents();
}

function setupGalleryEvents() {
    const fileInput = document.getElementById('base64-file-input');
    const selectBtn = document.getElementById('select-file-btn');
    const uploadArea = document.getElementById('base64-upload-area');
    
    selectBtn.addEventListener('click', () => {
        Animations.bounce(selectBtn);
        setTimeout(() => fileInput.click(), 150);
    });
    
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag & Drop
    setupDragAndDrop(uploadArea, fileInput);
}

function setupDragAndDrop(uploadArea, fileInput) {
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
        Animations.pulse(uploadArea);
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect({ target: { files: e.dataTransfer.files } });
        }
    });
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showMessage('❌ Пожалуйста, выберите файл изображения (JPG, PNG, GIF)', 'error');
        Animations.shake(document.getElementById('base64-upload-area'));
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showMessage('❌ Файл слишком большой. Максимальный размер: 5MB', 'error');
        Animations.shake(document.getElementById('base64-upload-area'));
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        showFilePreview(e.target.result, file.name, file.size);
    };
    reader.onerror = function() {
        showMessage('❌ Ошибка чтения файла', 'error');
    };
    reader.readAsDataURL(file);
}

function showFilePreview(base64Data, fileName, fileSize) {
    const preview = document.getElementById('file-preview');
    const previewImg = document.getElementById('preview-img');
    
    previewImg.src = base64Data;
    previewImg.alt = fileName;
    
    const fileInfo = `
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
    `;
    
    preview.innerHTML = `
        <div class="preview-container">
            <img id="preview-img" src="${base64Data}" alt="${fileName}">
            ${fileInfo}
        </div>
    `;
    
    preview.classList.remove('hidden');
    Animations.fadeIn(preview);
    
    document.getElementById('confirm-upload-btn').addEventListener('click', () => {
        uploadBase64Image(base64Data, fileName);
    });
    
    document.getElementById('cancel-upload-btn').addEventListener('click', resetUploadForm);
}

function uploadBase64Image(base64Data, fileName) {
    if (!currentState.userData) {
        showMessage('❌ Нет активной сессии', 'error');
        return;
    }

    if (!canUserEdit()) {
        showMessage('❌ У вас нет прав для загрузки изображений', 'error');
        return;
    }

    const classToUpload = currentState.userData.userType === 'admin' ? 
        (currentState.selectedClass || '10-M') : currentState.userData.class;

    const imageData = {
        url: base64Data,
        fileName: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        originalName: fileName || 'Изображение',
        uploadedBy: currentState.userData.key,
        uploadedAt: new Date().toLocaleString('ru-RU'),
        timestamp: Date.now(),
        type: 'base64',
        size: base64Data.length
    };

    // 1. Сразу сохраняем в кеш
    const cachedGallery = JSON.parse(localStorage.getItem(STORAGE_KEYS.GALLERY) || '{}');
    if (!cachedGallery[classToUpload]) cachedGallery[classToUpload] = {};
    cachedGallery[classToUpload][imageData.fileName] = imageData;
    saveToCache(STORAGE_KEYS.GALLERY, cachedGallery);

    // 2. Добавляем в очередь на синхронизацию
    addPendingChange({
        type: 'gallery',
        class: classToUpload,
        fileName: imageData.fileName,
        data: imageData
    });

    // 3. Сразу показываем в интерфейсе
    displayGalleryFromCache(cachedGallery);

    showMessage('✅ Изображение добавлено в галерею!', 'success');
    resetUploadForm();
    Animations.pulse(document.getElementById('gallery-container'));

    // 4. Пробуем сразу синхронизировать с Firebase
    syncSingleChange({
        type: 'gallery',
        class: classToUpload,
        fileName: imageData.fileName,
        data: imageData
    });
}

async function syncSingleChange(change) {
    try {
        switch (change.type) {
            case 'homework':
                await database.ref(`classes/${change.class}`).update({
                    homework: change.data,
                    lastUpdate: new Date().toLocaleString('ru-RU')
                });
                break;
                
            case 'gallery':
                await database.ref(`gallery/${change.class}/${change.fileName}`).set(change.data);
                break;
                
            case 'delete_image':
                await database.ref(`gallery/${change.class}/${change.fileName}`).remove();
                break;
        }
        
        // Удаляем из очереди при успешной синхронизации
        currentState.pendingChanges = currentState.pendingChanges.filter(
            pending => pending.id !== change.id
        );
        localStorage.setItem(STORAGE_KEYS.PENDING, JSON.stringify(currentState.pendingChanges));
        
    } catch (error) {
        console.error('Ошибка синхронизации:', error);
    }
}

function resetUploadForm() {
    const preview = document.getElementById('file-preview');
    const fileInput = document.getElementById('base64-file-input');
    
    preview.classList.add('hidden');
    preview.innerHTML = '';
    fileInput.value = '';
}

// Навигация между экранами
function showClassSelection() {
    hideAllScreens();
    const screen = document.getElementById('class-selection');
    screen.classList.remove('hidden');
    Animations.fadeIn(screen);
    resetState();
    
    // Добавляем кнопку быстрого входа если есть сохраненный ключ
    addQuickLoginButton();
}

let quickLoginButtonAdded = false;

function addQuickLoginButton() {
    const savedKey = localStorage.getItem(STORAGE_KEYS.LAST_KEY);
    const savedClass = localStorage.getItem(STORAGE_KEYS.LAST_CLASS);
    const savedRole = localStorage.getItem(STORAGE_KEYS.LAST_ROLE);
    
    if (savedKey && savedClass && savedRole && !quickLoginButtonAdded) {
        // Удаляем старую кнопку если есть
        const oldBtn = document.getElementById('quick-login-btn');
        if (oldBtn) {
            oldBtn.remove();
        }
        
        quickLoginButtonAdded = true;
        
        const quickLoginBtn = document.createElement('button');
        quickLoginBtn.id = 'quick-login-btn';
        quickLoginBtn.className = 'quick-login-btn';
        quickLoginBtn.innerHTML = `
            <div class="quick-login-content">
                <span class="quick-login-icon">🚀</span>
                <div class="quick-login-info">
                    <div class="quick-login-title">Быстрый вход</div>
                    <div class="quick-login-details">
                        <span>🏫 ${savedClass}</span>
                        <span>👤 ${getRoleDisplayName(savedRole)}</span>
                    </div>
                </div>
            </div>
            <div class="quick-login-hint">Нажмите для входа</div>
        `;
        
        // Добавляем стили только один раз
        if (!document.querySelector('#quick-login-styles')) {
            const quickLoginStyles = `
                #quick-login-styles {
                    display: none;
                }
                .quick-login-btn {
                    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                    border: none;
                    border-radius: 25px;
                    padding: 20px 25px;
                    color: white;
                    font-size: 16px;
                    cursor: pointer;
                    transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                    width: 100%;
                    max-width: 450px;
                    margin: 20px auto;
                    text-align: left;
                    position: relative;
                    overflow: hidden;
                }
                
                .quick-login-btn:hover {
                    transform: translateY(-5px) scale(1.02);
                    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
                    background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
                }
                
                .quick-login-btn:active {
                    transform: translateY(-2px) scale(1.01);
                }
                
                .quick-login-content {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }
                
                .quick-login-icon {
                    font-size: 32px;
                    animation: pulse 2s infinite;
                }
                
                .quick-login-info {
                    flex: 1;
                }
                
                .quick-login-title {
                    font-weight: bold;
                    font-size: 18px;
                    margin-bottom: 5px;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                
                .quick-login-details {
                    display: flex;
                    gap: 15px;
                    font-size: 14px;
                    opacity: 0.9;
                }
                
                .quick-login-details span {
                    background: rgba(255,255,255,0.2);
                    padding: 4px 10px;
                    border-radius: 10px;
                }
                
                .quick-login-hint {
                    position: absolute;
                    right: 20px;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 14px;
                    opacity: 0.8;
                    background: rgba(255,255,255,0.2);
                    padding: 5px 10px;
                    border-radius: 10px;
                }
                
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
            `;
            
            const styleElement = document.createElement('style');
            styleElement.id = 'quick-login-styles';
            styleElement.textContent = quickLoginStyles;
            document.head.appendChild(styleElement);
        }
        
        // Обработчик клика
        quickLoginBtn.addEventListener('click', () => {
            Animations.pulse(quickLoginBtn);
            // Автоматически заполняем все поля
            currentState.selectedClass = savedClass;
            currentState.selectedRole = savedRole;
            showKeyInputWithAutofill(savedKey, savedClass, savedRole);
        });
        
        // Добавляем кнопку на экран выбора класса (перед списком классов)
        const classGrid = document.querySelector('.class-grid');
        const title = document.querySelector('#class-selection h1');
        
        // Вставляем после заголовка, но перед сеткой классов
        title.parentNode.insertBefore(quickLoginBtn, classGrid);
    }
}

function showRoleSelection() {
    hideAllScreens();
    const screen = document.getElementById('role-selection');
    screen.classList.remove('hidden');
    Animations.fadeIn(screen);
}

function showKeyInput() {
    hideAllScreens();
    const screen = document.getElementById('key-input');
    screen.classList.remove('hidden');
    Animations.fadeIn(screen);
    document.getElementById('access-key').value = '';
    document.getElementById('access-key').focus();
}

function showKeyInputWithAutofill(savedKey, savedClass, savedRole) {
    hideAllScreens();
    const screen = document.getElementById('key-input');
    screen.classList.remove('hidden');
    Animations.fadeIn(screen);
    
    // Удаляем старые элементы автозаполнения если есть
    const oldAutofill = document.querySelector('.autofill-info');
    if (oldAutofill) {
        oldAutofill.remove();
    }
    
    const oldChangeBtn = document.getElementById('change-credentials');
    if (oldChangeBtn) {
        oldChangeBtn.remove();
    }
    
    // Автозаполняем выбранный класс и роль в интерфейсе
    const roleText = document.createElement('div');
    roleText.className = 'autofill-info';
    roleText.innerHTML = `
        <div class="autofill-badge" style="
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 15px;
            padding: 15px;
            margin: 20px 0;
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            align-items: center;
            gap: 15px;
        ">
            <div style="display: flex; gap: 20px;">
                <span>🏫 Класс: ${savedClass}</span>
                <span>👤 Роль: ${getRoleDisplayName(savedRole)}</span>
            </div>
            <button id="change-credentials" class="change-btn" style="
                background: rgba(255,255,255,0.2);
                border: 1px solid rgba(255,255,255,0.3);
                color: white;
                padding: 8px 15px;
                border-radius: 10px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s;
            ">✏️ Изменить</button>
        </div>
    `;
    
    // Вставляем перед полем ввода
    const inputContainer = document.querySelector('#key-input h2');
    inputContainer.parentNode.insertBefore(roleText, inputContainer.nextSibling);
    
    // Заполняем поле ключа
    const keyInput = document.getElementById('access-key');
    keyInput.value = savedKey;
    keyInput.focus();
    keyInput.select();
    
    // Добавляем обработчик для кнопки "Изменить"
    document.getElementById('change-credentials').addEventListener('click', () => {
        clearSavedCredentials();
        quickLoginButtonAdded = false; // Сбрасываем флаг
        showClassSelection();
    });
}

// Обновляем функцию showClassSelection
function showClassSelection() {
    hideAllScreens();
    const screen = document.getElementById('class-selection');
    screen.classList.remove('hidden');
    Animations.fadeIn(screen);
    resetState();
    
    // Сбрасываем флаг при показе экрана выбора класса
    quickLoginButtonAdded = false;
    
    // Добавляем кнопку быстрого входа если есть сохраненный ключ
    addQuickLoginButton();
}

// Обновляем функцию clearSavedCredentials
function clearSavedCredentials() {
    localStorage.removeItem(STORAGE_KEYS.LAST_KEY);
    localStorage.removeItem(STORAGE_KEYS.LAST_CLASS);
    localStorage.removeItem(STORAGE_KEYS.LAST_ROLE);
    
    // Удаляем кнопку быстрого входа если она есть
    const quickLoginBtn = document.getElementById('quick-login-btn');
    if (quickLoginBtn) {
        quickLoginBtn.remove();
    }
    quickLoginButtonAdded = false;
}

// Обновляем функцию logout
function logout() {
    Animations.pulse(document.getElementById('logout'));
    showMessage('👋 Выход из системы...', 'info');
    
    setTimeout(() => {
        // Очищаем пользовательские данные
        currentState.userData = null;
        quickLoginButtonAdded = false; // Сбрасываем флаг
        
        // Показываем экран выбора класса (там будет кнопка быстрого входа)
        showClassSelection();
    }, 1000);
}

// Добавляем проверку при изменении ключа в checkAccessKey
async function checkAccessKey() {
    const key = document.getElementById('access-key').value.trim();
    const keyInput = document.getElementById('access-key');
    
    if (!key) {
        showMessage('❌ Введите ключ доступа', 'error');
        Animations.shake(keyInput);
        return;
    }

    if (!currentState.selectedClass || !currentState.selectedRole) {
        showMessage('❌ Сначала выберите класс и роль', 'error');
        return;
    }

    showMessage('🔍 Проверка ключа...', 'info');
    Animations.pulse(document.getElementById('submit-key'));

    try {
        const allUsersSnapshot = await database.ref('users').once('value');
        const usersData = allUsersSnapshot.val();
        
        if (!usersData) {
            showMessage('❌ Ошибка базы данных', 'error');
            return;
        }

        let userData = null;
        
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
        } else if (usersData[currentState.selectedClass] && usersData[currentState.selectedClass][key]) {
            const user = usersData[currentState.selectedClass][key];
            if (user.active !== false) {
                if (currentState.selectedRole !== user.type) {
                    showMessage(`❌ Ключ не соответствует выбранной роли "${getRoleDisplayName(currentState.selectedRole)}"`, 'error');
                    Animations.shake(keyInput);
                    return;
                }
                
                userData = {
                    ...user,
                    key: key,
                    userType: 'class',
                    class: currentState.selectedClass,
                    loginTime: Date.now()
                };
            }
        }

        if (userData) {
            // Проверяем, отличается ли новый ключ от сохраненного
            const savedKey = localStorage.getItem(STORAGE_KEYS.LAST_KEY);
            const savedClass = localStorage.getItem(STORAGE_KEYS.LAST_CLASS);
            const savedRole = localStorage.getItem(STORAGE_KEYS.LAST_ROLE);
            
            // Если ключ, класс или роль изменились, сохраняем новые данные
            if (key !== savedKey || currentState.selectedClass !== savedClass || currentState.selectedRole !== savedRole) {
                localStorage.setItem(STORAGE_KEYS.LAST_KEY, key);
                localStorage.setItem(STORAGE_KEYS.LAST_CLASS, currentState.selectedClass);
                localStorage.setItem(STORAGE_KEYS.LAST_ROLE, currentState.selectedRole);
                showMessage('🎉 Успешный вход! Ключ сохранен для быстрого входа.', 'success');
            } else {
                showMessage('🎉 Успешный вход!', 'success');
            }
            
            // Обновляем состояние
            currentState.userData = userData;
            showMainScreen();
            loadCachedData();
            await syncPendingChanges();
            
        } else {
            showMessage('❌ Неверный ключ или доступ заблокирован', 'error');
            Animations.shake(keyInput);
        }
    } catch (error) {
        console.error('Ошибка проверки ключа:', error);
        showMessage('📡 Ошибка подключения к базе данных', 'error');
    }
}

function clearSavedCredentials() {
    localStorage.removeItem(STORAGE_KEYS.LAST_KEY);
    localStorage.removeItem(STORAGE_KEYS.LAST_CLASS);
    localStorage.removeItem(STORAGE_KEYS.LAST_ROLE);
}

function showMainScreen() {
    hideAllScreens();
    const screen = document.getElementById('main-screen');
    screen.classList.remove('hidden');
    Animations.fadeIn(screen);
    
    // ОБНОВЛЯЕМ интерфейс с текущими данными
    updateUserInfo();
    
    // Загружаем данные (из кеша или Firebase)
    if (currentState.userData) {
        loadHomework();
        loadGallery();
        setupEditor();
        setupUploadSection();
    } else {
        console.error('No user data in showMainScreen!');
        showMessage('❌ Ошибка: нет данных пользователя', 'error');
        setTimeout(() => showClassSelection(), 2000);
    }
}

function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
}

function resetState() {
    currentState.selectedClass = null;
    currentState.selectedRole = null;
    currentState.userData = null;
}

// Проверка ключа доступа
async function checkAccessKey() {
    const key = document.getElementById('access-key').value.trim();
    const keyInput = document.getElementById('access-key');
    
    if (!key) {
        showMessage('❌ Введите ключ доступа', 'error');
        Animations.shake(keyInput);
        return;
    }

    if (!currentState.selectedClass || !currentState.selectedRole) {
        showMessage('❌ Сначала выберите класс и роль', 'error');
        return;
    }

    showMessage('🔍 Проверка ключа...', 'info');
    Animations.pulse(document.getElementById('submit-key'));

    try {
        const allUsersSnapshot = await database.ref('users').once('value');
        const usersData = allUsersSnapshot.val();
        
        if (!usersData) {
            showMessage('❌ Ошибка базы данных', 'error');
            return;
        }

        let userData = null;
        
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
        } else if (usersData[currentState.selectedClass] && usersData[currentState.selectedClass][key]) {
            const user = usersData[currentState.selectedClass][key];
            if (user.active !== false) {
                if (currentState.selectedRole !== user.type) {
                    showMessage(`❌ Ключ не соответствует выбранной роли "${getRoleDisplayName(currentState.selectedRole)}"`, 'error');
                    Animations.shake(keyInput);
                    return;
                }
                
                userData = {
                    ...user,
                    key: key,
                    userType: 'class',
                    class: currentState.selectedClass,
                    loginTime: Date.now()
                };
            }
        }

        if (userData) {
            // Сохраняем ключ, класс и роль для быстрого входа
            localStorage.setItem(STORAGE_KEYS.LAST_KEY, key);
            localStorage.setItem(STORAGE_KEYS.LAST_CLASS, currentState.selectedClass);
            localStorage.setItem(STORAGE_KEYS.LAST_ROLE, currentState.selectedRole);
            
            // Обновляем состояние
            currentState.userData = userData;
            showMainScreen();
            loadCachedData();
            await syncPendingChanges();
            showMessage('🎉 Успешный вход! Ключ сохранен для быстрого входа.', 'success');
        } else {
            showMessage('❌ Неверный ключ или доступ заблокирован', 'error');
            Animations.shake(keyInput);
        }
    } catch (error) {
        console.error('Ошибка проверки ключа:', error);
        showMessage('📡 Ошибка подключения к базе данных', 'error');
    }
}

function canUserEdit() {
    if (!currentState.userData) return false;
    const editorRoles = ['admin', 'subadmin', 'elder'];
    return editorRoles.includes(currentState.userData.type);
}

function updateUserInfo() {
    const userClass = document.getElementById('user-class');
    const userRole = document.getElementById('user-role');
    
    if (currentState.userData.userType === 'admin') {
        userClass.textContent = `👑 Администрация`;
        userRole.textContent = getRoleDisplayName(currentState.userData.type);
    } else {
        userClass.textContent = `🏫 Класс: ${currentState.userData.class}`;
        userRole.textContent = getRoleDisplayName(currentState.userData.type);
    }
    
    Animations.pulse(userClass);
}

function getRoleDisplayName(roleType) {
    const roleNames = {
        'admin': 'Администратор',
        'subadmin': 'Суб-админ',
        'tester': 'Тестировщик',
        'elder': 'Староста',
        'student': 'Ученик'
    };
    return roleNames[roleType] || roleType;
}

function setupEditor() {
    const editorSection = document.getElementById('editor-section');
    if (canUserEdit()) {
        editorSection.classList.remove('hidden');
        Animations.fadeIn(editorSection);
        loadHomeworkForEditing();
    } else {
        editorSection.classList.add('hidden');
    }
}

function setupUploadSection() {
    const uploadSection = document.getElementById('upload-section');
    if (canUserEdit()) {
        uploadSection.classList.remove('hidden');
        Animations.fadeIn(uploadSection);
    } else {
        uploadSection.classList.add('hidden');
    }
}

function loadHomework() {
    const classToLoad = currentState.userData.userType === 'admin' ? 
        (currentState.selectedClass || '10-M') : currentState.userData.class;

    // Слушаем изменения в Firebase
    database.ref(`classes/${classToLoad}`).on('value', (snapshot) => {
        const classData = snapshot.val();
        
        // Сохраняем в кеш
        const cachedHomework = JSON.parse(localStorage.getItem(STORAGE_KEYS.HOMEWORK) || '{}');
        cachedHomework[classToLoad] = classData;
        saveToCache(STORAGE_KEYS.HOMEWORK, cachedHomework);
        
        displayHomework(classData);
    });
}

function displayHomeworkFromCache(homeworkData) {
    const classToLoad = currentState.userData.userType === 'admin' ? 
        (currentState.selectedClass || '10-M') : currentState.userData.class;

    const classData = homeworkData[classToLoad];
    displayHomework(classData);
}

function displayHomework(classData) {
    const homeworkDisplay = document.getElementById('homework-display');
    
    if (classData && classData.homework) {
        homeworkDisplay.innerHTML = `
            <div class="homework-content">${formatHomework(classData.homework)}</div>
            ${classData.lastUpdate ? `<div class="last-updated">📅 Обновлено: ${classData.lastUpdate}</div>` : ''}
        `;
    } else {
        homeworkDisplay.innerHTML = '<div class="no-homework">📝 Домашние задания пока не добавлены</div>';
    }
    
    Animations.fadeIn(homeworkDisplay);
}

function formatHomework(text) {
    return text
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/_(.*?)_/g, '<u>$1</u>');
}

function loadHomeworkForEditing() {
    const classToLoad = currentState.userData.userType === 'admin' ? 
        (currentState.selectedClass || '10-M') : currentState.userData.class;

    // Показываем данные из кеша сразу
    const cachedHomework = JSON.parse(localStorage.getItem(STORAGE_KEYS.HOMEWORK) || '{}');
    const classData = cachedHomework[classToLoad];
    const homework = (classData && classData.homework) || '';
    
    document.getElementById('homework-editor').value = homework;
    
    const editor = document.getElementById('homework-editor');
    editor.style.opacity = '0';
    setTimeout(() => {
        editor.style.transition = 'opacity 0.5s ease';
        editor.style.opacity = '1';
    }, 100);
}

function saveHomework() {
    if (!currentState.userData) {
        showMessage('❌ Нет активной сессии', 'error');
        return;
    }

    if (!canUserEdit()) {
        showMessage('❌ У вас нет прав для редактирования', 'error');
        return;
    }

    const content = document.getElementById('homework-editor').value.trim();
    const saveBtn = document.getElementById('save-homework');
    
    if (!content) {
        showMessage('📝 Введите домашние задания', 'error');
        Animations.shake(document.getElementById('homework-editor'));
        return;
    }

    const classToUpdate = currentState.userData.userType === 'admin' ? 
        (currentState.selectedClass || '10-M') : currentState.userData.class;

    // 1. Сразу обновляем кеш
    const cachedHomework = JSON.parse(localStorage.getItem(STORAGE_KEYS.HOMEWORK) || '{}');
    if (!cachedHomework[classToUpdate]) cachedHomework[classToUpdate] = {};
    cachedHomework[classToUpdate].homework = content;
    cachedHomework[classToUpdate].lastUpdate = new Date().toLocaleString('ru-RU');
    saveToCache(STORAGE_KEYS.HOMEWORK, cachedHomework);

    // 2. Сразу показываем изменения
    displayHomework(cachedHomework[classToUpdate]);

    // 3. Добавляем в очередь на синхронизацию
    addPendingChange({
        type: 'homework',
        class: classToUpdate,
        data: content
    });

    Animations.pulse(saveBtn);
    showMessage('✅ Домашние задания сохранены локально!', 'success');
    Animations.pulse(document.getElementById('homework-display'));

    // 4. Пробуем сразу синхронизировать с Firebase
    syncSingleChange({
        type: 'homework',
        class: classToUpdate,
        data: content
    });
}

// Галерея изображений
function loadGallery() {
    const classToLoad = currentState.userData.userType === 'admin' ? 
        (currentState.selectedClass || '10-M') : currentState.userData.class;

    // Слушаем изменения в Firebase
    database.ref(`gallery/${classToLoad}`).on('value', (snapshot) => {
        const galleryData = snapshot.val();
        
        // Сохраняем в кеш
        const cachedGallery = JSON.parse(localStorage.getItem(STORAGE_KEYS.GALLERY) || '{}');
        cachedGallery[classToLoad] = galleryData;
        saveToCache(STORAGE_KEYS.GALLERY, cachedGallery);
        
        displayGallery(galleryData);
    });
}

function displayGalleryFromCache(galleryData) {
    const classToLoad = currentState.userData.userType === 'admin' ? 
        (currentState.selectedClass || '10-M') : currentState.userData.class;

    const classGallery = galleryData[classToLoad];
    displayGallery(classGallery);
}

function displayGallery(galleryData) {
    const galleryGrid = document.getElementById('gallery-grid');
    const noImages = document.getElementById('no-images');

    galleryGrid.innerHTML = '';

    if (galleryData) {
        noImages.style.display = 'none';
        
        const images = Object.entries(galleryData)
            .sort(([,a], [,b]) => b.timestamp - a.timestamp);

        let delay = 0;
        images.forEach(([fileName, imageInfo]) => {
            setTimeout(() => {
                const galleryItem = createGalleryItem(fileName, imageInfo);
                galleryGrid.appendChild(galleryItem);
            }, delay);
            delay += 100;
        });
    } else {
        noImages.style.display = 'block';
    }
}

function createGalleryItem(fileName, imageInfo) {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.style.opacity = '0';
    item.style.transform = 'scale(0.8)';
    
    item.innerHTML = `
        <img src="${imageInfo.url}" alt="${imageInfo.originalName}" loading="lazy">
        ${canUserEdit() ? `<button class="delete-image" data-file="${fileName}" title="Удалить изображение">×</button>` : ''}
        <div class="image-info">
            ${formatDate(imageInfo.uploadedAt)}<br>
            📏 ${Math.round(imageInfo.size / 1024)} KB
        </div>
    `;

    setTimeout(() => {
        item.style.transition = 'all 0.5s ease';
        item.style.opacity = '1';
        item.style.transform = 'scale(1)';
    }, 50);

    if (canUserEdit()) {
        const deleteBtn = item.querySelector('.delete-image');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            Animations.pulse(deleteBtn);
            deleteImage(fileName);
        });
    }

    item.addEventListener('click', () => {
        viewImage(imageInfo.url, imageInfo.originalName);
    });

    return item;
}

function formatDate(dateString) {
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

function deleteImage(fileName) {
    if (!confirm('Удалить это изображение из галереи?')) return;

    const classToDelete = currentState.userData.userType === 'admin' ? 
        (currentState.selectedClass || '10-M') : currentState.userData.class;

    // 1. Удаляем из кеша
    const cachedGallery = JSON.parse(localStorage.getItem(STORAGE_KEYS.GALLERY) || '{}');
    if (cachedGallery[classToDelete] && cachedGallery[classToDelete][fileName]) {
        delete cachedGallery[classToDelete][fileName];
        saveToCache(STORAGE_KEYS.GALLERY, cachedGallery);
    }

    // 2. Обновляем интерфейс
    displayGallery(cachedGallery[classToDelete]);

    // 3. Добавляем в очередь на синхронизацию
    addPendingChange({
        type: 'delete_image',
        class: classToDelete,
        fileName: fileName
    });

    showMessage('🗑️ Изображение удалено локально', 'success');

    // 4. Пробуем сразу синхронизировать с Firebase
    syncSingleChange({
        type: 'delete_image',
        class: classToDelete,
        fileName: fileName
    });
}

function viewImage(url, title) {
    const overlay = document.createElement('div');
    overlay.className = 'image-viewer-overlay';
    overlay.style.cssText = `
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

    overlay.innerHTML = `
        <div style="color: white; margin-bottom: 20px; text-align: center;">
            <h3 style="margin-bottom: 10px;">${title || 'Изображение'}</h3>
            <p style="opacity: 0.7; font-size: 14px;">Нажмите anywhere или ESC для закрытия</p>
        </div>
        <img src="${url}" style="max-width: 90%; max-height: 70vh; object-fit: contain; border-radius: 15px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); transform: scale(0.9); transition: transform 0.3s ease;">
    `;

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeImageViewer(overlay);
        }
    });

    setTimeout(() => {
        overlay.style.opacity = '1';
        const img = overlay.querySelector('img');
        img.style.transform = 'scale(1)';
    }, 50);

    const closeHandler = (e) => {
        if (e.key === 'Escape') {
            closeImageViewer(overlay);
        }
    };
    document.addEventListener('keydown', closeHandler);

    document.body.appendChild(overlay);
    
    overlay._closeHandler = closeHandler;
}

function closeImageViewer(overlay) {
    overlay.style.opacity = '0';
    const img = overlay.querySelector('img');
    img.style.transform = 'scale(0.9)';
    
    setTimeout(() => {
        document.removeEventListener('keydown', overlay._closeHandler);
        if (overlay.parentNode) {
            document.body.removeChild(overlay);
        }
    }, 300);
}

function logout() {
    Animations.pulse(document.getElementById('logout'));
    showMessage('👋 Выход из системы...', 'info');
    
    setTimeout(() => {
        // Очищаем пользовательские данные
        currentState.userData = null;
        // Показываем экран выбора класса (там будет кнопка быстрого входа)
        showClassSelection();
    }, 1000);
}

// Сохранение данных в кеш
function saveToCache(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Добавление изменения в очередь
function addPendingChange(change) {
    currentState.pendingChanges.push({
        ...change,
        timestamp: Date.now(),
        id: Math.random().toString(36).substr(2, 9)
    });
    
    localStorage.setItem(STORAGE_KEYS.PENDING, JSON.stringify(currentState.pendingChanges));
}

function showMessage(text, type) {
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const message = document.createElement('div');
    message.className = `message ${type}-message`;
    message.textContent = text;
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
        border: 1px solid var(--glass-border);
        transition: all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
        text-align: center;
        min-width: 300px;
        max-width: 90vw;
        opacity: 0;
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.style.opacity = '1';
        message.style.transform = 'translateX(-50%) translateY(0)';
    }, 50);
    
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

// Глобальные обработчики ошибок
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    showMessage('⚠️ Произошла непредвиденная ошибка', 'error');
});

console.log('🎓 Школьный портал с красивой кнопкой быстрого входа инициализирован!');