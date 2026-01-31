let creds = {};
let allChannels = [];
let favorites = JSON.parse(localStorage.getItem('xtream_favorites')) || [];
let hls;

// استخدام بروكسي عام لتجاوز مشكلة CORS
// ملاحظة: البروكسي المجاني قد يكون بطيئاً أحياناً
const CORS_PROXY = "https://api.allorigins.win/get?url=";

window.onload = () => {
    const saved = localStorage.getItem('xtream_creds');
    if(saved) {
        creds = JSON.parse(saved);
        showPlayer();
        loadCategories();
    }
};

async function login() {
    const host = document.getElementById('host').value.trim().replace(/\/$/, '');
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if(!host || !username || !password) {
        alert('يرجى ملء جميع الحقول');
        return;
    }

    creds = { host, username, password };
    
    // بناء رابط الـ API
    const targetUrl = `${creds.host}/player_api.php?username=${creds.username}&password=${creds.password}`;
    
    try {
        // نمرر الرابط عبر البروكسي
        const response = await fetch(CORS_PROXY + encodeURIComponent(targetUrl));
        const data = await response.json();
        
        // البروكسي allorigins يرجع النتيجة داخل contents
        const jsonResponse = JSON.parse(data.contents);

        if(jsonResponse.user_info && jsonResponse.user_info.auth === 1) {
            localStorage.setItem('xtream_creds', JSON.stringify(creds));
            showPlayer();
            loadCategories();
        } else {
            document.getElementById('error-msg').innerText = 'فشل تسجيل الدخول. تأكد من البيانات.';
        }
    } catch (e) {
        document.getElementById('error-msg').innerText = 'خطأ في الاتصال. تأكد أن الرابط يعمل.';
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
        const targetUrl = `${creds.host}/player_api.php?username=${creds.username}&password=${creds.password}&action=get_live_categories`;
        const res = await fetch(CORS_PROXY + encodeURIComponent(targetUrl));
        const data = await res.json();
        const categories = JSON.parse(data.contents);
        
        const list = document.getElementById('categories-list');
        list.innerHTML = `<li onclick="loadChannels('all')">كل القنوات</li>`;
        
        categories.forEach(cat => {
            const li = document.createElement('li');
            li.innerText = cat.category_name;
            li.onclick = () => loadChannels(cat.category_id);
            list.appendChild(li);
        });
        
        loadChannels('all'); 
    } catch (e) {
        console.error('Error loading categories:', e);
    }
}

async function loadChannels(catId) {
    document.getElementById('channels-container').innerHTML = '<p style="text-align:center">جاري التحميل...</p>';
    
    try {
        const targetUrl = `${creds.host}/player_api.php?username=${creds.username}&password=${creds.password}&action=get_live_streams&category_id=${catId === 'all' ? '' : catId}`;
        const res = await fetch(CORS_PROXY + encodeURIComponent(targetUrl));
        const data = await res.json();
        allChannels = JSON.parse(data.contents);
        
        renderChannels(allChannels);
    } catch (e) {
        console.error('Error loading channels:', e);
        document.getElementById('channels-container').innerHTML = '<p style="text-align:center">فشل تحميل القائمة</p>';
    }
}

function renderChannels(channels) {
    const container = document.getElementById('channels-container');
    container.innerHTML = '';

    // عرض أول 100 قناة فقط لتجنب تعليق المتصفح إذا كانت القائمة ضخمة
    const displayList = channels.slice(0, 100); 

    displayList.forEach(ch => {
        const isFav = favorites.includes(ch.stream_id);
        const card = document.createElement('div');
        card.className = 'channel-card';
        card.innerHTML = `
            <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFav(event, ${ch.stream_id})">
                <i class="${isFav ? 'fas' : 'far'} fa-star"></i>
            </button>
            <img src="${ch.stream_icon}" class="channel-icon" onerror="this.src='https://via.placeholder.com/50?text=TV'">
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
    // رابط البث المباشر (غالباً لا يحتاج لبروكسي JSON لكن يحتاج لسماح Mixed Content)
    const streamUrl = `${creds.host}/live/${creds.username}/${creds.password}/${ch.stream_id}.m3u8`;
    const video = document.getElementById('video');
    document.getElementById('current-channel-name').innerText = ch.name;

    if (Hls.isSupported()) {
        if(hls) hls.destroy();
        hls = new Hls();
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            video.play().catch(e => console.log("Auto-play blocked"));
        });
        hls.on(Hls.Events.ERROR, function (event, data) {
            if (data.fatal) {
               console.error("HLS Error:", data);
               alert("خطأ في تشغيل القناة: قد يكون السبب بروتوكول HTTP غير الآمن.");
            }
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.play();
    }
}

// ... بقية دوال البحث والمفضلة (نفس الكود السابق) ...
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

function searchChannels() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const filtered = allChannels.filter(ch => ch.name.toLowerCase().includes(query));
    renderChannels(filtered);
}

function toggleFav(e, id) {
    e.stopPropagation();
    if(favorites.includes(id)) {
        favorites = favorites.filter(fid => fid !== id);
    } else {
        favorites.push(id);
    }
    localStorage.setItem('xtream_favorites', JSON.stringify(favorites));
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
