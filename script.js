let allData = []; // لتخزين القنوات
let currentChannels = [];
let hls;

// التبديل بين طرق الدخول
function switchTab(mode) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    
    if(mode === 'xtream') {
        document.getElementById('xtream-form').classList.remove('hidden');
        document.getElementById('file-form').classList.add('hidden');
    } else {
        document.getElementById('xtream-form').classList.add('hidden');
        document.getElementById('file-form').classList.remove('hidden');
    }
}

// 1. الاتصال عبر Xtream (باستخدام البروكسي الخلفي)
async function connectXtream() {
    const host = document.getElementById('url').value.trim().replace(/\/$/, '');
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    const msg = document.getElementById('status-msg');

    if(!host || !user || !pass) {
        msg.innerText = "يرجى ملء كافة البيانات"; return;
    }

    msg.innerText = "جاري الاتصال بالسيرفر...";
    
    // استخدام الدالة الخلفية للاتصال
    // نطلب "get_live_streams" مباشرة لجلب كل شيء (يمكن تعديلها لجلب التصنيفات فقط أولاً)
    const apiUrl = `${host}/player_api.php?username=${user}&password=${pass}&action=get_live_streams`;
    
    try {
        // نمرر الطلب إلى Netlify Function
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(apiUrl)}`);
        
        if(!response.ok) throw new Error("فشل الاتصال بالبروكسي");
        
        const data = await response.json();
        
        if(!Array.isArray(data)) {
            // ربما فشل تسجيل الدخول
            if(data.user_info && data.user_info.auth === 0) throw new Error("بيانات الدخول خاطئة");
            throw new Error("تنسيق البيانات غير مدعوم");
        }

        processChannels(data, host, user, pass); // معالجة البيانات
        
    } catch (e) {
        console.error(e);
        msg.innerText = "خطأ: " + e.message;
    }
}

// 2. قراءة ملف M3U محلي
function loadFile() {
    const fileInput = document.getElementById('m3u-file');
    const file = fileInput.files[0];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        parseM3U(content);
    };
    reader.readAsText(file);
}

// تحليل ملف M3U
function parseM3U(content) {
    const lines = content.split('\n');
    const channels = [];
    let currentChannel = {};

    lines.forEach(line => {
        line = line.trim();
        if(line.startsWith('#EXTINF:')) {
            const info = line.split(',');
            currentChannel.name = info[1] || 'Unknown';
            // استخراج الشعار إن وجد
            const iconMatch = line.match(/tvg-logo="([^"]*)"/);
            currentChannel.stream_icon = iconMatch ? iconMatch[1] : '';
            // استخراج المجموعة
            const groupMatch = line.match(/group-title="([^"]*)"/);
            currentChannel.category_id = groupMatch ? groupMatch[1] : 'عام';
        } else if(line.startsWith('http')) {
            currentChannel.direct_source = line;
            channels.push(currentChannel);
            currentChannel = {};
        }
    });
    
    processChannels(channels, null, null, null, true);
}

// معالجة القنوات وعرضها
function processChannels(data, host, user, pass, isFile = false) {
    // هيكلة البيانات لتناسب العرض
    allData = data.map(ch => ({
        id: ch.stream_id || Math.random(),
        name: ch.name || ch.title,
        icon: ch.stream_icon || '',
        category: ch.category_id || 'Uncategorized',
        // إذا كان ملف M3U نستخدم الرابط المباشر، وإلا نبني رابط Xtream
        url: isFile ? ch.direct_source : `${host}/live/${user}/${pass}/${ch.stream_id}.m3u8`
    }));

    // استخراج التصنيفات
    const categories = [...new Set(allData.map(item => item.category))];
    renderCategories(categories);
    
    // إخفاء تسجيل الدخول وإظهار المشغل
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('player-ui').style.display = 'flex';
    
    // عرض الكل افتراضياً
    filterByCategory('all');
}

function renderCategories(cats) {
    const list = document.getElementById('categories');
    list.innerHTML = `<li onclick="filterByCategory('all')" class="active">الكل</li>`;
    cats.forEach(cat => {
        // إذا كان التصنيف مجرد رقم (Xtream) يمكن تحسينه بطلب قائمة التصنيفات، هنا سنعرضه كما هو للتبسيط
        list.innerHTML += `<li onclick="filterByCategory('${cat}')">${cat}</li>`;
    });
}

function filterByCategory(cat) {
    document.querySelectorAll('.categories-list li').forEach(li => li.classList.remove('active'));
    event && event.target.classList.add('active');
    
    document.getElementById('category-title').innerText = cat === 'all' ? 'كل القنوات' : cat;

    if(cat === 'all') {
        currentChannels = allData;
    } else {
        currentChannels = allData.filter(ch => ch.category == cat);
    }
    renderChannels(currentChannels);
}

function renderChannels(channels) {
    const grid = document.getElementById('channels');
    grid.innerHTML = '';
    
    // عرض أول 100 لعدم تهنيج المتصفح
    channels.slice(0, 100).forEach(ch => {
        const div = document.createElement('div');
        div.className = 'channel-card';
        div.innerHTML = `
            <img src="${ch.icon}" class="channel-icon" onerror="this.style.display='none'">
            <div>${ch.name}</div>
        `;
        div.onclick = () => playStream(ch.url);
        grid.appendChild(div);
    });
}

function playStream(url) {
    const video = document.getElementById('main-player');
    
    if (Hls.isSupported()) {
        if(hls) hls.destroy();
        hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            video.play();
        });
        hls.on(Hls.Events.ERROR, function(event, data) {
            if(data.fatal) {
                console.log("Error loading stream, might be mixed content or dead link");
            }
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.play();
    }
}

// بحث
function filterChannels() {
    const q = document.getElementById('search').value.toLowerCase();
    const filtered = currentChannels.filter(ch => ch.name.toLowerCase().includes(q));
    renderChannels(filtered);
}

// تغيير العرض
function toggleView(mode) {
    const grid = document.getElementById('channels');
    if(mode === 'list') grid.classList.add('list-mode');
    else grid.classList.remove('list-mode');
}

function logout() {
    location.reload();
}
