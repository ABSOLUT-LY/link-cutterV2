const USER_API = "http://138.124.99.135:8001";
const LINK_API = "http://138.124.99.135:8004";
const BASE_URL = "http://138.124.99.135:8004";

function showResult(text) {
    const container = document.getElementById('result-container');
    const resultBlock = document.getElementById('result');
    if (container && resultBlock) {
        resultBlock.innerHTML = text;
        container.classList.remove('hidden');
    }
}


async function createUser() {
    const id = document.getElementById('user_id').value;
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
        showResult(`💥 Ошибка сети: не удалось связаться с сервером (${err.message})`);
    }
}


async function deleteUser() {
    const id = document.getElementById('delete_user_id').value;
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
        showResult(`💥 Ошибка сети: не удалось связаться с сервером (${err.message})`);
    }
}


async function createLink() {
    const user = document.getElementById('link_user').value;
    const url = document.getElementById('original_url').value;
    if (!user || !url) return alert("Заполните оба поля");

    try {
        const res = await fetch(`${LINK_API}/user/${user}/urls`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        const text = await res.text();

        if (res.status === 201 || res.status === 200) {
            const data = JSON.parse(text);
            const shortUrl = `${BASE_URL}/${data.short_code}`;
            showResult(`✅ Ссылка создана!\n🔗 <a href="${shortUrl}" target="_blank">${shortUrl}</a>`);
            document.getElementById('link_user').value = '';
            document.getElementById('original_url').value = '';
        } else if (res.status === 404) {
            showResult(`❌ Пользователь "${user}" не найден.`);
        } else {
            showResult(`❌ Ошибка ${res.status}: ${text}`);
        }
    } catch (err) {
        showResult(`💥 Ошибка сети: не удалось связаться с сервером (${err.message})`);
    }
}


async function listLinks() {
    const user = document.getElementById('list_user').value;
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
            let html = `<h4>Ссылки пользователя "${user}":</h4><ul style="list-style:none;padding:0;">`;
            links.forEach(link => {
                const shortUrl = `${BASE_URL}/${link.short_code}`;
                html += `
                    <li style="background:#f1f5f9;padding:10px;margin:8px 0;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            🔗 <strong><a href="${shortUrl}" target="_blank">${shortUrl}</a></strong>
                            <br><small style="color:#888;">→ ${link.original_url.slice(0,50)}...</small>
                        </div>
                        <button onclick="deleteLinkByCode('${user}', '${link.short_code}')" 
                                style="background-color:#e74c3c;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:0.8rem;">
                            🗑️
                        </button>
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


async function deleteLink() {
    const user = document.getElementById('delete_link_user').value;
    const shortCode = document.getElementById('delete_link_code').value;
    if (!user || !shortCode) return alert("Заполните оба поля");

    await deleteLinkByCode(user, shortCode);
    document.getElementById('delete_link_user').value = '';
    document.getElementById('delete_link_code').value = '';
}

async function deleteLinkByCode(user, shortCode) {
    try {
        const res = await fetch(`${LINK_API}/user/${user}/url/${shortCode}`, { method: 'DELETE' });
        const text = await res.text();

        if (res.status === 200) {
            showResult(`✅ Ссылка "${shortCode}" удалена!`);
            const listUser = document.getElementById('list_user').value;
            if (listUser === user) {
                await listLinks();
            }
        } else if (res.status === 404) {
            showResult(`❌ Ссылка "${shortCode}" не найдена.`);
        } else {
            showResult(`❌ Ошибка ${res.status}: ${text}`);
        }
    } catch (err) {
        showResult(`💥 Ошибка сети: ${err.message}`);
    }
}


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
    
    if (users.length === 0) {
        container.innerHTML = '<p style="color:#888;">Пользователей пока нет</p>';
        return;
    }
    
    container.innerHTML = users.map(u => 
        `<span class="user-tag">👤 ${u.user_id} <small style="color:#999;">(${u.created_at?.slice(0,10)})</small></span>`
    ).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
});
