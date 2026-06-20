const USER_API = "http://192.168.3.124:8001";
const LINK_API = "http://192.168.3.124:8000";

function showResult(text) {
    const container = document.getElementById('result-container');
    const resultBlock = document.getElementById('result');
    if (container && resultBlock) {
        resultBlock.innerHTML = text;
        container.classList.remove('hidden');
    }
}

function closeResult() {
    document.getElementById('result-container').classList.add('hidden');
}

function updateUsersCount(count) {
    const badge = document.getElementById('users-count');
    if (badge) badge.textContent = count;
}

// ===== ПОЛЬЗОВАТЕЛИ =====
async function createUser() {
    const id = document.getElementById('user_id').value.trim();
    if (!id) return alert("Введите ID пользователя");

    try {
        const res = await fetch(`${USER_API}/user/${id}`, { method: 'POST' });
        const text = await res.text();

        if (res.status === 201 || res.status === 200) {
            await loadUsers();
            showResult(`✅ Пользователь "${id}" создан!`);
            document.getElementById('user_id').value = '';
        } else if (res.status === 400) {
            try {
                const errorData = JSON.parse(text);
                showResult(`❌ ${errorData.detail || 'Ошибка при создании пользователя.'}`);
            } catch {
                showResult(`❌ ${text || 'Ошибка при создании пользователя.'}`);
            }
        } else {
            showResult(`❌ Ошибка ${res.status}: ${text || 'Неизвестная ошибка'}`);
        }
    } catch (err) {
        showResult(`💥 Ошибка сети: ${err.message}`);
    }
}

async function deleteUser() {
    const id = document.getElementById('delete_user_id').value.trim();
    if (!id) return alert("Введите ID пользователя");

    try {
        const res = await fetch(`${USER_API}/user/${id}`, { method: 'DELETE' });

        if (res.status === 200) {
            showResult(`✅ Пользователь "${id}" удалён!`);
            await loadUsers();
            document.getElementById('delete_user_id').value = '';
        } else if (res.status === 404) {
            showResult(`❌ Пользователь "${id}" не найден.`);
        } else {
            const text = await res.text();
            showResult(`❌ Ошибка ${res.status}: ${text}`);
        }
    } catch (err) {
        showResult(`💥 Ошибка сети: ${err.message}`);
    }
}

// ===== ССЫЛКИ =====
async function createLink() {
    const user = document.getElementById('link_user').value.trim();
    const url = document.getElementById('original_url').value.trim();
    if (!user || !url) return alert("Заполните оба поля");

    try {
        const res = await fetch(`${LINK_API}/user/${user}/urls`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        const text = await res.text();

        if (res.status === 201 || res.status === 200) {
            showResult(`✅ Ссылка создана!\n${text}`);
            document.getElementById('link_user').value = '';
            document.getElementById('original_url').value = '';
        } else if (res.status === 404) {
            showResult(`❌ Пользователь "${user}" не найден.`);
        } else {
            showResult(`❌ Ошибка ${res.status}: ${text}`);
        }
    } catch (err) {
        showResult(`💥 Ошибка сети: ${err.message}`);
    }
}

async function listLinks() {
    const user = document.getElementById('list_user').value.trim();
    if (!user) return alert("Введите ID пользователя");

    try {
        const res = await fetch(`${LINK_API}/user/${user}/urls`);
        const data = await res.json();

        if (res.status === 200) {
            const links = data.links || [];
            if (links.length === 0) {
                showResult(`📂 У пользователя "${user}" пока нет ссылок.`);
                return;
            }
            let html = `<h4>Ссылки пользователя "${user}":</h4><ul class="links-list">`;
            links.forEach(link => {
                const shortUrl = `${LINK_API}/${link.short_code}`;
                html += `
                    <li>
                        <div class="link-info">
                            🔗 <strong>${link.short_code}</strong>
                            <br>
                            → <a href="${link.original_url}" target="_blank">${link.original_url.slice(0, 60)}...</a>
                        </div>
                        <div class="link-actions">
                            <button class="stats-btn" onclick="getClicksByCode('${link.short_code}')">📊</button>
                            <button class="delete-btn" onclick="deleteLink('${user}', '${link.short_code}')">🗑️</button>
                        </div>
                    </li>
                `;
            });
            html += `</ul>`;
            showResult(html);
        } else {
            showResult(`❌ ${data.detail || 'Ошибка'}`);
        }
    } catch (err) {
        showResult(`💥 Ошибка сети: ${err.message}`);
    }
}

// ===== СТАТИСТИКА =====
async function getClicks() {
    const code = document.getElementById('stats_code').value.trim();
    if (!code) return alert("Введите короткий код");
    await getClicksByCode(code);
}

async function getClicksByCode(code) {
    try {
        const res = await fetch(`${LINK_API}/short_code/${code}/clicks`);
        const data = await res.json();

        if (res.status === 200) {
            showResult(`📊 Статистика по ссылке "${data.short_code}":\n\n👉 Переходов: ${data.clicks}`);
        } else {
            showResult(`❌ ${data.detail || 'Ссылка не найдена'}`);
        }
    } catch (err) {
        showResult(`💥 Ошибка сети: ${err.message}`);
    }
}

// ===== УДАЛЕНИЕ ССЫЛКИ =====
async function deleteLink(user, code) {
    if (!confirm(`Удалить ссылку "${code}"?`)) return;

    try {
        const res = await fetch(`${LINK_API}/user/${user}/url/${code}`, { method: 'DELETE' });
        const data = await res.json();

        if (res.status === 200) {
            showResult(`✅ Ссылка "${code}" удалена!`);
            // Обновляем список, если он открыт
            const listUser = document.getElementById('list_user').value.trim();
            if (listUser === user) await listLinks();
        } else {
            showResult(`❌ ${data.detail || 'Ошибка при удалении'}`);
        }
    } catch (err) {
        showResult(`💥 Ошибка сети: ${err.message}`);
    }
}

// ===== ПОЛЬЗОВАТЕЛИ (загрузка) =====
async function loadUsers() {
    try {
        const res = await fetch(`${USER_API}/users`);
        if (res.ok) {
            const data = await res.json();
            renderUsers(data.users || []);
        }
    } catch (err) {
        console.warn("Не удалось загрузить пользователей", err);
    }
}

function renderUsers(users) {
    const container = document.getElementById('users-list');
    if (!container) return;

    updateUsersCount(users.length);

    if (users.length === 0) {
        container.innerHTML = '<span class="placeholder">Пользователей пока нет</span>';
        return;
    }

    container.innerHTML = users.map(u =>
        `<span class="user-tag">👤 ${u.user_id} <small>(${u.created_at?.slice(0, 10)})</small></span>`
    ).join('');
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
});