
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

// Ключи доступа для редакторов (можете изменить)
const EDITOR_KEYS = ['class2024', 'teacher123', 'secretkey'];

// Проверка ключа доступа
function checkAccess() {
    const key = document.getElementById('access-key').value;
    if (EDITOR_KEYS.includes(key)) {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('editor-section').style.display = 'block';
        loadNotesForEditing();
        showMessage('✅ Доступ разрешен! Теперь вы можете редактировать заметки.', 'success');
    } else {
        showMessage('❌ Неверный ключ доступа. Попробуйте: class2024', 'error');
    }
}

// Загрузка заметок для редактирования
function loadNotesForEditing() {
    database.ref('class_notes').once('value', (snapshot) => {
        const data = snapshot.val();
        if (data && data.content) {
            document.getElementById('notes-editor').value = data.content;
        } else {
            // Первоначальные тестовые данные
            document.getElementById('notes-editor').value = 
                "Понедельник:\n- Математика: №125-126\n- Литература: прочитать стр. 45-50\n\nВторник:\n- История: подготовить доклад\n- Физика: лабораторная работа №3\n\nСреда:\n- Английский: упражнения 5-7\n- Химия: конспект главы 4";
        }
    });
}

// Сохранение заметок
function saveNotes() {
    const content = document.getElementById('notes-editor').value;
    if (!content.trim()) {
        showMessage('⚠️ Заметки не могут быть пустыми!', 'error');
        return;
    }
    
    database.ref('class_notes').set({
        content: content,
        lastUpdated: new Date().toLocaleString('ru-RU'),
        updatedBy: 'editor'
    }).then(() => {
        showMessage('✅ Заметки сохранены! Все пользователи увидят обновление.', 'success');
    }).catch((error) => {
        showMessage('❌ Ошибка сохранения: ' + error.message, 'error');
    });
}

// Выход из режима редактирования
function logout() {
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('editor-section').style.display = 'none';
    document.getElementById('access-key').value = '';
    showMessage('👋 Вы вышли из режима редактирования', 'info');
}

// Real-time обновления для всех пользователей
database.ref('class_notes').on('value', (snapshot) => {
    const data = snapshot.val();
    const displayElement = document.getElementById('notes-display');
    
    if (data && data.content) {
        displayElement.innerHTML = 
            `<div class="notes-content">${data.content.replace(/\n/g, '<br>')}</div>
             <div class="last-updated">📅 Обновлено: ${data.lastUpdated || 'только что'}</div>`;
    } else {
        displayElement.innerHTML = 
            '<div class="no-notes">📝 Заметки пока не добавлены. Попросите старосту добавить домашние задания.</div>';
    }
});

// Вспомогательные функции
function showMessage(text, type) {
    // Удаляем предыдущие сообщения
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const message = document.createElement('div');
    message.className = `message ${type}-message`;
    message.textContent = text;
    message.style.cssText = `
        padding: 12px;
        margin: 10px 0;
        border-radius: 5px;
        text-align: center;
        font-weight: bold;
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
        border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
    `;
    
    document.body.insertBefore(message, document.body.firstChild);
    
    // Автоматически скрываем через 5 секунд
    setTimeout(() => {
        if (message.parentNode) {
            message.remove();
        }
    }, 5000);
}

// Обработка нажатия Enter в поле ключа
document.getElementById('access-key').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        checkAccess();
    }
});

// Загрузка заметок при старте
document.addEventListener('DOMContentLoaded', function() {
    showMessage('🔗 Подключение к базе данных...', 'info');
});