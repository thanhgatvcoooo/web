const urlParams = new URLSearchParams(window.location.search);
const examId = urlParams.get('exam') || 'de1'; 

let originalExamData = null; 
let currentExamData = {};
let totalItems = 0;
let answeredItems = 0;
let timerInterval;
let timeRemaining = 0;

document.addEventListener("DOMContentLoaded", () => {
    originalExamData = window[examId]; 

    if(!originalExamData) {
        document.getElementById("intro-title").innerText = "Lỗi: Không tìm thấy dữ liệu đề thi!";
        document.getElementById("header-subject-info").innerText = "Lỗi hệ thống";
        return;
    }
    
    document.title = `${originalExamData.meta.subject} - Mã đề ${originalExamData.meta.code}`;
    document.getElementById("header-subject-info").innerText = `Môn: ${originalExamData.meta.subject} | Mã đề: ${originalExamData.meta.code}`;
    document.getElementById("intro-title").innerText = originalExamData.meta.title;
    
    let p1Count = originalExamData.part1 ? originalExamData.part1.length : 0;
    let p2Count = originalExamData.part2 ? (originalExamData.part2.length * 4) : 0;
    let p3Count = originalExamData.part3 ? originalExamData.part3.length : 0;
    totalItems = p1Count + p2Count + p3Count;
});

function shuffleExam() {
    currentExamData = JSON.parse(JSON.stringify(originalExamData));

    if(currentExamData.part1) {
        currentExamData.part1.forEach(q => {
            let optionsWithFlag = q.options.map((opt, idx) => ({ text: opt, isCorrect: idx === q.ans }));
            for (let i = optionsWithFlag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [optionsWithFlag[i], optionsWithFlag[j]] = [optionsWithFlag[j], optionsWithFlag[i]];
            }
            q.options = optionsWithFlag.map(o => o.text);
            q.ans = optionsWithFlag.findIndex(o => o.isCorrect);
        });
    }

    if(currentExamData.part2) {
        currentExamData.part2.forEach(q => {
            for (let i = q.stmts.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [q.stmts[i], q.stmts[j]] = [q.stmts[j], q.stmts[i]];
            }
        });
    }
}

function renderExam() {
    let html = '';
    const labels = ['A', 'B', 'C', 'D'];
    const subLabels = ['a', 'b', 'c', 'd'];
    
    if(currentExamData.part1 && currentExamData.part1.length > 0) {
        html += `<div class="section-header">PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn</div>`;
        currentExamData.part1.forEach((q, i) => {
            html += `<div class="question-card fade-in" id="p1-c${i}">
                <div class="q-text exam-text"><strong>Câu ${i+1}:</strong> ${q.q}</div>
                <div class="options-grid">`;
            q.options.forEach((optText, oIdx) => {
                html += `<label class="option-label exam-text" onclick="selectRadio(this, 'p1-q${i}')">
                            <input type="radio" name="p1-q${i}" value="${oIdx}" onchange="updateProgress()">
                            <span class="option-char">${labels[oIdx]}.</span>
                            <span>${optText}</span>
                        </label>`;
            });
            html += `</div><div class="explanation exam-text" id="exp-p1-${i}"></div></div>`;
        });
    }

    if(currentExamData.part2 && currentExamData.part2.length > 0) {
        html += `<div class="section-header">PHẦN II. Câu trắc nghiệm Đúng/Sai</div>`;
        currentExamData.part2.forEach((q, i) => {
            html += `<div class="question-card fade-in" id="p2-c${i}">
                <div class="q-text exam-text"><strong>Câu ${i+1}:</strong> ${q.context}</div>
                <div style="overflow-x: auto;">
                    <table class="p2-table exam-text">
                        <tr><th>Phát biểu</th><th class="center">Đúng</th><th class="center">Sai</th></tr>`;
            q.stmts.forEach((stmt, sIdx) => {
                html += `<tr>
                    <td><strong>${subLabels[sIdx]})</strong> ${stmt.text}</td>
                    <td class="center"><input type="radio" class="radio-custom" name="p2-q${i}-s${sIdx}" value="Đ" onchange="updateProgress()"></td>
                    <td class="center"><input type="radio" class="radio-custom" name="p2-q${i}-s${sIdx}" value="S" onchange="updateProgress()"></td>
                </tr>`;
            });
            html += `</table></div><div class="explanation exam-text" id="exp-p2-${i}"></div></div>`;
        });
    }

    if(currentExamData.part3 && currentExamData.part3.length > 0) {
        html += `<div class="section-header">PHẦN III. Câu trắc nghiệm trả lời ngắn</div>`;
        currentExamData.part3.forEach((q, i) => {
            html += `<div class="question-card fade-in" id="p3-c${i}">
                <div class="q-text exam-text"><strong>Câu ${i+1}:</strong> ${q.q}</div>
                <input type="text" class="input-p3" id="in-p3-q${i}" placeholder="Nhập đáp án của bạn..." oninput="updateProgress()">
                <div class="explanation exam-text" id="exp-p3-${i}"></div>
            </div>`;
        });
    }

    document.getElementById('exam-content').innerHTML = html;
}

function selectRadio(label, name) {
    document.querySelectorAll(`input[name="${name}"]`).forEach(input => input.closest('.option-label').classList.remove('selected'));
    label.classList.add('selected');
}

function updateProgress() {
    let count = 0;
    if(currentExamData.part1) currentExamData.part1.forEach((_, i) => { if(document.querySelector(`input[name="p1-q${i}"]:checked`)) count++; });
    if(currentExamData.part2) currentExamData.part2.forEach((q, i) => { q.stmts.forEach((_, s) => { if(document.querySelector(`input[name="p2-q${i}-s${s}"]:checked`)) count++; }); });
    if(currentExamData.part3) currentExamData.part3.forEach((_, i) => { if(document.getElementById(`in-p3-q${i}`).value.trim() !== '') count++; });
    
    answeredItems = count;
    document.getElementById('prog-bar').style.width = (count / totalItems) * 100 + '%';
}

function startExam() {
    if(!originalExamData) { alert("Dữ liệu lỗi. Vui lòng F5!"); return; }

    shuffleExam();
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('exam-page').style.display = 'block';
    document.getElementById('header-tools').style.display = 'flex';
    document.getElementById('prog-container').style.display = 'block';
    renderExam();
    window.scrollTo(0, 0);
    
    timeRemaining = originalExamData.meta.time * 60; 
    timerInterval = setInterval(() => {
        timeRemaining--;
        let m = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
        let s = (timeRemaining % 60).toString().padStart(2, '0');
        document.getElementById('time-text').innerText = `${m}:${s}`;
        
        if(timeRemaining <= 300) document.getElementById('timer-display').classList.add('warning');
        
        if (timeRemaining <= 0) { 
            clearInterval(timerInterval); 
            alert("Đã hết thời gian làm bài! Hệ thống tự động thu bài.");
            processSubmit(); 
        }
    }, 1000);
}

function confirmSubmit() {
    if (answeredItems < totalItems) {
        document.getElementById('missing-count').innerText = totalItems - answeredItems;
        document.getElementById('warning-modal').style.display = 'flex';
        return;
    }
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

    if(currentExamData.part1) {
        currentExamData.part1.forEach((q, i) => {
            let sel = document.querySelector(`input[name="p1-q${i}"]:checked`);
            let card = document.getElementById(`p1-c${i}`);
            let exp = document.getElementById(`exp-p1-${i}`);
            
            if (sel && parseInt(sel.value) === q.ans) {
                scoreP1 += 0.25; card.classList.add('correct-bg');
                exp.innerHTML = `<div class="exp-title"><span style="color:var(--success)">✓ Chính xác</span></div>${q.exp}`;
            } else {
                card.classList.add('wrong-bg');
                let uAns = sel ? labels[sel.value] : "Chưa chọn";
                exp.innerHTML = `<div class="exp-title"><span style="color:var(--danger)">✗ Sai.</span> Bạn chọn: ${uAns} | Đáp án đúng: ${labels[q.ans]}</div>${q.exp}`;
            }
            exp.style.display = 'block';
            document.getElementsByName(`p1-q${i}`).forEach(el => el.disabled = true);
        });
    }

    if(currentExamData.part2) {
        currentExamData.part2.forEach((q, i) => {
            let card = document.getElementById(`p2-c${i}`);
            let exp = document.getElementById(`exp-p2-${i}`);
            let correctInGrp = 0; let expHtml = '<ul class="rules-list" style="margin-top:10px;">';

            q.stmts.forEach((stmt, sIdx) => {
                let sel = document.querySelector(`input[name="p2-q${i}-s${sIdx}"]:checked`);
                let isCorrect = sel && sel.value === stmt.ans;
                if(isCorrect) correctInGrp++;
                
                let iconStr = isCorrect ? '<span style="color:var(--success)">✓</span>' : '<span style="color:var(--danger)">✗</span>';
                expHtml += `<li style="padding-left:0; list-style:none;">${iconStr} <strong>Ý ${subLabels[sIdx]}:</strong> (Bạn: ${sel ? sel.value : '-'} | Chuẩn: ${stmt.ans}) - ${stmt.exp}</li>`;
                document.getElementsByName(`p2-q${i}-s${sIdx}`).forEach(el => el.disabled = true);
            });

            let pts = 0;
            if(correctInGrp === 4) pts = 1.0; else if(correctInGrp === 3) pts = 0.5; else if(correctInGrp === 2) pts = 0.25; else if(correctInGrp === 1) pts = 0.1;

            scoreP2 += pts;
            card.classList.add(pts === 1.0 ? 'correct-bg' : 'wrong-bg');
            exp.innerHTML = `<div class="exp-title">Điểm câu này: <span style="color:var(--primary); margin-left:5px;">+${pts}đ</span> (${correctInGrp}/4 ý đúng)</div>${expHtml}</ul>`;
            exp.style.display = 'block';
        });
    }

    if(currentExamData.part3) {
        currentExamData.part3.forEach((q, i) => {
            let input = document.getElementById(`in-p3-q${i}`);
            let card = document.getElementById(`p3-c${i}`);
            let exp = document.getElementById(`exp-p3-${i}`);
            let uVal = input.value.trim().replace(',', '.'); let aVal = q.ans.replace(',', '.');

            if (uVal === aVal) {
                scoreP3 += 0.25; card.classList.add('correct-bg');
                exp.innerHTML = `<div class="exp-title"><span style="color:var(--success)">✓ Chính xác (+0.25đ)</span></div>${q.exp}`;
            } else {
                card.classList.add('wrong-bg');
                exp.innerHTML = `<div class="exp-title"><span style="color:var(--danger)">✗ Sai.</span> Đáp án đúng: ${q.ans}</div>${q.exp}`;
            }
            exp.style.display = 'block'; input.disabled = true;
        });
    }

    finalScore = scoreP1 + scoreP2 + scoreP3;
    
    let statHtml = ''; let maxPossScore = 0;
    if(currentExamData.part1) { let maxP1 = currentExamData.part1.length * 0.25; maxPossScore += maxP1; statHtml += `<div class="stat-box st-p1"><div style="color: #64748b; font-size: 0.9rem;">Phần I (Max ${maxP1})</div><div style="font-size: 1.5rem; font-weight: bold; color: #3b82f6;">${scoreP1.toFixed(2)}</div></div>`; }
    if(currentExamData.part2) { let maxP2 = currentExamData.part2.length * 1.0; maxPossScore += maxP2; statHtml += `<div class="stat-box st-p2"><div style="color: #64748b; font-size: 0.9rem;">Phần II (Max ${maxP2})</div><div style="font-size: 1.5rem; font-weight: bold; color: #8b5cf6;">${scoreP2.toFixed(2)}</div></div>`; }
    if(currentExamData.part3 && currentExamData.part3.length > 0) { let maxP3 = currentExamData.part3.length * 0.25; maxPossScore += maxP3; statHtml += `<div class="stat-box st-p3"><div style="color: #64748b; font-size: 0.9rem;">Phần III (Max ${maxP3})</div><div style="font-size: 1.5rem; font-weight: bold; color: #ec4899;">${scoreP3.toFixed(2)}</div></div>`; }
    document.getElementById('stat-grid').innerHTML = statHtml;

    document.getElementById('exam-page').style.display = 'none';
    document.getElementById('result-page').style.display = 'block';
    document.getElementById('result-details').appendChild(document.getElementById('exam-content'));
    document.getElementById('exam-page').style.display = 'block'; 
    
    document.getElementById('final-score').innerText = finalScore.toFixed(2);
    document.getElementById('score-circle-bg').style.background = `conic-gradient(var(--success) ${(finalScore / maxPossScore) * 100}%, #e2e8f0 0)`;
    
    let percent = finalScore / maxPossScore; let msg = '';
    if(percent >= 0.8) msg = "Tuyệt vời! Kiến thức của bạn cực kỳ vững chắc. 🌟";
    else if(percent >= 0.6) msg = "Khá tốt! Hãy xem lại các câu sai để rút kinh nghiệm nhé. 👍";
    else msg = "Cần cố gắng hơn! Đừng bỏ qua phần giải thích chi tiết bên dưới nhé. 📚";
    document.getElementById('feedback-msg').innerText = msg;
    window.scrollTo(0, 0);
}
