// ===== CONFIGURATION =====
const USER_API = "http://138.124.99.135:8001";
const LINK_API = "http://138.124.99.135:8008";
const BASE_LINK = "http://138.124.99.135:8008";

let activeUserId = null;

// ===== TOAST NOTIFICATIONS SYSTEM =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Clean text prefix instead of emojis
    let prefix = '[Инфо]';
    if (type === 'success') prefix = '[Успешно]';
    if (type === 'error') prefix = '[Ошибка]';

    toast.innerHTML = `<span style="font-weight: 600; margin-right: 4px;">${prefix}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// ===== DIALOG / RESULT MODAL =====
function showResult(text) {
    const container = document.getElementById('result-container');
    const resultBlock = document.getElementById('result');
    if (container && resultBlock) {
        resultBlock.innerHTML = text;
        container.classList.remove('hidden');
    }
}

function closeResult() {
    const container = document.getElementById('result-container');
    if (container) {
        container.classList.add('hidden');
    }
}

function updateUsersCount(count) {
    const badge = document.getElementById('users-count');
    if (badge) badge.textContent = count;
}

// ===== ACTIVE SESSION MANAGEMENT =====
function setActiveUser(userId) {
    activeUserId = userId;
    
    const banner = document.getElementById('active-user-banner');
    const activeName = document.getElementById('active-user-name');
    const clearBtn = document.getElementById('btn-clear');
    
    if (banner && activeName && clearBtn) {
        banner.classList.remove('inactive');
        activeName.textContent = userId;
        clearBtn.classList.remove('hidden');
    }

    const inputs = ['link_user', 'list_user', 'delete_link_user', 'delete_user_id'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = userId;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });

    const tags = document.querySelectorAll('.user-tag');
    tags.forEach(tag => {
        if (tag.dataset.userid === userId) {
            tag.classList.add('active');
        } else {
            tag.classList.remove('active');
        }
    });

    showToast(`Выбран пользователь: ${userId}`, 'success');
    listLinks();
}

function clearActiveUser() {
    activeUserId = null;
    
    const banner = document.getElementById('active-user-banner');
    const activeName = document.getElementById('active-user-name');
    const clearBtn = document.getElementById('btn-clear');
    
    if (banner && activeName && clearBtn) {
        banner.classList.add('inactive');
        activeName.textContent = 'Выберите пользователя';
        clearBtn.classList.add('hidden');
    }

    const inputs = ['link_user', 'list_user', 'delete_link_user', 'delete_user_id'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = '';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });

    const tags = document.querySelectorAll('.user-tag');
    tags.forEach(tag => tag.classList.remove('active'));

    const linksListContainer = document.getElementById('links-list-container');
    if (linksListContainer) linksListContainer.classList.add('hidden');
    
    showToast('Активный сеанс сброшен');
}

// ===== REGISTRATION & USER ACTIONS =====
async function createUser() {
    const idInput = document.getElementById('user_id');
    const id = idInput ? idInput.value.trim() : '';
    if (!id) {
        showToast("Введите ID пользователя", "error");
        return;
    }

    try {
        const res = await fetch(`${USER_API}/user/${id}`, { method: 'POST' });
        const text = await res.text();

        if (res.status === 201 || res.status === 200) {
            await loadUsers();
            showResult(`Пользователь "${id}" создан.`);
            showToast(`Пользователь "${id}" успешно создан`, 'success');
            if (idInput) idInput.value = '';
            setActiveUser(id);
        } else if (res.status === 400) {
            try {
                const errorData = JSON.parse(text);
                showResult(`Ошибка: ${errorData.detail || 'Не удалось создать пользователя.'}`);
                showToast(errorData.detail || 'Ошибка регистрации', 'error');
            } catch {
                showResult(`Ошибка: ${text || 'Не удалось создать пользователя.'}`);
                showToast(text || 'Ошибка регистрации', 'error');
            }
        } else {
            showResult(`Ошибка ${res.status}: ${text || 'Неизвестная ошибка'}`);
            showToast(`Ошибка ${res.status}`, 'error');
        }
    } catch (err) {
        showResult(`Ошибка сети: не удалось связаться с сервером (${err.message})`);
        showToast("Ошибка сети при регистрации", "error");
    }
}

async function deleteUser() {
    const idInput = document.getElementById('delete_user_id');
    const id = idInput ? idInput.value.trim() : '';
    if (!id) {
        showToast("Введите ID пользователя", "error");
        return;
    }

    if (!confirm(`Удалить пользователя "${id}" и все его ссылки?`)) {
        return;
    }

    try {
        const res = await fetch(`${USER_API}/user/${id}`, { method: 'DELETE' });

        if (res.status === 200) {
            showResult(`Пользователь "${id}" удален.`);
            showToast(`Пользователь "${id}" удален`, 'success');
            
            if (activeUserId === id) {
                clearActiveUser();
            }
            
            await loadUsers();
            if (idInput) idInput.value = '';
        } else if (res.status === 404) {
            showResult(`Пользователь "${id}" не найден.`);
            showToast("Пользователь не найден", "error");
        } else {
            const text = await res.text();
            showResult(`Ошибка ${res.status}: ${text}`);
            showToast(`Ошибка ${res.status}`, 'error');
        }
    } catch (err) {
        showResult(`Ошибка сети: не удалось связаться с сервером (${err.message})`);
        showToast("Ошибка сети при удалении", "error");
    }
}

// ===== LINK WORKSPACE ACTIONS =====
async function createLink() {
    const userInput = document.getElementById('link_user');
    const urlInput = document.getElementById('original_url');
    
    const user = userInput ? userInput.value.trim() : '';
    const url = urlInput ? urlInput.value.trim() : '';
    
    if (!user || !url) {
        showToast("Заполните имя пользователя и ссылку", "error");
        return;
    }

    try {
        const res = await fetch(`${LINK_API}/user/${user}/urls`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        const text = await res.text();

        if (res.status === 201 || res.status === 200) {
            const data = JSON.parse(text);
            const shortUrl = `${BASE_LINK}/${data.short_code}`;
            
            showResult(`
                <h3>Ссылка успешно создана</h3>
                <div class="result-success-box" style="margin-top: 15px; padding: 12px; background: var(--success-bg); border-radius: 8px; border: 1px solid var(--success-border);">
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 4px;">Короткая ссылка:</div>
                    <div style="font-size: 1.1rem; font-weight: 600; word-break: break-all; margin-bottom: 12px;">
                        <a href="${shortUrl}" target="_blank">${shortUrl}</a>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">Оригинальный URL:</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary); word-break: break-all;">${url}</div>
                    
                    <button class="btn btn-secondary" onclick="copyToClipboard('${shortUrl}')" style="margin-top: 12px; width: 100%; padding: 8px;">
                        Скопировать ссылку
                    </button>
                </div>
            `);
            showToast("Короткая ссылка создана", "success");
            
            if (urlInput) urlInput.value = '';
            
            const listUser = document.getElementById('list_user').value.trim();
            if (listUser === user) {
                listLinks();
            }
        } else if (res.status === 404) {
            showResult(`Пользователь "${user}" не найден.`);
            showToast("Пользователь не найден", "error");
        } else {
            showResult(`Ошибка ${res.status}: ${text}`);
            showToast(`Ошибка ${res.status}`, 'error');
        }
    } catch (err) {
        showResult(`Ошибка сети: не удалось связаться с сервером (${err.message})`);
        showToast("Ошибка сети при сокращении", "error");
    }
}

async function listLinks() {
    const userInput = document.getElementById('list_user');
    const user = userInput ? userInput.value.trim() : '';
    
    if (!user) {
        showToast("Введите ID пользователя", "error");
        return;
    }

    const container = document.getElementById('links-list-container');
    const target = document.getElementById('links-list-target');
    
    if (!container || !target) return;

    try {
        const res = await fetch(`${LINK_API}/user/${user}/urls`);
        
        if (res.status === 200) {
            const data = await res.json();
            const links = data.links || [];
            
            container.classList.remove('hidden');
            
            if (links.length === 0) {
                target.innerHTML = `<p class="placeholder-loading">У пользователя "${user}" пока нет созданных ссылок.</p>`;
                return;
            }
            
            let html = `<ul class="links-list">`;
            links.forEach(link => {
                const shortUrl = `${BASE_LINK}/${link.short_code}`;
                html += `
                    <li class="link-item" id="link-item-${link.short_code}">
                        <div class="link-details">
                            <div class="link-row-short">
                                <a href="${shortUrl}" target="_blank" class="short-url-link">${shortUrl}</a>
                            </div>
                            <div class="original-url-text" title="${link.original_url}">
                                ${link.original_url}
                            </div>
                        </div>
                        <div class="link-actions-group">
                            <span class="badge-clicks" id="clicks-${link.short_code}" title="Статистика кликов">
                                Переходов: ...
                            </span>
                            <button class="btn-mini" onclick="copyToClipboard('${shortUrl}')">Копировать</button>
                            <button class="btn-mini btn-mini-danger" onclick="deleteLinkByCode('${user}', '${link.short_code}')">Удалить</button>
                        </div>
                    </li>
                `;
            });
            html += `</ul>`;
            target.innerHTML = html;
            
            links.forEach(link => {
                fetchClicksInBackground(link.short_code);
            });
            
        } else {
            const data = await res.json();
            showResult(`Ошибка: ${data.detail || 'Не удалось получить список'}`);
            showToast(data.detail || 'Ошибка загрузки ссылок', 'error');
            container.classList.add('hidden');
        }
    } catch (err) {
        showResult(`Ошибка сети: ${err.message}`);
        showToast("Ошибка сети при запросе ссылок", "error");
        container.classList.add('hidden');
    }
}

async function fetchClicksInBackground(shortCode) {
    try {
        const res = await fetch(`${LINK_API}/short_code/${shortCode}/clicks`);
        if (res.status === 200) {
            const data = await res.json();
            const badge = document.getElementById(`clicks-${shortCode}`);
            if (badge) {
                badge.innerHTML = `Переходов: ${data.clicks}`;
            }
        }
    } catch (err) {
        console.warn(`Could not load clicks stats for ${shortCode}`, err);
    }
}

function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast("Ссылка скопирована", "success");
        }).catch(() => {
            fallbackCopyToClipboard(text);
        });
    } else {
        fallbackCopyToClipboard(text);
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showToast("Ссылка скопирована", "success");
        } else {
            showToast("Не удалось скопировать", "error");
        }
    } catch (err) {
        showToast("Не удалось скопировать", "error");
    }

    document.body.removeChild(textArea);
}

// ===== MANUAL STATISTICS CHECKER =====
async function getClicks() {
    const codeInput = document.getElementById('stats_code');
    const code = codeInput ? codeInput.value.trim() : '';
    if (!code) {
        showToast("Введите короткий код ссылки", "error");
        return;
    }
    await getClicksByCode(code);
}

async function getClicksByCode(code) {
    try {
        const res = await fetch(`${LINK_API}/short_code/${code}/clicks`);
        const data = await res.json();

        if (res.status === 200) {
            showResult(`
                <h3>Статистика переходов</h3>
                <div style="margin-top: 15px; padding: 16px; background: var(--info-bg); border-radius: 8px; border: 1px solid var(--info-border);">
                    <div style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Код ссылки</div>
                    <div style="font-family: monospace; font-size: 1.2rem; font-weight: 600; margin-bottom: 12px;">${data.short_code}</div>
                    
                    <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Всего переходов</div>
                    <div style="font-size: 2.2rem; font-weight: 700; color: var(--info);">${data.clicks}</div>
                </div>
            `);
            showToast(`Статистика загружена`, "success");
        } else {
            showResult(`Ошибка: ${data.detail || 'Ссылка не найдена'}`);
            showToast("Код не найден", "error");
        }
    } catch (err) {
        showResult(`Ошибка сети: ${err.message}`);
        showToast("Ошибка сети при проверке статистики", "error");
    }
}

// ===== DELETING LINKS =====
async function deleteLink() {
    const userInput = document.getElementById('delete_link_user');
    const codeInput = document.getElementById('delete_link_code');
    
    const user = userInput ? userInput.value.trim() : '';
    const shortCode = codeInput ? codeInput.value.trim() : '';
    
    if (!user || !shortCode) {
        showToast("Заполните поля ID пользователя и код ссылки", "error");
        return;
    }

    await deleteLinkByCode(user, shortCode);
    
    if (codeInput) codeInput.value = '';
    if (userInput && !activeUserId) userInput.value = '';
}

async function deleteLinkByCode(user, shortCode) {
    if (!confirm(`Вы действительно хотите удалить короткую ссылку "${shortCode}"?`)) {
        return;
    }

    try {
        const res = await fetch(`${LINK_API}/user/${user}/short_code/${shortCode}`, { method: 'DELETE' });
        const text = await res.text();

        if (res.status === 200) {
            showResult(`Ссылка "${shortCode}" удалена.`);
            showToast(`Ссылка "${shortCode}" удалена`, 'success');
            
            const listUser = document.getElementById('list_user').value.trim();
            if (listUser === user) {
                await listLinks();
            }
        } else if (res.status === 404) {
            showResult(`Ссылка "${shortCode}" не найдена.`);
            showToast("Ссылка не найдена", "error");
        } else {
            showResult(`Ошибка ${res.status}: ${text}`);
            showToast(`Ошибка ${res.status}`, 'error');
        }
    } catch (err) {
        showResult(`Ошибка сети: ${err.message}`);
        showToast("Ошибка сети при удалении ссылки", "error");
    }
}

// ===== USERS LOADING =====
async function loadUsers() {
    try {
        const res = await fetch(`${USER_API}/users`);
        if (res.ok) {
            const data = await res.json();
            renderUsers(data.users || []);
        } else {
            const container = document.getElementById('users-list');
            if (container) {
                container.innerHTML = '<span class="placeholder-loading" style="color:var(--danger);">Ошибка загрузки пользователей.</span>';
            }
        }
    } catch (err) {
        console.warn("Не удалось загрузить пользователей", err);
        const container = document.getElementById('users-list');
        if (container) {
            container.innerHTML = '<span class="placeholder-loading" style="color:var(--danger);">Сервер пользователей недоступен.</span>';
        }
    }
}

function renderUsers(users) {
    const container = document.getElementById('users-list');
    if (!container) return;

    updateUsersCount(users.length);

    if (users.length === 0) {
        container.innerHTML = '<span class="placeholder-loading">Пользователей пока нет</span>';
        return;
    }

    container.innerHTML = users.map(u => {
        const formattedDate = u.created_at ? u.created_at.slice(0, 10) : '...';
        const isActive = activeUserId === u.user_id ? 'active' : '';
        return `
            <span class="user-tag ${isActive}" 
                  data-userid="${u.user_id}" 
                  onclick="setActiveUser('${u.user_id}')">
                ${u.user_id} 
                <small>(${formattedDate})</small>
            </span>
        `;
    }).join('');
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    
    document.querySelectorAll('.input-wrapper input').forEach(input => {
        if (input.value) {
            input.placeholder = " ";
        }
    });
});