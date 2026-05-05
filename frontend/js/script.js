// ============================================================
//  ScholarNet — script.js  v3.0
//  依賴：Chart.js 4.x (CDN in index.html)
// ============================================================

const API_BASE = "http://127.0.0.1:8000";

// ── 全域狀態 ─────────────────────────────────────────────────
let currentCollabType = "dashboard-country";
let dashboardChartInstances = [];

// ── Tab 切換 ─────────────────────────────────────────────────
function switchTab(tab) {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    document.getElementById("tab-" + tab).classList.add("active");
    document.getElementById("panel-" + tab).classList.add("active");
    clearResult();
    hideDashboardResults();
}

function clearResult() {
    document.getElementById("result").innerHTML = "";
}

function hideDashboardResults() {
    document.getElementById("dashboard-results").style.display = "none";
    document.getElementById("dashboard-results").innerHTML = "";
}

// ── 合作類型選擇 (Dashboard 限定) ──────────────────────────────
function selectCollabType(el, type) {
    document.querySelectorAll(".type-chip").forEach(c => c.classList.remove("active"));
    el.classList.add("active");
    currentCollabType = type;
    hideDashboardResults();

    const isCountry = type === "dashboard-country";
    document.getElementById("filter-dash-primary-country").style.display = isCountry ? "flex" : "none";
    document.getElementById("filter-dash-primary-aff").style.display = isCountry ? "none" : "flex";
}

// ── 階層式 Dashboard 分析 ─────────────────────────────────────
async function loadDashboard() {
    const limit = document.getElementById("collabLimit").value;
    const params = new URLSearchParams({ limit });

    if (currentCollabType === "dashboard-country") {
        const pCountry = document.getElementById("dashPrimaryCountry").value.trim();
        if (!pCountry) { alert("請輸入主體國家！"); return; }
        params.append("primary_country", pCountry);
    } else {
        const pAff = document.getElementById("dashPrimaryAff").value.trim();
        if (!pAff) { alert("請輸入主體機構！"); return; }
        params.append("primary_aff", pAff);
    }

    const subC = document.getElementById("dashSubCountry").value.trim();
    const subA = document.getElementById("dashSubAff").value.trim();
    if (subC) params.append("collab_country", subC);
    if (subA) params.append("collab_aff", subA);

    const endpoint = currentCollabType === "dashboard-country" ? "country" : "affiliation";
    const url = `${API_BASE}/collaboration/dashboard/${endpoint}?${params}`;

    const dashContainer = document.getElementById("dashboard-results");
    dashContainer.style.display = "flex";
    dashContainer.innerHTML = `<div class="status-loading"><div class="spinner"></div>正在產生階層式 Dashboard，請稍候...</div>`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        renderDashboardUI(data);
    } catch (e) {
        dashContainer.innerHTML = `<div class="status-error">⚠ 發生錯誤：${e.message}</div>`;
    }
}
// ── 輔助函式：將長字串依指定長度自動折成多行陣列 (供 Chart.js 顯示多行標籤) ──
function wrapText(text, maxChars) {
    if (!text) return ["—"];
    const words = text.split(" ");
    const lines = [];
    let currentLine = "";
    words.forEach(word => {
        if ((currentLine + word).length > maxChars) {
            if (currentLine) lines.push(currentLine.trim());
            currentLine = word + " ";
        } else {
            currentLine += word + " ";
        }
    });
    if (currentLine) lines.push(currentLine.trim());
    return lines;
}

// ── 動態產生 3 組「圖表 + 表格」 ──
function renderDashboardUI(data) {
    const dashContainer = document.getElementById("dashboard-results");
    dashContainer.innerHTML = ""; // 清空

    // 清除舊的 Chart 實例
    dashboardChartInstances.forEach(c => c.destroy());
    dashboardChartInstances = [];

    const isCountry = currentCollabType === "dashboard-country";
    const prefix = isCountry ? "國家" : "機構";

    const sections = [
        { key: "collab_country", title: `${prefix} × 合作國家`, colB: "合作國家", isAuthor: false },
        { key: "collab_affiliation", title: `${prefix} × 合作機構`, colB: "合作機構", isAuthor: false },
        { key: "collab_author", title: `${prefix} × 合作作者`, colB: "合作作者", isAuthor: true }
    ];

    sections.forEach((sec, idx) => {
        const sectionData = data[sec.key] || [];
        const canvasId = `dashChart_${idx}`;

        // 動態計算高度：資料筆數越多，給予的高度越高 (避免多行文字擠在一起)
        const itemHeight = 55;
        const containerHeight = Math.max(350, sectionData.length * itemHeight);

        let tableHtml = "";
        if (sectionData.length === 0) {
            tableHtml = `<div class="status-empty">此維度查無合作資料</div>`;
        } else {
            tableHtml = buildDashboardTable(sectionData, sec.colB, sec.isAuthor, containerHeight);
        }

        const sectionHtml = `
            <div class="dashboard-block" style="border:1px solid var(--border); padding:20px; border-radius:10px; background:var(--bg-surface);">
                <h3 style="margin-bottom:15px; color:var(--accent-blue);">${sec.title}</h3>
                <div style="display:flex; gap:20px; flex-wrap:wrap;">
                    <!-- 左側血條：縮小佔比為 0.8，縮減寬度 -->
                    <div style="flex:0.8; min-width:300px; height:${containerHeight}px;">
                        ${sectionData.length > 0 ? `<canvas id="${canvasId}"></canvas>` : ''}
                    </div>
                    <!-- 右側表格：加大佔比為 2，讓欄位能大幅往右延伸 -->
                    <div style="flex:2; min-width:600px;">
                        ${tableHtml}
                    </div>
                </div>
            </div>
        `;
        dashContainer.insertAdjacentHTML("beforeend", sectionHtml);

        // 渲染對應的 Chart
        if (sectionData.length > 0) {
            renderMiniChart(canvasId, sectionData);
        }
    });
}

// ── 渲染 Dashboard 專用的小圖表 (血條) ──
function renderMiniChart(canvasId, data) {
    // 使用 wrapText 將長字串每 25 個字元折行
    const labels = data.map(d => wrapText(d.entity_b, 25));
    const counts = data.map(d => d.collaboration_count);
    const ctx = document.getElementById(canvasId).getContext("2d");

    const chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "論文數", data: counts,
                backgroundColor: "rgba(56,139,253,0.75)",
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: "#8b949e", font: { size: 10 } } },
                y: {
                    ticks: {
                        color: "#e6edf3",
                        font: { size: 11 },
                        autoSkip: false // 強制顯示所有 Y 軸標籤，不省略
                    }
                }
            }
        }
    });
    dashboardChartInstances.push(chart);
}

// ── 渲染 Dashboard 專用 Table ──
function buildDashboardTable(data, colBLabel, isAuthor, containerHeight) {
    let thead = isAuthor
        ? `<tr><th>排名</th><th>作者 ID</th><th>姓名</th><th>機構</th><th>論文數</th></tr>`
        : `<tr><th>排名</th><th>主體 A</th><th>${colBLabel}</th><th>論文數</th></tr>`;

    const rows = data.map((d, i) => {
        if (isAuthor) {
            return `<tr>
                <td class="rank-cell">#${i + 1}</td>
                <td class="mono">${d.entity_b}</td>
                <td>${safe(d.b_surname)} ${safe(d.b_given_name)}</td>
                <td>${safe(d.b_affiliation)}</td>
                <td><span class="badge-count">${d.collaboration_count}</span></td>
            </tr>`;
        } else {
            return `<tr>
                <td class="rank-cell">#${i + 1}</td>
                <td>${safe(d.entity_a)}</td>
                <td>${safe(d.entity_b)}</td>
                <td><span class="badge-count">${d.collaboration_count}</span></td>
            </tr>`;
        }
    }).join("");

    // 設定 max-height 讓表格能與圖表高度切齊，超出時顯示捲動軸
    return `
    <div class="data-table-wrap" style="max-height:${containerHeight}px; overflow-y:auto;">
        <table class="data-table">
            <thead>${thead}</thead>
            <tbody>${rows}</tbody>
        </table>
    </div>`;
}

// ── 作者資訊 API ──────────────────────────────────────────────
async function loadAllAuthorInfo() {
    const surname = document.getElementById("filterSurname").value.trim();
    const givenName = document.getElementById("filterGivenName").value.trim();
    const country = document.getElementById("filterCountry").value.trim();
    const city = document.getElementById("filterCity").value.trim();
    const affiliation = document.getElementById("filterAffiliation").value.trim();

    const params = new URLSearchParams({ limit: 200 });
    if (surname) params.append("surname", surname);
    if (givenName) params.append("given_name", givenName);
    if (country) params.append("country", country);
    if (city) params.append("city", city);
    if (affiliation) params.append("affiliation", affiliation);

    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = loading();

    try {
        const res = await fetch(`${API_BASE}/author-info?${params}`);
        if (!res.ok) throw new Error("無法取得資料");
        const data = await res.json();
        resultDiv.innerHTML = buildInfoTable(data);
    } catch (e) { resultDiv.innerHTML = errorMsg(e.message); }
}

async function searchAuthorInfo() {
    const authorId = document.getElementById("authorIdInfo").value.trim();
    if (!authorId) { alert("請輸入作者 ID！"); return; }

    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = loading();

    try {
        const res = await fetch(`${API_BASE}/author-info/${authorId}`);
        if (res.status === 404) { resultDiv.innerHTML = notFound(authorId); return; }
        if (!res.ok) throw new Error("查詢失敗");
        const a = await res.json();
        resultDiv.innerHTML = buildInfoCard(a);
    } catch (e) { resultDiv.innerHTML = errorMsg(e.message); }
}

function buildInfoTable(data) {
    if (!data.length) return `<div class="status-empty">查無符合條件的作者。</div>`;
    const rows = data.map(a => `
        <tr>
            <td class="mono">${a.author_id}</td>
            <td>${safe(a.surname)} ${safe(a.given_name)}</td>
            <td title="${a.ip_doc_parent_preferred_name || ''}">${safe(a.ip_doc_parent_preferred_name)}</td>
            <td>${safe(a.ip_doc_address_city)}</td>
            <td>${safe(a.ip_doc_address_country)}</td>
        </tr>`).join("");

    return `
    <div class="result-meta">
        <h3>作者資訊列表</h3>
        <span class="count-pill">${data.length} 筆結果</span>
    </div>
    <div class="data-table-wrap">
        <table class="data-table">
            <thead><tr><th>作者 ID</th><th>姓名</th><th>機構</th><th>城市</th><th>國家</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    </div>`;
}

function buildInfoCard(a) {
    const fields = [
        ["作者 ID", a.author_id], ["姓名", `${safe(a.surname)} ${safe(a.given_name)}`], ["父節點", a.parent],
        ["機構 ID", a.affiliation_id], ["機構偏好名稱", a.ip_doc_parent_preferred_name], ["機構排序名稱", a.ip_doc_sort_name], ["機構顯示名稱", a.ip_doc_afdispname],
        ["城市", a.ip_doc_address_city], ["國家", a.ip_doc_address_country],
    ];
    const rows = fields.map(([k, v]) =>
        `<p><strong>${k}</strong><span>${safe(v)}</span></p>`
    ).join("");
    return `<div class="card-result">${rows}</div>`;
}

// ── 完整查詢 ──────────────────────────────────────────────────
async function searchFull() {
    const authorId = document.getElementById("authorIdFull").value.trim();
    if (!authorId) { alert("請輸入作者 ID！"); return; }

    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = loading();

    try {
        const res = await fetch(`${API_BASE}/authors/${authorId}/full`);
        if (res.status === 404) { resultDiv.innerHTML = notFound(authorId); return; }
        if (!res.ok) throw new Error("查詢失敗");
        const a = await res.json();

        const fields = [["作者 ID", a.author_id],
        ["姓名", `${safe(a.surname)} ${safe(a.given_name)}`], ["H-index", a.h_index !== null && a.h_index !== undefined
            ? `<span class="big-num">${a.h_index}</span>`
            : '<span class="muted">尚無資料</span>'],
        ["機構 ID", a.affiliation_id],
        ["機構名稱", a.ip_doc_parent_preferred_name], ["機構顯示名稱", a.ip_doc_afdispname], ["城市", a.ip_doc_address_city],
        ["國家", a.ip_doc_address_country],
        ];
        const rows = fields.map(([k, v]) =>
            `<p><strong>${k}</strong><span>${safe(v)}</span></p>`
        ).join("");
        resultDiv.innerHTML = `<div class="card-result">${rows}</div>`;
    } catch (e) { resultDiv.innerHTML = errorMsg(e.message); }
}

// ── Helpers ───────────────────────────────────────────────────
function safe(val) {
    if (val === null || val === undefined || val === '') return '<span class="muted">—</span>';
    return escHtml(String(val));
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function truncate(str, max) {
    if (!str) return "—";
    return str.length > max ? str.slice(0, max) + "…" : str;
}

function loading() {
    return `<div class="status-loading"><div class="spinner"></div>載入中...</div>`;
}

function notFound(id) {
    return `<div class="status-empty">找不到作者 ID：<strong>${escHtml(id)}</strong></div>`;
}

function errorMsg(msg) {
    return `<div class="status-error">⚠ 發生錯誤：${escHtml(msg)}</div>`;
}