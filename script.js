let creds = {};
let allChannels = [];
let favorites = JSON.parse(localStorage.getItem('xtream_favorites')) || [];
let hls;

// استخدام بروكسي corsproxy.io (أسرع وأفضل لقوائم IPTV)
const CORS_PROXY = "https://corsproxy.io/?";

window.onload = () => {
    const saved = localStorage.getItem('xtream_creds');
    if(saved) {
        creds = JSON.parse(saved);
        showPlayer();
        loadCategories();
    }
};

async function login() {
    let host = document.getElementById('host').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if(!host || !username || !password) {
        alert('يرجى ملء جميع الحقول');
        return;
    }

    // تنظيف الرابط
    if (!host.startsWith('http')) {
        host = 'http://' + host;
    }
    host = host.replace(/\/$/, '');

    creds = { host, username, password };
    
    // بناء رابط الـ API
    const targetUrl = `${creds.host}/player_api.php?username=${creds.username}&password=${creds.password}`;
    
    document.getElementById('error-msg').innerText = 'جاري الاتصال...';

    try {
        // الطلب عبر البروكسي الجديد
        const response = await fetch(CORS_PROXY + encodeURIComponent(targetUrl));
        
        if (!response.ok) throw new Error("سيرفر IPTV لا يستجيب");

        const data = await response.json();
        
        if(data.user_info && data.user_info.auth === 1) {
            localStorage.setItem('xtream_creds', JSON.stringify(creds));
            showPlayer();
            loadCategories();
        } else {
            document.getElementById('error-msg').innerText = 'فشل تسجيل الدخول. تأكد من البيانات.';
        }
    } catch (e) {
        console.error(e);
        document.getElementById('error-msg').innerHTML = `
            خطأ في الاتصال!<br>
            1. تأكد أن الرابط يعمل.<br>
            2. <b>هام:</b> اسمح للمحتوى غير الآمن (Insecure Content) من إعدادات المتصفح.
        `;
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
        const categories = await res.json();
        
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
    const container = document.getElementById('channels-container');
    container.innerHTML = '<p style="text-align:center; color:white;">جاري جلب القنوات...</p>';
    
    try {
        const targetUrl = `${creds.host}/player_api.php?username=${creds.username}&password=${creds.password}&action=get_live_streams&category_id=${catId === 'all' ? '' : catId}`;
        const res = await fetch(CORS_PROXY + encodeURIComponent(targetUrl));
        allChannels = await res.json(); // هذا البروكسي يرجع البيانات مباشرة
        
        if (!Array.isArray(allChannels)) {
            // أحياناً يكون الرد عبارة عن object فارغ إذا لم توجد قنوات
            allChannels = [];
        }

        renderChannels(allChannels);
    } catch (e) {
        console.error('Error loading channels:', e);
        container.innerHTML = '<p style="text-align:center; color:red;">فشل تحميل القائمة. حاول اختيار تصنيف آخر.</p>';
    }
}

function renderChannels(channels) {
    const container = document.getElementById('channels-container');
    container.innerHTML = '';

    // عرض أول 200 قناة فقط لتحسين الأداء
    const limit = 200;
    const displayList = channels.slice(0, limit);

    if (displayList.length === 0) {
        container.innerHTML = '<p style="text-align:center">لا توجد قنوات في هذا القسم</p>';
        return;
    }

    displayList.forEach(ch => {
        const isFav = favorites.includes(ch.stream_id);
        const card = document.createElement('div');
        card.className = 'channel-card';
        // التعامل مع الصور المكسورة
        const icon = ch.stream_icon && ch.stream_icon.startsWith('http') ? ch.stream_icon : 'https://via.placeholder.com/50?text=TV';
        
        card.innerHTML = `
            <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFav(event, ${ch.stream_id})">
                <i class="${isFav ? 'fas' : 'far'} fa-star"></i>
            </button>
            <img src="${icon}" class="channel-icon" onerror="this.src='https://via.placeholder.com/50?text=Error'">
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
    // بناء رابط البث
    // هام: البث المباشر لا يمر عبر البروكسي لأنه دفق مستمر
    const streamUrl = `${creds.host}/live/${creds.username}/${creds.password}/${ch.stream_id}.m3u8`;
    
    const video = document.getElementById('video');
    document.getElementById('current-channel-name').innerText = ch.name;

    if (Hls.isSupported()) {
        if(hls) hls.destroy();
        hls = new Hls();
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            video.play().catch(e => console.log("Autoplay prevented"));
        });
        hls.on(Hls.Events.ERROR, function (event, data) {
            if (data.fatal) {
                switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                    console.error("خطأ شبكة: تأكد من إعدادات Mixed Content");
                    alert("لا يمكن تشغيل القناة.\nالمتصفح حظر الاتصال لأن الرابط HTTP والموقع HTTPS.\nانقر على القفل بجوار الرابط واسمح بـ Insecure Content.");
                    break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                    hls.recoverMediaError();
                    break;
                default:
                    hls.destroy();
                    break;
                }
            }
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.play();
    }
}

// ... بقية دوال البحث والمفضلة (كما هي) ...
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
    const icon = btn.querySelector('i');
    btn.classList.toggle('active');
    icon.classList.toggle('fas');
    icon.classList.toggle('far');
}

function showFavoritesOnly() {
    const favChannels = allChannels.filter(ch => favorites.includes(ch.stream_id));
    renderChannels(favChannels);
}
