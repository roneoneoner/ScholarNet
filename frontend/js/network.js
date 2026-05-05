/* ============================================================
   network.js — 深度互動式學術合作網絡圖 (Vis.js) + 數據表格
   優化：修正步數過濾邏輯，實現「只顯示」特定層級之功能，新增排序功能
============================================================ */

let networkInstance = null;
let clusterAnalysisData = null; 
let currentFilteredAuthors = []; 
let sortState = { column: null, direction: 1 }; 

const network = {

    analyzeCentrality: async () => {
        const clusterSelect = document.getElementById('clusterSelect');
        const netStatusDiv = document.getElementById('net-status');
        const netContainer = document.getElementById('net-container');
        const netTableResDiv = document.getElementById('net-table-res');
        
        netStatusDiv.textContent = '搜尋作者中...';
        try {
            const params = {
                author_id: document.getElementById('netSearchAuthorId').value.trim(),
                rsNo: document.getElementById('netSearchRsNo').value.trim(),
                name_chinese: document.getElementById('netSearchNameCh').value.trim(),
                name_english: document.getElementById('netSearchNameEn').value.trim(),
                organization: document.getElementById('netSearchC302Org').value.trim(),
                title: document.getElementById('netSearchC302Title').value.trim(),
                surname: document.getElementById('netSearchSurname').value.trim(),
                given_name: document.getElementById('netSearchGivenName').value.trim(),
                affiliation: document.getElementById('netSearchAff').value.trim(),
                city: document.getElementById('netSearchCity').value.trim(),
                country: document.getElementById('netSearchCountry').value.trim(),
                h_index: document.getElementById('netSearchHIndex').value.trim(),
                doc_count_min: document.getElementById('netSearchDocCount').value.trim(),
                cite_count_min: document.getElementById('netSearchCiteCount').value.trim(),
                non_nstc_area: document.getElementById('netSearchNonNstcArea').value.trim(),
                grant_category: document.getElementById('netSearchGrantCat').value.trim(),
                discipline_code: document.getElementById('netSearchDiscCode').value.trim(),
                plan_name: document.getElementById('netSearchPlanName').value.trim(),
                pub_start: document.getElementById('netSearchPubStart').value.trim(),
                pub_end: document.getElementById('netSearchPubEnd').value.trim(),
                pub_name: document.getElementById('netSearchPubName').value.trim(),
                is_ieee: document.getElementById('netSearchIsIeee').checked ? true : null,
                is_top2: document.getElementById('netSearchIsTop2').checked ? true : null,
                limit: 1000
            };

            const authors = await api.getAuthorList(params);
            if (!authors || authors.length === 0) {
                netStatusDiv.textContent = '查無符合條件之作者';
                return;
            }
            
            const authorIds = authors.map(a => a.author_id);
            netStatusDiv.textContent = `找到 ${authorIds.length} 位作者，正在分析合作網絡...`;
            await network.performAnalysis(authorIds, clusterSelect, netStatusDiv, netContainer, netTableResDiv);
        } catch (e) { network.handleError(e, '分析失敗', netStatusDiv); }
    },

    performAnalysis: async (authorIds, clusterSelect, netStatusDiv, netContainer, netTableResDiv) => {
        try {
            // 如果只有一位作者，則以該作者為核心進行 1-step 分析
            const response = await api.getClusterCentrality(authorIds, authorIds.length === 1 ? authorIds[0] : null, 1);
            clusterAnalysisData = response;
            
            if (!response.clusters || response.clusters.length === 0) {
                netStatusDiv.textContent = '查無網絡數據';
                return;
            }

            // 預設顯示第一個群體
            network.renderCentralityAnalysis(response.clusters[0], netContainer, netTableResDiv);
            netStatusDiv.textContent = response.message || '分析完成';

            // 更新群體選擇器
            if (clusterSelect) {
                clusterSelect.innerHTML = response.clusters.map(c => `<option value="${c.cluster_id}">群體 ${c.cluster_id} (${c.author_count} 位)</option>`).join('');
                clusterSelect.disabled = false;
            }
        } catch (e) { network.handleError(e, '分析失敗', netStatusDiv); }
    },

    handleClusterSelection: (e) => {
        const clusterId = e.target.value;
        if (!clusterId || !clusterAnalysisData) return;
        const cluster = clusterAnalysisData.clusters.find(c => c.cluster_id == clusterId);
        if (cluster) {
            const netContainer = document.getElementById('net-container');
            const netTableResDiv = document.getElementById('net-table-res');
            network.renderCentralityAnalysis(cluster, netContainer, netTableResDiv);
        }
    },

    clearFilters: () => {
        document.querySelectorAll('#panel-net .advanced-filter-card input').forEach(i => i.value = '');
        document.querySelectorAll('#panel-net .advanced-filter-card select').forEach(s => s.selectedIndex = 0);
        document.querySelectorAll('#panel-net .advanced-filter-card input[type="checkbox"]').forEach(c => c.checked = false);
    },

    analyzeCentralityForAuthor: async (authorId, container, attrData = null) => {
        let selectedFilters = {
            distance: new Set([0, 1]), 
            minCoCount: 1,
            grant_category: new Set(),
            discipline_code: new Set(),
            non_nstc_area: new Set()
        };

        let rawNetworkData = null;

        const renderView = (filterMeta) => {
            container.innerHTML = `
                <div class="network-profile-layout">
                    <div class="advanced-network-filters card">
                        <div class="filter-header-main">
                            <h3>🎯 核心作者合作網絡動態篩選</h3>
                            <p>設定篩選條件後點擊執行。點選步數按鈕可「只顯示」該層級之節點。</p>
                        </div>
                        
                        <div class="network-filter-grid">
                            <div class="net-filter-group full-width">
                                <label>👣 合作距離限制 (只顯示勾選的層級)</label>
                                <div class="filter-options-row">
                                    <button class="filter-opt-btn ${selectedFilters.distance.has(0) ? 'active' : ''}" onclick="network.toggleNetFilter('distance', 0, this)">0步 (本人)</button>
                                    <button class="filter-opt-btn ${selectedFilters.distance.has(1) ? 'active' : ''}" onclick="network.toggleNetFilter('distance', 1, this)">1步 (直接合作者)</button>
                                    <button class="filter-opt-btn ${selectedFilters.distance.has(2) ? 'active' : ''}" onclick="network.toggleNetFilter('distance', 2, this)">2步 (二度合作者)</button>
                                </div>
                            </div>

                            <div class="net-filter-group">
                                <label>🤝 與核心作者的合作次數 (至少 Y 次)</label>
                                <div class="filter-input-row">
                                    <input type="number" id="input-min-co" min="1" value="${selectedFilters.minCoCount}" style="width:80px">
                                    <span class="range-val">次以上</span>
                                </div>
                            </div>

                            ${renderAttrFilter('grant_category', '📋 合作作者(1步)：計畫補助類別', filterMeta.grant_categories)}
                            ${renderAttrFilter('discipline_code', '🧬 合作作者(1步)：計畫學門統計', filterMeta.disciplines)}
                            ${renderAttrFilter('non_nstc_area', '📊 合作作者(1步)：摘要領域統計', filterMeta.areas)}
                        </div>

                        <div class="net-filter-actions">
                            <button class="btn-secondary" onclick="network.resetNetFilters('${authorId}')">重置篩選</button>
                            <button class="btn-primary" id="btn-apply-net-filters">執行分析與繪圖 🔍</button>
                        </div>
                    </div>
                    <div id="prof-net-status" class="status-message"></div>
                    <div id="prof-net-container" class="network-graph-container" style="height:700px;"></div>
                    <div id="prof-net-table-res" class="result-section"></div>
                </div>
            `;
            document.getElementById('btn-apply-net-filters').onclick = () => {
                selectedFilters.minCoCount = parseInt(document.getElementById('input-min-co').value) || 1;
                applyFilters();
            };
        };

        const renderAttrFilter = (key, label, items) => {
            if (!items || items.length === 0) return '';
            const sortedItems = [...items].sort((a, b) => b.cnt - a.cnt);
            return `
                <div class="net-filter-group full-width">
                    <label>${label}</label>
                    <div class="filter-options-row wrap">
                        ${sortedItems.slice(0, 30).map(item => `
                            <button class="filter-tag-btn ${selectedFilters[key].has(item.label) ? 'active' : ''}" onclick="network.toggleNetFilter('${key}', '${item.label}', this)">
                                ${item.label} <span class="cnt">(${item.cnt})</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        };

        network.toggleNetFilter = (key, val, btn) => {
            if (selectedFilters[key].has(val)) { selectedFilters[key].delete(val); btn.classList.remove('active'); }
            else { selectedFilters[key].add(val); btn.classList.add('active'); }
        };

        network.resetNetFilters = (aid) => { network.analyzeCentralityForAuthor(aid, container, attrData); };

        const applyFilters = async () => {
            if (!rawNetworkData) return;
            const netStatusDiv = document.getElementById('prof-net-status');
            const netContainer = document.getElementById('prof-net-container');
            const netTableResDiv = document.getElementById('prof-net-table-res');

            if (selectedFilters.distance.has(2) && rawNetworkData.message.includes('1-step')) {
                netStatusDiv.textContent = '正在擴展二層網絡資料 (請稍候)...';
                try {
                    const response = await api.getClusterCentrality([], authorId, 2);
                    rawNetworkData = response; clusterAnalysisData = response;
                } catch (e) { netStatusDiv.textContent = '擴展失敗: ' + e.message; return; }
            }

            netStatusDiv.textContent = '計算過濾中...';
            let initialFiltered = [];
            const activeAttrFilters = selectedFilters.grant_category.size > 0 || selectedFilters.discipline_code.size > 0 || selectedFilters.non_nstc_area.size > 0;

            rawNetworkData.clusters[0].authors.forEach(author => {
                if (!selectedFilters.distance.has(author.distance)) return;
                if (author.distance === 0) {
                    initialFiltered.push(author);
                } else if (author.distance === 1) {
                    if (activeAttrFilters) {
                        let match = false;
                        if (author.grant_categories.some(g => selectedFilters.grant_category.has(g))) match = true;
                        if (!match && author.disciplines.some(d => selectedFilters.discipline_code.has(d))) match = true;
                        if (!match && author.areas.some(a => selectedFilters.non_nstc_area.has(a))) match = true;
                        if (!match) return;
                    }
                    initialFiltered.push(author);
                } else if (author.distance === 2) {
                    initialFiltered.push(author);
                }
            });

            let tempEdges = rawNetworkData.graph_edges.filter(e => {
                const hasS = initialFiltered.some(a => a.author_id === e.from);
                const hasT = initialFiltered.some(a => a.author_id === e.to);
                if (!hasS || !hasT) return false;
                if (e.from === authorId || e.to === authorId) { if (e.weight < selectedFilters.minCoCount) return false; }
                return true;
            });

            const connectedIds = new Set([authorId]);
            let expanded = true;
            while (expanded) {
                expanded = false;
                tempEdges.forEach(e => {
                    if (connectedIds.has(e.from) && !connectedIds.has(e.to)) { connectedIds.add(e.to); expanded = true; }
                    else if (connectedIds.has(e.to) && !connectedIds.has(e.from)) { connectedIds.add(e.from); expanded = true; }
                });
            }

            const filteredAuthors = initialFiltered.filter(a => connectedIds.has(a.author_id));
            const filteredEdges = tempEdges.filter(e => connectedIds.has(e.from) && connectedIds.has(e.to));

            network.renderCentralityAnalysis({ cluster_id: 'Filtered', authors: filteredAuthors }, netContainer, netTableResDiv, filteredEdges);
            netStatusDiv.textContent = `連通圖過濾完成：顯示 ${filteredAuthors.length} 位作者，${filteredEdges.length} 條連線。`;
        };

        try {
            const response = await api.getClusterCentrality([], authorId, 1);
            rawNetworkData = response; clusterAnalysisData = response;
            renderView(response.filter_metadata);
            const netContainer = document.getElementById('prof-net-container');
            if (netContainer) {
                netContainer.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text-secondary); background:rgba(0,0,0,0.02); border-radius:8px;">
                    <p style="font-size:16px; font-weight:600;">網絡數據已備妥</p>
                    <p style="font-size:14px;">請調整步數與篩選條件後，點擊「執行分析與繪圖」開始運算。</p>
                </div>`;
            }
        } catch (e) { container.innerHTML = `<div class="status-msg error">⚠ 失敗: ${e.message}</div>`; }
    },

    renderCentralityAnalysis: (clusterData, netContainer, netTableResDiv, customEdges = null) => {
        currentFilteredAuthors = clusterData.authors;
        const nodes = []; const edges = [];
        const filteredIds = currentFilteredAuthors.map(a => a.author_id);
        currentFilteredAuthors.forEach(author => {
            const c = author.centrality;
            const size = Math.max(0, Math.min(1, c.betweenness || 0)) * 60 + 12;
            nodes.push({ id: author.author_id, label: `${author.name}\n(${author.author_id})`, group: author.affiliation, value: size, distance: author.distance });
        });
        const edgesToUse = customEdges || (clusterAnalysisData ? clusterAnalysisData.graph_edges : []);
        edgesToUse.forEach(e => {
            if (filteredIds.includes(e.from) && filteredIds.includes(e.to)) {
                edges.push({ from: e.from, to: e.to, width: Math.sqrt(e.weight) * 2, color: { color: 'rgba(88, 166, 255, 0.7)' } });
            }
        });
        if (networkInstance) networkInstance.destroy();
        networkInstance = new vis.Network(netContainer, { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) }, {
            nodes: { shape: 'dot', font: { size: 12 } },
            physics: { enabled: true, solver: 'forceAtlas2Based', forceAtlas2Based: { gravitationalConstant: -100 } },
            interaction: { hover: true, tooltipDelay: 200 }
        });
        networkInstance.on("selectNode", params => network.highlightTableRow(params.nodes[0]));
        network.renderTable(currentFilteredAuthors, clusterData.cluster_id, netTableResDiv);
    },

    renderTable: (authors, clusterId, netTableResDiv) => {
        let html = `<h4>群體 ${clusterId} (${authors.length} 位) 指標</h4><div class="data-table-wrap"><table><thead><tr>
            <th onclick="network.sortTable('author_id', this)" style="cursor:pointer">ID ↕</th>
            <th onclick="network.sortTable('name', this)" style="cursor:pointer">姓名 ↕</th>
            <th onclick="network.sortTable('distance', this)" style="cursor:pointer">距離 ↕</th>
            <th onclick="network.sortTable('co_count', this)" style="cursor:pointer">合作次數 ↕</th>
            <th onclick="network.sortTable('country', this)" style="cursor:pointer">國家 ↕</th>
            <th onclick="network.sortTable('affiliation', this)" style="cursor:pointer; width:15%">機構 ↕</th>
            <th onclick="network.sortTable('h_index', this)" style="cursor:pointer">H ↕</th>
            <th onclick="network.sortTable('degree', this)" style="cursor:pointer">度 ↕</th>
            <th onclick="network.sortTable('closeness', this)" style="cursor:pointer">親近 ↕</th>
            <th onclick="network.sortTable('betweenness', this)" style="cursor:pointer">介數 ↕</th>
        </tr></thead><tbody>`;
        authors.forEach(a => {
            const c = a.centrality;
            html += `<tr id="row-${a.author_id}" onclick="network.selectNodeFromTable('${a.author_id}')" style="cursor:pointer">
                <td><a href="https://www.scopus.com/authid/detail.uri?authorId=${a.author_id}" target="_blank" class="scopus-link" onclick="event.stopPropagation()">${a.author_id} 🔗</a></td>
                <td><strong class="clickable-name" onclick="event.stopPropagation(); window.open('index.html?authorId=${a.author_id}', '_blank')">${a.name}</strong></td>
                <td style="text-align:center">${a.distance === 0 ? '核心' : a.distance + ' 步'}</td>
                <td style="text-align:center; font-weight:700; color:var(--accent-primary)">${a.co_count}</td>
                <td>${a.country || '—'}</td>
                <td title="${a.affiliation}"><span style="font-size:11px">${a.affiliation}</span></td>
                <td style="text-align:center">${a.h_index}</td>
                <td>${(c.degree||0).toFixed(4)}</td>
                <td>${(c.closeness||0).toFixed(4)}</td>
                <td>${(c.betweenness||0).toFixed(4)}</td>
            </tr>`;
        });
        html += '</tbody></table></div>';
        netTableResDiv.innerHTML = html;
    },

    sortTable: (col, thElement) => {
        if (sortState.column === col) {
            sortState.direction *= -1;
        } else {
            sortState.column = col;
            sortState.direction = -1; // 預設降序 (大的在前)
        }

        currentFilteredAuthors.sort((a, b) => {
            let vA, vB;
            // 處理中心性指標 (位於 centrality 物件內)
            if (['degree', 'closeness', 'betweenness'].includes(col)) {
                vA = a.centrality[col] || 0; vB = b.centrality[col] || 0;
            } 
            // 處理數值欄位
            else if (['distance', 'co_count', 'h_index'].includes(col)) {
                vA = (a[col] === '—' ? -1 : parseFloat(a[col]));
                vB = (b[col] === '—' ? -1 : parseFloat(b[col]));
            }
            // 處理字串欄位
            else {
                vA = (a[col] || '').toString().toLowerCase();
                vB = (b[col] || '').toString().toLowerCase();
            }

            if (vA < vB) return -1 * sortState.direction;
            if (vA > vB) return 1 * sortState.direction;
            return 0;
        });

        // 重新渲染表格
        const netTableResDiv = document.getElementById('prof-net-table-res') || document.getElementById('net-table-res');
        network.renderTable(currentFilteredAuthors, 'Filtered', netTableResDiv);

        // 更新表頭視覺 (加入箭頭，這部分在 renderTable 重新產生時會被覆蓋，所以我們直接在標題加標記即可)
    },

    highlightTableRow: id => {
        document.querySelectorAll('tr').forEach(tr => tr.classList.remove('highlight-row'));
        const row = document.getElementById(`row-${id}`);
        if (row) { row.classList.add('highlight-row'); row.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    },

    selectNodeFromTable: id => { if (networkInstance) { networkInstance.selectNodes([id]); network.highlightTableRow(id); } },
    handleError: (e, msg, div) => { if (div) { div.textContent = `錯誤: ${msg}`; div.style.color = 'red'; } },
    init: () => { const sel = document.getElementById('clusterSelect'); if (sel) sel.addEventListener('change', network.handleClusterSelection); }
};

window.addEventListener('DOMContentLoaded', () => network.init());
window.network = network;
