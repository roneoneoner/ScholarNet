/* ============================================================
   nobel.js — 諾貝爾合作分析 Tab 的資料抓取與渲染邏輯
============================================================ */

let nobelCharts = [];

const nobel = {

    // ── 初始化：載入領域分類下拉選單 ──────────────────────────
    init: async () => {
        try {
            const cats = await api.get('/nobel/categories');
            const sel = document.getElementById('nobelCategory');
            cats.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c; opt.textContent = c;
                sel.appendChild(opt);
            });
        } catch (e) {
            console.warn('無法載入諾貝爾領域分類', e);
        }
    },

    // ── 主執行：同時拉取兩個視角的統計 ──────────────────────────
    fetchAndRender: async () => {
        const category = document.getElementById('nobelCategory').value || null;
        const limit = parseInt(document.getElementById('nobelLimit').value) || 30;
        const container = document.getElementById('nobel-dash');
        await nobel.performFetchAndRender(category, limit, container);
    },

    fetchAndRenderForAuthor: async (authorId, container) => {
        container.innerHTML = '<div class="status-msg">正在查詢該作者的諾貝爾合作詳情...</div>';
        try {
            const details = await api.get(`/nobel/detail?tw_author_id=${authorId}&limit=100`);
            if (!details.length) {
                container.innerHTML = '<div class="status-msg">該作者目前尚無與諾貝爾得主合作的記錄。</div>';
                return;
            }

            let html = `
                <div class="nobel-profile-view">
                    <h3 style="color:var(--accent-tw); margin-bottom:15px;">🏅 諾貝爾得主合作詳情</h3>
                    <div class="data-table-wrap">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>領域</th>
                                    <th>諾貝爾得主</th>
                                    <th>合作論文數</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
            `;

            // Group by nobel winner for summary
            const summary = {};
            details.forEach(d => {
                const name = `${d.nobel_last_name}`;
                if (!summary[name]) {
                    summary[name] = { 
                        name: name, 
                        categories: d.categories, 
                        count: 0, 
                        papers: [] 
                    };
                }
                summary[name].count++;
                summary[name].papers.push(d.paper_id);
            });

            Object.values(summary).forEach(s => {
                html += `
                    <tr>
                        <td><span class="tag-category">${s.categories}</span></td>
                        <td><strong>${s.name}</strong></td>
                        <td style="text-align:center; font-weight:bold; color:var(--accent-nobel)">${s.count}</td>
                        <td>
                            <button class="btn-sm" onclick="nobel.showDetails('${s.name}', 'nobel', '${s.name}')">🔍 查看論文</button>
                        </td>
                    </tr>
                `;
            });

            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            container.innerHTML = html;
        } catch (e) {
            container.innerHTML = `<div class="status-msg error">⚠ 查詢失敗: ${e.message}</div>`;
        }
    },

    performFetchAndRender: async (category, limit, container) => {
        container.innerHTML = '<div class="status-msg">正在查詢諾貝爾合作資料...</div>';
        nobelCharts.forEach(c => c.destroy()); nobelCharts = [];

        try {
            const params = new URLSearchParams({ limit });
            if (category) params.append('category', category);

            const [byNobel, byTw] = await Promise.all([
                api.get(`/nobel/summary/by-nobel?${params}`),
                api.get(`/nobel/summary/by-tw-author?${params}`)
            ]);

            container.innerHTML = '';

            // ── 新增：領域分佈圖 ──
            nobel.renderCategoryChart(container, byNobel);

            nobel.renderNobelBlock(container, byNobel);
            nobel.renderTwBlock(container, byTw);

        } catch (e) {
            container.innerHTML = `<div class="status-msg">⚠ 查詢失敗: ${e.message}</div>`;
        }
    },

    // ── 渲染：領域分佈圓餅圖 ─────────────────────────────────────
    renderCategoryChart: (container, data) => {
        const catMap = {};
        data.forEach(d => {
            const cats = d.categories ? d.categories.split(',') : ['Unknown'];
            cats.forEach(c => {
                c = c.trim();
                catMap[c] = (catMap[c] || 0) + d.paper_count;
            });
        });

        const id = 'cat_chart';
        container.innerHTML += `
            <div class="dash-block" style="justify-content:center">
                <div style="width:100%; text-align:center"><h3 style="color:var(--accent-nobel)">🧬 諾貝爾合作領域分佈 (按篇數)</h3></div>
                <div style="width:300px; height:300px"><canvas id="${id}"></canvas></div>
            </div>`;

        setTimeout(() => {
            const ctx = document.getElementById(id).getContext('2d');
            nobelCharts.push(new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: Object.keys(catMap),
                    datasets: [{
                        data: Object.values(catMap),
                        backgroundColor: ['#f0883e', '#3fb950', '#388bfd', '#bc8cff', '#fa4549', '#d29922']
                    }]
                },
                options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#e6edf3' } } } }
            }));
        }, 50);
    },

    // ── 渲染：諾貝爾得主視角 ────────────────────────────────────
    renderNobelBlock: (container, data) => {
        if (!data.length) {
            container.innerHTML += `<div class="card"><p>查無諾貝爾合作資料。</p></div>`;
            return;
        }

        const chartId = 'nc_' + Math.random().toString(36).substr(2, 8);

        // 表格
        let tableHTML = `
            <table>
                <tr>
                    <th>排名</th><th>領域</th><th>得主姓名</th>
                    <th>合作論文數</th><th>台灣合作作者數</th>
                </tr>`;
        data.forEach((d, i) => {
            const nobelLink = d.nobel_link
                ? `<a href="${d.nobel_link}" target="_blank" class="icon-link" title="Open Scopus Profile">🔗</a>`
                : '';
            const fullName = `${d.nobel_last_name || ''}, ${d.nobel_first_name || ''}`;
            tableHTML += `
                <tr>
                    <td>#${i + 1}</td>
                    <td><span class="tag-category">${d.categories || '—'}</span></td>
                    <td>
                        ${fullName} ${nobelLink}
                    </td>
                    <td style="color:var(--accent-nobel);font-weight:bold" class="clickable" onclick="nobel.showDetails('${fullName}', 'nobel', '${d.nobel_last_name}')">${d.paper_count}</td>
                    <td>${d.tw_author_count}</td>
                </tr>`;
        });
        tableHTML += '</table>';

        container.innerHTML += `
            <div class="dash-block">
                <div style="flex:100%; display:flex; justify-content:space-between; align-items:center">
                    <div>
                        <h3 style="color:var(--accent-nobel)">🏅 諾貝爾得主視角：與台灣學者的合作篇數</h3>
                        <p class="block-desc">依每位諾貝爾得主統計其與台灣籍作者共同發表的論文數量</p>
                    </div>
                    <button class="export-btn" onclick='ui.exportToCSV("Nobel_Summary_By_Winner.csv", ${JSON.stringify(data.map(({paper_ids, ...rest}) => rest))})'>📥 匯出 CSV</button>
                </div>
                <div class="chart-container"><canvas id="${chartId}"></canvas></div>
                <div class="table-container">${tableHTML}</div>
            </div>`;

        setTimeout(() => {
            const labels = data.map(d => `${d.nobel_last_name} (${d.categories || '?'})`);
            const values = data.map(d => d.paper_count);
            nobel.drawChart(chartId, labels, values, '#f0883e');
        }, 50);
    },

    // ── 渲染：台灣作者視角 ────────────────────────────────────
    renderTwBlock: (container, data) => {
        if (!data.length) {
            container.innerHTML += `<div class="card"><p>查無台灣作者合作資料。</p></div>`;
            return;
        }

        const chartId = 'tc_' + Math.random().toString(36).substr(2, 8);

        let tableHTML = `
            <table>
                <tr>
                    <th>排名</th><th>台灣作者</th><th>服務機構</th>
                    <th>合作論文數</th><th>合作得主數</th><th>合作得主</th>
                </tr>`;
        data.forEach((d, i) => {
            const name = `${d.surname || ''} ${d.given_name || ''}`.trim() || '—';
            const nobels = d.collaborated_nobels
                ? (d.collaborated_nobels.length > 50
                    ? d.collaborated_nobels.substring(0, 50) + '…'
                    : d.collaborated_nobels)
                : '—';
            const authorLink = d.author_link
                ? `<a href="${d.author_link}" target="_blank" class="icon-link" title="Open Scopus Profile">🔗</a>`
                : '';
            tableHTML += `
                <tr>
                    <td>#${i + 1}</td>
                    <td>${name} ${authorLink}</td>
                    <td class="aff-cell" title="${d.affiliation || ''}">${d.affiliation || '—'}</td>
                    <td style="color:var(--accent-tw);font-weight:bold" class="clickable" onclick="nobel.showDetails('${name}', 'tw', '${d.author_id}')">${d.paper_count}</td>
                    <td>${d.nobel_count}</td>
                    <td class="scopus-list" title="${d.collaborated_nobels || ''}">${nobels}</td>
                </tr>`;
        });
        tableHTML += '</table>';

        container.innerHTML += `
            <div class="dash-block">
                <div style="flex:100%; display:flex; justify-content:space-between; align-items:center">
                    <div>
                        <h3 style="color:var(--accent-tw)">🇹🇼 台灣作者視角：誰與諾貝爾得主合作最多</h3>
                        <p class="block-desc">統計台灣籍作者中，與諾貝爾獎得主共同發表論文最多的研究者</p>
                    </div>
                    <button class="export-btn" onclick='ui.exportToCSV("Nobel_Summary_By_TW_Author.csv", ${JSON.stringify(data.map(({collaborated_nobels, ...rest}) => rest))})'>📥 匯出 CSV</button>
                </div>
                <div class="chart-container"><canvas id="${chartId}"></canvas></div>
                <div class="table-container">${tableHTML}</div>
            </div>`;

        setTimeout(() => {
            const labels = data.map(d => `${d.surname || ''} ${d.given_name || ''}`.trim() || d.author_id);
            const values = data.map(d => d.paper_count);
            nobel.drawChart(chartId, labels, values, '#3fb950');
        }, 50);
    },

    // ── 詳細論文清單彈窗 ──────────────────────────────────────
    showDetails: async (name, mode, val) => {
        ui.openModal(`正在載入 ${name} 的合作詳情...`, '<div class="status-msg">Loading...</div>');
        try {
            const params = {};
            if (mode === 'nobel') params.nobel_name = val;
            else params.tw_author_id = val;
            
            const query = new URLSearchParams(params).toString();
            const details = await api.get(`/nobel/detail?${query}&limit=100`);
            
            if (!details.length) {
                ui.openModal(`合作論文詳情 - ${name}`, '<p>查無詳細資料。</p>');
                return;
            }

            let html = `<p style="margin-bottom:15px">與 <strong>${name}</strong> 相關的諾貝爾合作論文：</p>`;
            html += '<div class="data-table-wrap"><table><tr><th>領域</th><th>諾貝爾得主</th><th>台灣作者</th><th>論文 ID</th></tr>';
            details.forEach(d => {
                html += `<tr>
                    <td><span class="tag-category">${d.categories}</span></td>
                    <td>${d.nobel_last_name}</td>
                    <td>${d.tw_surname} ${d.tw_given_name}</td>
                    <td><a href="https://www.scopus.com/record/display.uri?eid=2-s2.0-${d.paper_id}" target="_blank" class="scopus-link">${d.paper_id}</a></td>
                </tr>`;
            });
            html += '</table></div>';
            ui.openModal(`合作論文詳情 - ${name}`, html);
        } catch (e) {
            ui.openModal('錯誤', `<p>無法載入詳情: ${e.message}</p>`);
        }
    },

    // ── Chart.js 水平長條圖 ──────────────────────────────────
    drawChart: (id, labels, values, color) => {
        const ctx = document.getElementById(id);
        if (!ctx) return;
        nobelCharts.push(new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels.map(l => l.length > 28 ? l.substring(0, 28) + '…' : l),
                datasets: [{
                    data: values,
                    backgroundColor: color,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#8b949e' }, grid: { color: '#30363d' } },
                    y: { ticks: { color: '#e6edf3', font: { size: 11 } }, grid: { color: '#21262d' } }
                }
            }
        }));
    }
};
