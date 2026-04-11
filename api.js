// ===================== GITLAB CONFIG =====================
const REPO  = "levietdaithang123/loginvn";
const TOKEN = "glpat-i2PaiC1cfkLxJ-PR8NwttWM6MQpvOjEKdTpseWFwbQ8.01.170y8ygzg ";
const FILE  = "Key.json";
const API   = `https://gitlab.com/api/v4/projects/${encodeURIComponent(REPO)}/repository/files/${encodeURIComponent(FILE)}`;
const BRANCH_CANDIDATES = ["main","master","Gr"];
let ACTIVE_BRANCH = null;

async function pickBranch(){
    for(const br of BRANCH_CANDIDATES){
        const r = await fetch(`${API}?ref=${encodeURIComponent(br)}`, { headers:{'Private-Token':TOKEN} });
        if(r.ok){ ACTIVE_BRANCH = br; break; }
    }
    if(!ACTIVE_BRANCH) ACTIVE_BRANCH = "main";
    return ACTIVE_BRANCH;
}

// ===================== DATA =====================
let DATA = { 
    users: [], 
    results: [], 
    winners: null, 
    rewards: { first: "", second: "", third: "", updatedAt: null }, 
    config: { deadline: "2026-03-31T23:59:59" } 
};

function encodeBase64Unicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) { return String.fromCharCode('0x' + p1); }));
}
function decodeBase64Unicode(str) {
    return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

// ===================== LOAD/SAVE =====================
async function loadGitlabData() {
    if(!ACTIVE_BRANCH) await pickBranch();
    try {
        const response = await fetch(`${API}?ref=${encodeURIComponent(ACTIVE_BRANCH)}`, {
            headers: {'Private-Token': TOKEN}
        });
        
        if (response.ok) {
            const json = await response.json();
            const content = decodeBase64Unicode(json.content);
            const parsed = JSON.parse(content);
            
            DATA = { ...DATA, ...parsed };
            if (!DATA.results) DATA.results = [];
            if (!DATA.users) DATA.users = [];

            if(window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
                renderLeaderboard();
                if(localStorage.getItem('currentUser')) renderHistory();
            }
            if(window.location.pathname.includes('admin.html') && typeof renderAdmin === 'function') {
                renderAdmin();
            }
        } else {
            console.error("Không tải được dữ liệu từ GitLab. Mã lỗi:", response.status);
        }
    } catch (err) { console.error("Lỗi mạng khi tải dữ liệu:", err); }
}

async function saveToGitlab(actionMsg) {
    if(!ACTIVE_BRANCH) await pickBranch();
    const content = encodeBase64Unicode(JSON.stringify(DATA, null, 2));
    
    try {
        const res = await fetch(API, {
            method: "PUT",
            headers: { "Private-Token": TOKEN, "Content-Type": "application/json" },
            body: JSON.stringify({ 
                branch: ACTIVE_BRANCH, 
                content: content, 
                commit_message: actionMsg, 
                encoding: "base64" 
            })
        });
        if(res.ok) console.log("Đã lưu thành công lên GitLab!");
        else console.error("Lỗi khi lưu dữ liệu lên máy chủ!");
    } catch (err) { console.error("Lỗi lưu GitLab:", err); }
}

// ===================== XỬ LÝ NGƯỜI DÙNG & ĐĂNG NHẬP =====================
async function register() {
    let name = document.getElementById('reg-name').value.trim();
    let email = document.getElementById('reg-email').value.trim();
    let pass = document.getElementById('reg-pass').value.trim();
    
    if(!name || !email || !pass) { alert("Vui lòng điền đủ thông tin!"); return; }
    
    await loadGitlabData(); 
    
    let exists = DATA.users.find(u => u.email === email);
    if(exists) { alert("Email này đã được đăng ký!"); return; }
    
    let newUser = { id: "U" + Date.now(), name: name, email: email, pass: pass, role: "student" };
    DATA.users.push(newUser);
    
    await saveToGitlab(`New user registered: ${email}`);
    alert("Đăng ký thành công! Vui lòng đăng nhập.");
    
    document.getElementById('register-modal').style.display = 'none';
    document.getElementById('login-modal').style.display = 'flex';
}

async function login() {
    let email = document.getElementById('log-email').value.trim();
    let pass = document.getElementById('log-pass').value.trim();
    
    if(!email || !pass) return;
    
    await loadGitlabData(); 
    
    let user = DATA.users.find(u => u.email === email && u.pass === pass);
    if(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        alert("Đăng nhập thành công!");
        document.getElementById('login-modal').style.display = 'none';
        checkLoginStatus();
        renderHistory(); 
    } else {
        alert("Sai email hoặc mật khẩu!");
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    checkLoginStatus();
    if(typeof showSection === 'function') showSection('dashboard-content');
}

function checkLoginStatus() {
    let user = JSON.parse(localStorage.getItem('currentUser'));
    let authBtns = document.getElementById('auth-buttons');
    let userProfile = document.getElementById('user-profile');
    let navHistory = document.getElementById('nav-history');
    
    if(user && authBtns && userProfile && navHistory) {
        authBtns.style.display = 'none';
        userProfile.style.display = 'flex';
        document.getElementById('user-name-display').innerText = "Chào, " + user.name;
        navHistory.style.display = 'block';
    } else if (authBtns && userProfile && navHistory) {
        authBtns.style.display = 'flex';
        userProfile.style.display = 'none';
        navHistory.style.display = 'none';
    }
}

// ===================== GIAO DIỆN BẢNG VÀNG & LỊCH SỬ =====================
function renderLeaderboard() {
    let tbody = document.querySelector('#leaderboard-table tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    let sortedRes = [...DATA.results].sort((a,b) => b.score - a.score);
    let limit = sortedRes.slice(0, 20); 
    
    limit.forEach((r, i) => {
        let user = DATA.users.find(u => u.id === r.userId) || { name: "Thí sinh ẩn danh" };
        tbody.innerHTML += `<tr>
            <td><strong style="color:var(--danger)">#${i+1}</strong></td>
            <td>${user.name}</td>
            <td>Mã đề ${r.examId}</td>
            <td><strong style="color:var(--primary)">${parseFloat(r.score).toFixed(2)}</strong></td>
            <td>${new Date(r.timestamp).toLocaleString('vi-VN')}</td>
        </tr>`;
    });
}

function renderHistory() {
    let tbody = document.querySelector('#history-table tbody');
    let user = JSON.parse(localStorage.getItem('currentUser'));
    if(!tbody || !user) return;
    
    tbody.innerHTML = '';
    let myRes = DATA.results.filter(r => r.userId === user.id).sort((a,b) => b.timestamp - a.timestamp);
    
    myRes.forEach(r => {
        tbody.innerHTML += `<tr>
            <td>${r.examId}</td>
            <td>${new Date(r.timestamp).toLocaleString('vi-VN')}</td>
            <td><strong style="color:var(--success)">${parseFloat(r.score).toFixed(2)}</strong></td>
            <td><button class="btn btn-outline" style="padding:4px 10px; font-size:0.9rem;" onclick="reviewExam('${r.examId}', '${r.id}')">Xem lỗi sai</button></td>
        </tr>`;
    });
}

function reviewExam(examId, resultId) {
    localStorage.setItem('reviewResultId', resultId);
    window.location.href = `baisuvadia.html?exam=${examId}&mode=review`;
}
