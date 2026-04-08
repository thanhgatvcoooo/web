// --- KHỞI TẠO DỮ LIỆU ĐỀ THI TỪ URL ---
const urlParams = new URLSearchParams(window.location.search);
const examId = urlParams.get('exam') || 'de1'; // Mặc định là de1 nếu không truyền param

// Lấy dữ liệu gốc từ biến toàn cục do de1.js hoặc de2.js cung cấp
const originalExamData = window[examId]; 
let currentExamData = {};
let totalItems = 0;
let answeredItems = 0;
let timerInterval;
let timeRemaining = 0;

// Cập nhật thông tin Header khi trang vừa tải xong
document.addEventListener("DOMContentLoaded", () => {
    if(!originalExamData) {
        document.getElementById("intro-title").innerText = "Lỗi: Không tìm thấy dữ liệu đề thi!";
        return;
    }
    
    document.title = `${originalExamData.meta.subject} - Mã đề ${originalExamData.meta.code}`;
    document.getElementById("header-subject-info").innerText = `Môn: ${originalExamData.meta.subject} | Mã đề: ${originalExamData.meta.code}`;
    document.getElementById("intro-title").innerText = originalExamData.meta.title;
    
    // Tính tổng số câu hỏi (Part 1 + Part 2*4 + Part 3)
    totalItems = originalExamData.part1.length + (originalExamData.part2.length * 4) + originalExamData.part3.length;
});

// --- HÀM XÁO TRỘN (SHUFFLE) ---
function shuffleExam() {
    currentExamData = JSON.parse(JSON.stringify(originalExamData));

    // Đảo Phần 1
    currentExamData.part1.forEach(q => {
        let optionsWithFlag = q.options.map((opt, idx) => ({ text: opt, isCorrect: idx === q.ans }));
        for (let i = optionsWithFlag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [optionsWithFlag[i], optionsWithFlag[j]] = [optionsWithFlag[j], optionsWithFlag[i]];
        }
        q.options = optionsWithFlag.map(o => o.text);
        q.ans = optionsWithFlag.findIndex(o => o.isCorrect);
    });

    // Đảo Phần 2
    currentExamData.part2.forEach(q => {
        for (let i = q.stmts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [q.stmts[i], q.stmts[j]] = [q.stmts[j], q.stmts[i]];
        }
    });
}

// --- RENDER GIAO DIỆN ---
function renderExam() {
    let html = '';
    const labels = ['A', 'B', 'C', 'D'];
    const subLabels = ['a', 'b', 'c', 'd'];
    
    // Part 1
    html += `<div class="section-header ui-text">PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn</div>`;
    currentExamData.part1.forEach((q, i) => {
        html += `<div class="question-card fade-in" style="animation-delay: ${i*0.02}s" id="p1-c${i}">
            <div class="q-text"><strong>Câu ${i+1}:</strong> ${q.q}</div>
            <div class="options-grid">`;
        q.options.forEach((optText, oIdx) => {
            html += `<label class="option-label ui-text" onclick="selectRadio(this, 'p1-q${i}')">
                        <input type="radio" name="p1-q${i}" value="${oIdx}" onchange="updateProgress()">
                        <span class="option-char">${labels[oIdx]}.</span>
                        <span>${optText}</span>
                    </label>`;
        });
        html += `</div><div class="explanation ui-text" id="exp-p1-${i}"></div></div>`;
    });

    // Part 2
    html += `<div class="section-header ui-text">PHẦN II. Câu trắc nghiệm Đúng/Sai</div>`;
    currentExamData.part2.forEach((q, i) => {
        html += `<div class="question-card fade-in" id="p2-c${i}">
            <div class="q-text"><strong>Câu ${i+1}:</strong> ${q.context}</div>
            <div style="overflow-x: auto;">
                <table class="p2-table">
                    <tr><th style="text-align:center;">Phát biểu</th><th style="width:70px">Đúng</th><th style="width:70px">Sai</th></tr>`;
        q.stmts.forEach((stmt, sIdx) => {
            html += `<tr>
                <td><strong>${subLabels[sIdx]})</strong> ${stmt.text}</td>
                <td class="center"><input type="radio" class="radio-custom" name="p2-q${i}-s${sIdx}" value="Đ" onchange="updateProgress()"></td>
                <td class="center"><input type="radio" class="radio-custom" name="p2-q${i}-s${sIdx}" value="S" onchange="updateProgress()"></td>
            </tr>`;
        });
        html += `</table></div><div class="explanation ui-text" id="exp-p2-${i}"></div></div>`;
    });

    // Part 3
    html += `<div class="section-header ui-text">PHẦN III. Câu trắc nghiệm trả lời ngắn</div>`;
    currentExamData.part3.forEach((q, i) => {
        html += `<div class="question-card fade-in" id="p3-c${i}">
            <div class="q-text"><strong>Câu ${i+1}:</strong> ${q.q}</div>
            <input type="text" class="input-p3" id="in-p3-q${i}" placeholder="Nhập đáp án của bạn..." oninput="updateProgress()">
            <div class="explanation ui-text" id="exp-p3-${i}"></div>
        </div>`;
    });

    document.getElementById('exam-content').innerHTML = html;
}

// --- LOGIC TƯƠNG TÁC CHUNG ---
function selectRadio(label, name) {
    document.querySelectorAll(`input[name="${name}"]`).forEach(input => input.closest('.option-label').classList.remove('selected'));
    label.classList.add('selected');
}

function updateProgress() {
    let count = 0;
    currentExamData.part1.forEach((_, i) => { if(document.querySelector(`input[name="p1-q${i}"]:checked`)) count++; });
    currentExamData.part2.forEach((q, i) => { q.stmts.forEach((_, s) => { if(document.querySelector(`input[name="p2-q${i}-s${s}"]:checked`)) count++; }); });
    currentExamData.part3.forEach((_, i) => { if(document.getElementById(`in-p3-q${i}`).value.trim() !== '') count++; });
    
    answeredItems = count;
    document.getElementById('prog-bar').style.width = (count / totalItems) * 100 + '%';
}

function startExam() {
    shuffleExam();
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('exam-page').style.display = 'block';
    document.getElementById('header-tools').style.display = 'flex';
    document.getElementById('prog-container').style.display = 'block';
    renderExam();
    window.scrollTo(0, 0);
    
    timeRemaining = originalExamData.meta.time * 60; // Tính theo phút truyền vào
    timerInterval = setInterval(() => {
        timeRemaining--;
        let m = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
        let s = (timeRemaining % 60).toString().padStart(2, '0');
        document.getElementById('time-text').innerText = `${m}:${s}`;
        
        if(timeRemaining <= 300) document.getElementById('timer-display').classList.add('warning');
        if (timeRemaining <= 0) { clearInterval(timerInterval); processSubmit(); }
    }, 1000);
}

function confirmSubmit() {
    document.getElementById('modal-answered').innerText = answeredItems;
    document.getElementById('modal-total').innerText = totalItems;
    document.getElementById('submit-modal').style.display = 'flex';
}

function processSubmit() {
    clearInterval(timerInterval);
    document.getElementById('submit-modal').style.display = 'none';
    document.getElementById('header-tools').style.display = 'none';
    document.getElementById('prog-container').style.display = 'none';
    
    let finalScore = 0; let scoreP1 = 0, scoreP2 = 0, scoreP3 = 0;
    const labels = ['A', 'B', 'C', 'D'];
    const subLabels = ['a', 'b', 'c', 'd'];

    // Chấm Phần 1
    currentExamData.part1.forEach((q, i) => {
        let sel = document.querySelector(`input[name="p1-q${i}"]:checked`);
        let card = document.getElementById(`p1-c${i}`);
        let exp = document.getElementById(`exp-p1-${i}`);
        
        if (sel && parseInt(sel.value) === q.ans) {
            scoreP1 += 0.25; card.classList.add('correct-bg');
            exp.innerHTML = `<div class="exp-title"><span style="color:var(--success)">✅ Chính xác!</span></div>${q.exp}`;
        } else {
            card.classList.add('wrong-bg');
            let uAns = sel ? labels[sel.value] : "Chưa chọn";
            exp.innerHTML = `<div class="exp-title"><span style="color:var(--danger)">❌ Sai.</span> Bạn chọn: ${uAns} | Đáp án đúng: ${labels[q.ans]}</div>${q.exp}`;
        }
        exp.style.display = 'block';
        document.getElementsByName(`p1-q${i}`).forEach(el => el.disabled = true);
    });

    // Chấm Phần 2
    currentExamData.part2.forEach((q, i) => {
        let card = document.getElementById(`p2-c${i}`);
        let exp = document.getElementById(`exp-p2-${i}`);
        let correctInGrp = 0; let expHtml = '<ul style="margin-left: 20px;">';

        q.stmts.forEach((stmt, sIdx) => {
            let sel = document.querySelector(`input[name="p2-q${i}-s${sIdx}"]:checked`);
            let isCorrect = sel && sel.value === stmt.ans;
            if(isCorrect) correctInGrp++;
            expHtml += `<li>${isCorrect ? '✅' : '❌'} <strong>Ý ${subLabels[sIdx]}:</strong> (Bạn chọn: ${sel ? sel.value : '-'} | Chuẩn: ${stmt.ans}) - ${stmt.exp}</li>`;
            document.getElementsByName(`p2-q${i}-s${sIdx}`).forEach(el => el.disabled = true);
        });

        let pts = 0;
        if(correctInGrp === 4) pts = 1.0; else if(correctInGrp === 3) pts = 0.5; else if(correctInGrp === 2) pts = 0.25; else if(correctInGrp === 1) pts = 0.1;

        scoreP2 += pts;
        card.classList.add(pts === 1.0 ? 'correct-bg' : 'wrong-bg');
        exp.innerHTML = `<div class="exp-title">Điểm câu này: <span style="color:var(--primary)">+${pts}đ</span> (${correctInGrp}/4 ý đúng)</div>${expHtml}</ul>`;
        exp.style.display = 'block';
    });

    // Chấm Phần 3
    currentExamData.part3.forEach((q, i) => {
        let input = document.getElementById(`in-p3-q${i}`);
        let card = document.getElementById(`p3-c${i}`);
        let exp = document.getElementById(`exp-p3-${i}`);
        let uVal = input.value.trim().replace(',', '.'); let aVal = q.ans.replace(',', '.');

        if (uVal === aVal) {
            scoreP3 += 0.25; card.classList.add('correct-bg');
            exp.innerHTML = `<div class="exp-title"><span style="color:var(--success)">✅ Chính xác!</span></div>${q.exp}`;
        } else {
            card.classList.add('wrong-bg');
            exp.innerHTML = `<div class="exp-title"><span style="color:var(--danger)">❌ Sai.</span> Đáp án đúng: ${q.ans}</div>${q.exp}`;
        }
        exp.style.display = 'block'; input.disabled = true;
    });

    finalScore = scoreP1 + scoreP2 + scoreP3;
    
    document.getElementById('exam-page').style.display = 'none';
    document.getElementById('result-page').style.display = 'block';
    document.getElementById('result-details').appendChild(document.getElementById('exam-content'));
    document.getElementById('exam-page').style.display = 'block'; 
    
    document.getElementById('final-score').innerText = finalScore.toFixed(2);
    document.getElementById('score-p1').innerText = scoreP1.toFixed(2);
    document.getElementById('score-p2').innerText = scoreP2.toFixed(2);
    document.getElementById('score-p3').innerText = scoreP3.toFixed(2);
    
    // Thang điểm động dựa trên tổng số điểm có thể đạt (tối đa hiện tại là tổng số câu tính theo điểm, Lịch Sử ít câu nên thang tròn sẽ khác)
    let maxPossScore = (currentExamData.part1.length * 0.25) + (currentExamData.part2.length * 1.0) + (currentExamData.part3.length * 0.25);
    document.getElementById('score-circle-bg').style.background = `conic-gradient(var(--success) ${(finalScore / maxPossScore) * 100}%, var(--border) 0)`;
    
    let msg = '';
    let percent = finalScore / maxPossScore;
    if(percent >= 0.8) msg = "Tuyệt vời! Kiến thức của bạn cực kỳ vững chắc. 🌟";
    else if(percent >= 0.6) msg = "Khá tốt! Hãy xem lại các câu sai để rút kinh nghiệm nhé. 👍";
    else msg = "Cần cố gắng hơn! Bạn hãy đọc kỹ phần giải thích bên dưới nhé. 📚";
    document.getElementById('feedback-msg').innerText = msg;

    window.scrollTo(0, 0);
}
