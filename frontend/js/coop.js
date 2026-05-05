let charts = [];
const coop = {
    // 狀態管理：儲存當前的篩選條件
    state: {
        type: 'country',
        p: '',
        limit: 20,
        selectedCountries: [],
        selectedAffs: []
    },

    onTypeChange: () => {
        const t = document.getElementById('coopType').value;
        const p = document.getElementById('p');
        if (t === 'country') p.placeholder = '主體國家 (必填)';
        else if (t === 'affiliation') p.placeholder = '主體機構 (必填)';
        else p.placeholder = '主體作者 ID (必填)';
    },

    // 重新初始化並執行第一層分析 (國家)
    fetchAndRender: async () => {
        coop.state.type = document.getElementById('coopType').value;
        coop.state.p = document.getElementById('p').value.trim();
        coop.state.limit = document.getElementById('coopLimit').value;
        coop.state.selectedCountries = [];
        coop.state.selectedAffs = [];

        if (!coop.state.p) return alert('請填寫主體名稱或 ID！');

        const container = document.getElementById('coop-dash');
        container.innerHTML = '';
        coop.renderFilterBar(container);
        await coop.fetchStep(1);
    },

    fetchAndRenderForAuthor: async (authorId, container) => {
        coop.state.type = 'author';
        coop.state.p = authorId;
        coop.state.limit = 20;
        coop.state.selectedCountries = [];
        coop.state.selectedAffs = [];
        
        container.innerHTML = '';
        coop.renderFilterBar(container);
        await coop.fetchStep(1);
    },

    // 階層式抓取數據
    fetchStep: async (step) => {
        const container = document.getElementById('coop-dash');
        const { type, p, limit, selectedCountries, selectedAffs } = coop.state;
        
        // 清除舊有的後續步驟區塊
        const existingSteps = container.querySelectorAll(`.step-block`);
        existingSteps.forEach(el => {
            if (parseInt(el.dataset.step) >= step) el.remove();
        });

        const stepDiv = document.createElement('div');
        stepDiv.className = `step-block step-${step}`;
        stepDiv.dataset.step = step;
        stepDiv.innerHTML = '<div class="status-msg">正在運算數據，請稍候...</div>';
        container.appendChild(stepDiv);

        try {
            // 根據層級準備參數
            const countryFilter = selectedCountries.join(',');
            const affFilter = selectedAffs.join(',');
            
            let target = '';
            let title = '';
            let labelKey = 'entity_name';
            let isAuthor = false;

            if (step === 1) {
                target = 'countries';
                title = '🌍 第一層：合作國家統計';
            } else if (step === 2) {
                target = 'affiliations';
                title = `🏛 第二層：合作機構統計 (已篩選國家: ${selectedCountries.join(', ')})`;
            } else if (step === 3) {
                target = 'authors';
                title = `👤 第三層：合作作者統計 (已篩選機構: ${selectedAffs.join(', ')})`;
                labelKey = 'author_id';
                isAuthor = true;
            }

            const data = await api.getCoop(type, target, p, countryFilter || null, affFilter || null, null, limit);
            stepDiv.innerHTML = '';
            coop.renderBlock(stepDiv, title, data, labelKey, isAuthor, step);
            
            // 滾動到新生成的區塊
            stepDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (e) { 
            stepDiv.innerHTML = `<div class="status-msg">⚠ 運算失敗: ${e.message}</div>`; 
        }
    },

    // 渲染篩選控制列
    renderFilterBar: (container) => {
        const bar = document.createElement('div');
        bar.id = 'coop-filter-bar';
        bar.className = 'filter-bar';
        bar.style = 'margin-bottom: 20px; padding: 10px; background: var(--bg-hover); border-radius: 8px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;';
        container.appendChild(bar);
        coop.updateFilterBar();
    },

    updateFilterBar: () => {
        const bar = document.getElementById('coop-filter-bar');
        if (!bar) return;
        
        let html = `<strong>當前路徑：</strong> <span class="tag">${coop.state.p}</span>`;
        if (coop.state.selectedCountries.length > 0) {
            coop.state.selectedCountries.forEach(c => {
                html += ` <span class="tag accent">📍 ${c} <span class="close" onclick="coop.removeFilter('country', '${c}')">&times;</span></span>`;
            });
        }
        if (coop.state.selectedAffs.length > 0) {
            coop.state.selectedAffs.forEach(a => {
                html += ` <span class="tag secondary">🏢 ${a} <span class="close" onclick="coop.removeFilter('aff', '${a}')">&times;</span></span>`;
            });
        }
        
        if (coop.state.selectedCountries.length > 0 || coop.state.selectedAffs.length > 0) {
            html += ` <button class="btn-sm" style="margin-left:auto" onclick="coop.fetchAndRender()">🔄 重設全部</button>`;
        }
        bar.innerHTML = html;
    },

    removeFilter: (filterType, value) => {
        if (filterType === 'country') {
            coop.state.selectedCountries = coop.state.selectedCountries.filter(v => v !== value);
            if (coop.state.selectedCountries.length === 0) coop.state.selectedAffs = [];
            coop.fetchStep(coop.state.selectedCountries.length > 0 ? 2 : 1);
        } else {
            coop.state.selectedAffs = coop.state.selectedAffs.filter(v => v !== value);
            coop.fetchStep(3);
        }
        coop.updateFilterBar();
    },

    renderBlock: (container, title, data, labelKey, isAuthor, step) => {
        if(!data.length) {
            container.innerHTML = `<div class="card"><h4 style="color:var(--accent)">${title}</h4><p>查與對應合作紀錄。</p></div>`;
            return;
        }
        const id = 'chart_' + Math.random().toString(36).substr(2, 9);
        const fileName = `${title.replace(/\s/g, '_')}.csv`;
        
        let tableHTML = `<table><tr><th>排名</th><th>${isAuthor?'作者 ID':'實體名稱'}</th>${isAuthor?'<th>姓名</th>':''}<th>共著數</th><th>Scopus 論文</th></tr>`;
        data.forEach((d, i) => {
            const scopusIds = d.scopus_ids.split(',');
            const firstId = scopusIds[0];
            
            let scopusHtml = '';
            if (scopusIds.length <= 1) {
                scopusHtml = `<a href="https://www.scopus.com/record/display.uri?eid=2-s2.0-${firstId}" target="_blank" class="scopus-link">${firstId}</a>`;
            } else {
                const moreCount = scopusIds.length - 1;
                const otherIdsHtml = scopusIds.slice(1).map(id => 
                    `<a href="https://www.scopus.com/record/display.uri?eid=2-s2.0-${id}" target="_blank" class="scopus-link">${id}</a>`
                ).join(', ');
                
                scopusHtml = `
                    <div class="scopus-expandable">
                        <a href="https://www.scopus.com/record/display.uri?eid=2-s2.0-${firstId}" target="_blank" class="scopus-link">${firstId}</a>
                        <span class="expand-trigger" onclick="coop.toggleExpand(this, ${moreCount})">+${moreCount}</span>
                        <div class="expand-content">${otherIdsHtml}</div>
                    </div>
                `;
            }
            
            tableHTML += `<tr>
                <td>#${i+1}</td>
                <td class="${step < 3 ? 'clickable-text' : ''}" onclick="${step < 3 ? `coop.handleStepClick('${step}', '${d[labelKey]}')` : ''}">
                    ${isAuthor ? `<a href="https://www.scopus.com/authid/detail.uri?authorId=${d[labelKey]}" target="_blank" class="scopus-link-id">${d[labelKey]}</a>` : d[labelKey]}
                </td>
                ${isAuthor?`<td>${d.surname||''} ${d.given_name||''}</td>`:''}
                <td style="color:var(--accent); font-weight:bold" class="clickable" onclick="coop.showPapers('${d[labelKey]}', '${d.scopus_ids}')">${d.co_count}</td>
                <td class="scopus-list">${scopusHtml}</td>
            </tr>`;
        });
        tableHTML += '</table>';

        const block = document.createElement('div');
        block.className = 'dash-block';
        block.innerHTML = `
            <div style="flex:100%; display:flex; justify-content:space-between; align-items:center">
                <h3 style="color:var(--accent)">${title}</h3>
                <div style="display:flex; gap:10px">
                    ${step < 3 ? '<span style="font-size:12px; color:var(--text-muted); align-self:center">💡 點擊下方長條圖或名稱可進入下一層分析</span>' : ''}
                    <button class="export-btn" onclick='ui.exportToCSV("${fileName}", ${JSON.stringify(data.map(({scopus_ids, ...rest}) => rest))})'>📥 匯出 CSV</button>
                </div>
            </div>
            <div class="chart-container"><canvas id="${id}"></canvas></div>
            <div class="table-container">${tableHTML}</div>`;
        
        container.appendChild(block);
        setTimeout(() => coop.drawChart(id, data.map(d=>d[labelKey]), data.map(d=>d.co_count), step), 50);
    },

    handleStepClick: (currentStep, value) => {
        if (currentStep == 1) {
            if (!coop.state.selectedCountries.includes(value)) {
                coop.state.selectedCountries.push(value);
            }
            coop.updateFilterBar();
            coop.fetchStep(2);
        } else if (currentStep == 2) {
            if (!coop.state.selectedAffs.includes(value)) {
                coop.state.selectedAffs.push(value);
            }
            coop.updateFilterBar();
            coop.fetchStep(3);
        }
    },

    toggleExpand: (el, count) => {
        const content = el.nextElementSibling;
        const isExpanded = content.style.display === 'block';
        content.style.display = isExpanded ? 'none' : 'block';
        el.innerText = isExpanded ? `+${count}` : '−';
        el.classList.toggle('expanded', !isExpanded);
    },

    showPapers: (name, ids) => {
        const idList = ids.split(',');
        let html = `<p style="margin-bottom:15px">主體 <strong>${name}</strong> 的共同發表論文 (共 ${idList.length} 篇)：</p>`;
        html += '<div class="data-table-wrap"><table><tr><th>序號</th><th>Scopus ID</th><th>操作</th></tr>';
        idList.forEach((id, i) => {
            html += `<tr><td>${i+1}</td><td class="mono">${id}</td>
                <td><a href="https://www.scopus.com/record/display.uri?eid=2-s2.0-${id}" target="_blank" class="btn-primary" style="padding:2px 8px; font-size:11px; text-decoration:none">查看論文</a></td></tr>`;
        });
        html += '</table></div>';
        ui.openModal(`合作論文詳情 - ${name}`, html);
    },

    drawChart: (id, labels, data, step) => {
        const ctx = document.getElementById(id).getContext('2d');
        const chart = new Chart(ctx, {
            type: 'bar', 
            data: { 
                labels: labels.map(l=>l.substring(0,25)), 
                datasets: [{ 
                    data, 
                    backgroundColor: step === 1 ? '#3182ce' : (step === 2 ? '#38a169' : '#d69e2e'), 
                    borderRadius: 4 
                }] 
            },
            options: { 
                indexAxis: 'y', 
                maintainAspectRatio: false, 
                plugins: { legend: { display: false } },
                onClick: (e, elements) => {
                    if (step < 3 && elements.length > 0) {
                        const index = elements[0].index;
                        const label = labels[index];
                        coop.handleStepClick(step, label);
                    }
                }
            }
        });
        charts.push(chart);
    }
};