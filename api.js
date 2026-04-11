// ===================== GITLAB CONFIG =====================
const REPO  = "levietdaithang123/loginvn";
const TOKEN = "glpat-QhHoWI4LmATeMqNA-J_j12M6MQpvOjEKdTpseWIzOA8.01.171vmiul4".trim(); 
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

function toBase64Unicode(str){
    const bytes = new TextEncoder().encode(str);
    let bin=""; bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin);
}
function fromBase64Unicode(b64){
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

// ===================== DATA =====================
let DATA = { 
    users: [], 
    results: [], 
    winners: null, 
    rewards: {first:"",second:"",third:"",updatedAt:null}, 
    config: {deadline:"2026-03-31T23:59:59"} 
};

// ===================== LOAD/SAVE =====================
async function loadGitlabData() {
    if(!ACTIVE_BRANCH) await pickBranch();
    try {
        const response = await fetch(`${API}?ref=${encodeURIComponent(ACTIVE_BRANCH)}`, {
            headers: {'Private-Token': TOKEN}
        });
        
        if (response.ok) {
            const data = await response.json();
            const parsed = JSON.parse(fromBase64Unicode(data.content));
            
            DATA = parsed || DATA;
            if(!DATA.users) DATA.users = [];
            if(!DATA.results) DATA.results = [];

            // KIỂM TRA BẢO MẬT: Nếu Admin đã xóa tài khoản này khỏi Server -> Tự động đăng xuất
            let currentUserStr = localStorage.getItem('currentUser');
            if(currentUserStr) {
                let currentUser = JSON.parse(currentUserStr);
                let stillExists = DATA.users.find(u => u.id === currentUser.id);
                if(!stillExists) {
                    localStorage.removeItem('currentUser');
                    alert("Tài khoản của bạn đã bị xóa hoặc vô hiệu hóa bởi Quản trị viên.");
                    if(typeof checkLoginStatus === 'function') checkLoginStatus();
                    if(typeof showSection === 'function') showSection('dashboard-content');
                }
            }

            if(window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
                if(typeof renderLeaderboard === 'function') renderLeaderboard(currentSubjectFilter);
                if(localStorage.getItem('currentUser') && typeof renderHistory === 'function') renderHistory();
            }
            if(window.location.pathname.includes('admin.html') && typeof syncUI === 'function') {
                syncUI();
            }
        } else {
            await saveToGitlab("Init Key.json (System)");
        }
    } catch (err) { console.error("Lỗi mạng khi tải dữ liệu:", err); }
}

async function saveToGitlab(commitMessage) {
    if(!ACTIVE_BRANCH) await pickBranch();
    const json = JSON.stringify(DATA, null, 2);
    const content = toBase64Unicode(json);

    const check = await fetch(`${API}?ref=${encodeURIComponent(ACTIVE_BRANCH)}`, {
        headers: {'Private-Token': TOKEN}
    });

    const basePayload = { branch: ACTIVE_BRANCH, encoding: "base64", content };

    try {
        if(check.ok){
            const payload = {...basePayload, commit_message: commitMessage || `Update data`};
            const res = await fetch(API, { method: "PUT", headers: {'Private-Token': TOKEN, 'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
            if(!res.ok) throw new Error("PUT failed");
            return true;
        } else {
            const payload = {...basePayload, commit_message: commitMessage || `Create Key.json`};
            const res = await fetch(API, { method: "POST", headers: {'Private-Token': TOKEN, 'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
            if(!res.ok) throw new Error("POST failed");
            return true;
        }
    } catch(e) {
        console.error(e);
        return false;
    }
}

// ===================== XỬ LÝ ĐĂNG NHẬP / ĐĂNG KÝ =====================
async function register() {
    let name = document.getElementById('reg-name').value.trim();
    let email = document.getElementById('reg-email').value.trim();
    let pass = document.getElementById('reg-pass').value.trim();
    
    if(!name || !email || !pass) { alert("Vui lòng điền đủ thông tin!"); return; }
    
    await loadGitlabData(); 
    
    let exists = DATA.users.find(u => u.email === email);
    if(exists) { alert("Email này đã được đăng ký!"); return; }
    
    let newUser = { id: "U" + Date.now(), name: name, email: email, pass: pass, role: "student", createdAt: new Date().toISOString() };
    DATA.users.push(newUser);
    
    let isSaved = await saveToGitlab(`New user registered: ${email}`);
    if(isSaved) {
        alert("Đăng ký thành công! Vui lòng đăng nhập.");
        document.getElementById('register-modal').style.display = 'none';
        document.getElementById('login-modal').style.display = 'flex';
    } else {
        DATA.users.pop();
        alert("Lỗi lưu dữ liệu. Vui lòng kiểm tra lại Token!");
    }
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
        if(typeof checkLoginStatus === 'function') checkLoginStatus();
        if(typeof renderHistory === 'function') renderHistory(); 
    } else {
        alert("Sai email hoặc mật khẩu!");
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    if(typeof checkLoginStatus === 'function') checkLoginStatus();
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

// ===================== BẢNG VÀNG & LỊCH SỬ THI =====================
let currentSubjectFilter = 'all';

function renderLeaderboard(filter = currentSubjectFilter) {
    currentSubjectFilter = filter;
    let tbody = document.querySelector('#leaderboard-table tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    // Bộ lọc theo Môn học
    let filteredResults = DATA.results || [];
    if(filter === 'dia') {
        filteredResults = filteredResults.filter(r => ['de1', 'de4'].includes(r.examId));
    } else if(filter === 'su') {
        filteredResults = filteredResults.filter(r => ['de2', 'de3', 'de5'].includes(r.examId));
    }

    let sortedRes = [...filteredResults].sort((a,b) => b.score - a.score);
    let limit = sortedRes.slice(0, 20); 
    
    if(limit.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#64748b;">Chưa có dữ liệu thi cho môn này.</td></tr>`;
        return;
    }

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
    
    if(myRes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#64748b;">Bạn chưa làm bài thi nào.</td></tr>`;
        return;
    }

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
