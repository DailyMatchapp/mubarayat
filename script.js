let creds = {};
let allChannels = [];
let favorites = JSON.parse(localStorage.getItem('xtream_favorites')) || [];
let hls;

// التحقق من وجود تسجيل دخول سابق
window.onload = () => {
    const saved = localStorage.getItem('xtream_creds');
    if(saved) {
        creds = JSON.parse(saved);
        showPlayer();
        loadCategories();
    }
};

async function login() {
    const host = document.getElementById('host').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if(!host || !username || !password) {
        alert('يرجى ملء جميع الحقول');
        return;
    }

    // تصحيح الرابط إذا انتهى بـ /
    creds = { host: host.replace(/\/$/, ''), username, password };
    
    try {
        const response = await fetch(`${creds.host}/player_api.php?username=${creds.username}&password=${creds.password}`);
        const data = await response.json();
        
        if(data.user_info && data.user_info.auth === 1) {
            localStorage.setItem('xtream_creds', JSON.stringify(creds));
            showPlayer();
            loadCategories();
        } else {
            document.getElementById('error-msg').innerText = 'فشل تسجيل الدخول. تأكد من البيانات.';
        }
    } catch (e) {
        document.getElementById('error-msg').innerText = 'خطأ في الاتصال (تأكد من CORS أو رابط HTTP/HTTPS)';
        console.error(e);
    }
}

function showPlayer() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('player-section').classList.remove('hidden');
}

function logout() {
    localStorage.removeItem('xtream_creds');
    location.reload();
}

async function loadCategories() {
    try {
        const url = `${creds.host}/player_api.php?username=${creds.username}&password=${creds.password}&action=get_live_categories`;
        const res = await fetch(url);
        const categories = await res.json();
        
        const list = document.getElementById('categories-list');
        list.innerHTML = `<li onclick="loadChannels('all')">كل القنوات</li>`;
        
        categories.forEach(cat => {
            const li = document.createElement('li');
            li.innerText = cat.category_name;
            li.onclick = () => loadChannels(cat.category_id);
            list.appendChild(li);
        });
        
        // تحميل أول دفعة قنوات
        loadChannels('all'); 
    } catch (e) {
        console.error('Error loading categories:', e);
    }
}

async function loadChannels(catId) {
    document.getElementById('channels-container').innerHTML = '<p style="text-align:center">جاري التحميل...</p>';
    
    try {
        const url = `${creds.host}/player_api.php?username=${creds.username}&password=${creds.password}&action=get_live_streams&category_id=${catId === 'all' ? '' : catId}`;
        const res = await fetch(url);
        allChannels = await res.json();
        
        renderChannels(allChannels);
    } catch (e) {
        console.error('Error loading channels:', e);
    }
}

function renderChannels(channels) {
    const container = document.getElementById('channels-container');
    container.innerHTML = '';

    channels.forEach(ch => {
        const isFav = favorites.includes(ch.stream_id);
        const card = document.createElement('div');
        card.className = 'channel-card';
        card.innerHTML = `
            <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFav(event, ${ch.stream_id})">
                <i class="${isFav ? 'fas' : 'far'} fa-star"></i>
            </button>
            <img src="${ch.stream_icon || 'https://via.placeholder.com/50'}" class="channel-icon" onerror="this.src='https://via.placeholder.com/50'">
            <div class="channel-info">
                <strong>${ch.name}</strong>
            </div>
        `;
        card.onclick = (e) => {
            if(!e.target.closest('.fav-btn')) playChannel(ch);
        };
        container.appendChild(card);
    });
}

function playChannel(ch) {
    const streamUrl = `${creds.host}/live/${creds.username}/${creds.password}/${ch.stream_id}.m3u8`;
    const video = document.getElementById('video');
    document.getElementById('current-channel-name').innerText = ch.name;

    if (Hls.isSupported()) {
        if(hls) hls.destroy();
        hls = new Hls();
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            video.play();
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', function() {
            video.play();
        });
    }
}

// التحكم في العرض (List/Grid)
function setView(type) {
    const container = document.getElementById('channels-container');
    if(type === 'list') {
        container.classList.remove('grid-view');
        container.classList.add('list-view');
    } else {
        container.classList.remove('list-view');
        container.classList.add('grid-view');
    }
}

// البحث
function searchChannels() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const filtered = allChannels.filter(ch => ch.name.toLowerCase().includes(query));
    renderChannels(filtered);
}

// المفضلة
function toggleFav(e, id) {
    e.stopPropagation();
    if(favorites.includes(id)) {
        favorites = favorites.filter(fid => fid !== id);
    } else {
        favorites.push(id);
    }
    localStorage.setItem('xtream_favorites', JSON.stringify(favorites));
    // إعادة رسم العنصر الحالي لتحديث الأيقونة
    const btn = e.currentTarget;
    btn.classList.toggle('active');
    const icon = btn.querySelector('i');
    icon.classList.toggle('fas');
    icon.classList.toggle('far');
}

function showFavoritesOnly() {
    const favChannels = allChannels.filter(ch => favorites.includes(ch.stream_id));
    renderChannels(favChannels);
}
