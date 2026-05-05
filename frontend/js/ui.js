// --- START OF FILE /frontend/js/ui.js ---

const ui = {
    currentAuthorIds: [],

    // 完整的 initFilters 函式
    initFilters: async () => {
        try {
            const meta = await api.getMetaAll();
            const mapping = {
                "selectCountry": meta.countries, "selectNetCountry": meta.countries,
                "selectAff": meta.scopus_affs, "selectNetAff": meta.scopus_affs,
                "selectCity": meta.cities, "selectNetCity": meta.cities,
                "selectC302Org": meta.c302_orgs, "selectNetC302Org": meta.c302_orgs,
                "selectGrantCat": meta.grant_cats, "selectNetGrantCat": meta.grant_cats,
                "selectDiscCode": meta.disc_codes, "selectNetDiscCode": meta.disc_codes,
                "selectTop2Field": meta.top2_fields, "selectNetTop2Field": meta.top2_fields,
                "selectIeeeTitle": meta.ieee_titles, "selectNetIeeeTitle": meta.ieee_titles,
                "selectNonNstcArea": meta.non_nstc_areas, "selectNetNonNstcArea": meta.non_nstc_areas
            };
            for (const [selectId, list] of Object.entries(mapping)) {
                const sel = document.getElementById(selectId);
                if (!sel || !list) continue;
                sel.innerHTML = '<option value="">-- 快速選擇 --</option>';
                (list || []).forEach(val => {
                    if (val) {
                        const opt = document.createElement('option');
                        opt.value = val; opt.textContent = val; sel.appendChild(opt);
                    }
                });
            }
        } catch (e) { console.warn("無法載入篩選元數據", e); }
    },

    addFilterTag: (inputId, val) => {
        if (!val) return;
        const input = document.getElementById(inputId);
        let current = input.value.trim();
        const items = current ? current.split(',').map(i => i.trim()).filter(i => i !== '') : [];
        if (!items.includes(val)) { items.push(val); input.value = items.join(', '); }
    },

    searchByFilters: async () => {
        const params = {
            author_id: document.getElementById('searchAuthorId').value.trim(),
            rsNo: document.getElementById('searchRsNo').value.trim(),
            name_chinese: document.getElementById('searchNameCh').value.trim(),
            name_english: document.getElementById('searchNameEn').value.trim(),
            organization: document.getElementById('searchC302Org').value.trim(),
            title: document.getElementById('searchC302Title').value.trim(),
            surname: document.getElementById('searchSurname').value.trim(),
            given_name: document.getElementById('searchGivenName').value.trim(),
            affiliation: document.getElementById('searchAff').value.trim(),
            city: document.getElementById('searchCity').value.trim(),
            country: document.getElementById('searchCountry').value.trim(),
            h_index: document.getElementById('searchHIndex').value.trim(),
            doc_count_min: document.getElementById('searchDocCount').value.trim(),
            cite_count_min: document.getElementById('searchCiteCount').value.trim(),
            non_nstc_area: document.getElementById('searchNonNstcArea').value.trim(),
            grant_category: document.getElementById('searchGrantCat').value.trim(),
            discipline_code: document.getElementById('searchDiscCode').value.trim(),
            plan_name: document.getElementById('searchPlanName').value.trim(),
            pub_start: document.getElementById('searchPubStart').value.trim(),
            pub_end: document.getElementById('searchPubEnd').value.trim(),
            pub_name: document.getElementById('searchPubName').value.trim(),
            is_ieee: document.getElementById('searchIsIeee').checked ? true : null,
            is_top2: document.getElementById('searchIsTop2').checked ? true : null
        };
        const resDiv = document.getElementById('author-result');
        resDiv.innerHTML = '<div class="status-msg">搜尋中...</div>';
        try {
            const list = await api.getAuthorList(params);
            if (!list || list.length === 0) { resDiv.innerHTML = '<div class="status-msg">查無符合條件之作者資訊</div>'; return; }
            ui.currentAuthorIds = list.map(item => item.author_id);
            let html = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; background:var(--bg-hover); padding:10px 15px; border-radius:8px;">
                    <div class="result-meta" style="margin:0;"><h3 style="margin:0;">搜尋結果</h3><span class="count-pill">${list.length} 筆符合條件</span></div>
                    <button class="btn-export" onclick="ui.exportToImage('author-result', 'author_list')" style="margin:0;">📸 匯出此清單圖檔</button>
                </div>
            `;
            list.forEach(item => {
                const name = `${item.surname || ''} ${item.given_name || ''}`.trim();
                const aff = item.ip_doc_parent_preferred_name || '機構未提供';
                html += `<div class="card result-list-card">
                    <div class="result-list-main">
                        <h4>${name}</h4>
                        <p>${aff}</p>
                        <div class="result-list-stats">
                            <span>📄 論文數: ${item.document_count || 0}</span>
                            <span>💬 被引用: ${item.cited_by_count || 0}</span>
                            <span>📈 H-Index: ${item.h_index || 0}</span>
                        </div>
                    </div>
                    <button class="btn-secondary" onclick="document.getElementById('authorIdInfo').value='${item.author_id}'; ui.searchFullProfile()">🔍 檢視全方位資料</button>
                </div>`;
            });
            resDiv.innerHTML = html;
        } catch (e) { resDiv.innerHTML = `<div class="status-msg error">⚠ ${e.message}</div>`; }
    },

    clearFilters: () => {
        document.querySelectorAll('#panel-info .advanced-filter-card input').forEach(i => i.value = '');
        document.querySelectorAll('#panel-info .advanced-filter-card select').forEach(s => s.selectedIndex = 0);
    },

    searchFullProfile: async () => {
        const id = document.getElementById('authorIdInfo').value.trim();
        if (!id) return alert('請輸入作者 ID');
        const resDiv = document.getElementById('author-result');
        resDiv.innerHTML = '<div class="status-msg">正在載入全方位資料...</div>';
        try {
            const data = await api.getAuthorFull(id);
            resDiv.innerHTML = ui.renderFullProfile(data);
            ui.loadSection('plan_type', data.author_id);
        } catch (e) {
            resDiv.innerHTML = `<div class="status-msg error">⚠ 載入失敗: ${e.message}</div>`;
        }
    },

    // searchFull 是舊版函式名稱的別名，保留以防萬一
    searchFull: function () { return this.searchFullProfile(); },

    renderFullProfile: (data) => {
        const name = `${data.surname || ''} ${data.given_name || ''}`;
        const nameC = data.name_chinese ? `(${data.name_chinese})` : '';
        const aff = data.ip_doc_parent_preferred_name || data.organization_c302 || '—';
        const title = data.title_c302 || '研究員';
        const pubRange = (data.pub_start && data.pub_end) ? `${data.pub_start} – ${data.pub_end}` : 'N/A';
        
        let honorsHtml = '';
        if (data.top2_rank) {
            honorsHtml += `<div class="honor-badge top2" title="史丹佛大學全球前 2% 科學家">
                <span class="honor-icon">🏆</span> Top 2% Scientist
            </div>`;
        }
        if (data.ieee_year) {
            honorsHtml += `<div class="honor-badge ieee" title="IEEE Fellow">
                <span class="honor-icon">📜</span> IEEE Fellow '${data.ieee_year.toString().slice(-2)}
            </div>`;
        }

        return `
            <div class="full-profile-card" id="profile-card-container">
                <div class="profile-header-new">
                    <div class="profile-identity-section">
                        <div class="profile-name-row">
                            <h2>${name} <span class="chinese-name">${nameC}</span></h2>
                            <div class="honor-badges-row">${honorsHtml}</div>
                        </div>
                        
                        <div class="profile-affiliation-box">
                            <span class="prof-icon">🎓</span>
                            <span class="prof-text"><strong>${title}</strong> @ ${aff}</span>
                        </div>

                        <div class="profile-action-row">
                            <a href="${data.scopus_link || '#'}" target="_blank" class="action-btn scopus">
                                🔗 Scopus Profile
                            </a>
                            <button class="action-btn export" onclick="ui.exportToImage('profile-card-container', 'author_profile_${data.author_id}')">
                                📸 匯出圖檔
                            </button>
                        </div>
                    </div>

                    <div class="profile-stats-section">
                        <div class="mini-stats-grid">
                            <div class="m-stat">
                                <span class="m-label">H-INDEX</span>
                                <span class="m-value">${data.h_index || 0}</span>
                            </div>
                            <div class="m-stat">
                                <span class="m-label">論文數</span>
                                <span class="m-value">${data.document_count || 0}</span>
                            </div>
                            <div class="m-stat">
                                <span class="m-label">引用數</span>
                                <span class="m-value">${data.cited_by_count || 0}</span>
                            </div>
                            <div class="m-stat wide">
                                <span class="m-label">NSTC ID (rsNo)</span>
                                <span class="m-value rsno">
                                    ${data.rsNo ? `<a href="https://arspb.nstc.gov.tw/NSCWebFront/modules/talentSearch/talentSearch.do?action=initBasic&rsNo=${data.rsNo}&LANG=chi" target="_blank">${data.rsNo}</a>` : 'N/A'}
                                </span>
                            </div>
                            <div class="m-stat wide">
                                <span class="m-label">PUBLICATION RANGE</span>
                                <span class="m-value">${pubRange}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="profile-tabs">
                    <button class="tab-btn active" onclick="ui.switchProfileTab('plan_type', '${data.author_id}', this)">計畫類別統計</button>
                    <button class="tab-btn" onclick="ui.switchProfileTab('plan_disc', '${data.author_id}', this)">計畫學門統計</button>
                    <button class="tab-btn" onclick="ui.switchProfileTab('coop', '${data.author_id}', this)">合作作者</button>                    
                    <button class="tab-btn" onclick="ui.switchProfileTab('fields', '${data.author_id}', this)">摘要領域</button>
                    <button class="tab-btn" onclick="ui.switchProfileTab('papers', '${data.author_id}', this)">論文列表</button>
                    <button class="tab-btn btn-special" onclick="ui.switchProfileTab('profile_coop_dash', '${data.author_id}', this)">🤝 合作儀表板</button>
                    <button class="tab-btn btn-special" onclick="ui.switchProfileTab('profile_net', '${data.author_id}', this)">🌐 網路中心性</button>
                    <button class="tab-btn btn-special" onclick="ui.switchProfileTab('profile_nobel', '${data.author_id}', this)">🏅 諾貝爾獎</button>
                    <button class="tab-btn btn-special" onclick="ui.switchProfileTab('profile_raw', '${data.author_id}', this)">📄 數據全覽</button>
                </div>
                <div id="profile-content" class="profile-content-area"></div>
            </div>`;
    },

    switchProfileTab: (type, authorId, btn) => {
        document.querySelectorAll('.profile-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        ui.loadSection(type, authorId);
    },

    loadSection: async (type, authorId) => {
        const contentDiv = document.getElementById('profile-content');
        if (!contentDiv) return;
        contentDiv.innerHTML = '<div class="status-msg">載入中...</div>';
        try {
            switch (type) {
                case 'plan_type':
                    const dataPT = await api.getAuthorFull(authorId);
                    contentDiv.innerHTML = ui.renderSimpleBarStats('國科會計畫 - 補助類別分佈', dataPT.plan_type_stats);
                    break;
                case 'plan_disc':
                    const dataPD = await api.getAuthorFull(authorId);
                    contentDiv.innerHTML = ui.renderSimpleBarStats('國科會計畫 - 學門代碼分佈', dataPD.plan_discipline_stats);
                    break;
                case 'papers':
                    const papers = await api.getAuthorPapers(authorId);
                    contentDiv.innerHTML = ui.renderPapers(papers);
                    break;
                case 'coop':
                    const [coAuthors, coAffs, coCountries] = await Promise.all([
                        api.getCoop('author', 'authors', authorId, null, null, null, 10),
                        api.getCoop('author', 'affiliations', authorId, null, null, null, 10),
                        api.getCoop('author', 'countries', authorId, null, null, null, 10)
                    ]);
                    contentDiv.innerHTML = ui.renderCoop(coAuthors, coAffs, coCountries);
                    break;
                case 'fields':
                    const dataF = await api.getAuthorFull(authorId);
                    contentDiv.innerHTML = ui.renderFieldStats(dataF.non_nstc_fields);
                    break;
                case 'profile_coop_dash':
                    await coop.fetchAndRenderForAuthor(authorId, contentDiv);
                    break;
                case 'profile_net':
                    const fullDataNet = await api.getAuthorFull(authorId);
                    await network.analyzeCentralityForAuthor(authorId, contentDiv, fullDataNet);
                    break;
                case 'profile_nobel':
                    await nobel.fetchAndRenderForAuthor(authorId, contentDiv);
                    break;
                case 'profile_raw':
                    await ui.renderRawData(authorId, contentDiv);
                    break;
            }
        } catch (e) {
            contentDiv.innerHTML = `<div class="status-msg error">⚠ 載入區塊失敗: ${e.message}</div>`;
        }
    },

    // 通用的「血條」呈現渲染函數
    renderSimpleBarStats: (title, items) => {
        if (!items || items.length === 0) return `<h4>${title}</h4><p class="text-muted">目前尚無相關數據</p>`;
        const maxVal = Math.max(...items.map(i => i.cnt));
        const content = items.map(item => {
            const pct = maxVal > 0 ? (item.cnt / maxVal * 100).toFixed(1) : 0;
            return `
                <div class="area-bar-group">
                    <div class="area-label" title="${item.label}">${item.label}</div>
                    <div class="area-bar-row">
                        <div class="area-bar-container">
                            <div class="area-bar-fill" style="width:${pct}%;"></div>
                        </div>
                        <div class="area-count">${item.cnt} 筆</div>
                    </div>
                </div>`;
        }).join('');
        return `<h4>${title}</h4><div class="area-stats-grid">${content}</div>`;
    },

    renderPapers: (papers) => {
        if (!papers || papers.length === 0) return '<p class="text-muted">查無論文資料 (或未與 SJR 及來源資料表匹配)</p>';
        
        window._currentPapers = papers;
        
        const renderRows = (data) => {
            return data.map(p => `
                <tr>
                    <td style="font-family:monospace;">
                        <a href="https://www.scopus.com/pages/publications/${p.scopus_id}" target="_blank" style="color:var(--accent-primary); text-decoration:underline;">${p.scopus_id}</a>
                    </td>
                    <td style="text-align:center; font-weight:600; color:var(--accent-primary);">${p.citedby_count_SJR || 0}</td>
                    <td style="text-align:center;">${p.SJR_Best_Quartile || ''}</td>
                    <td>${p.aggregation_type || ''}</td>
                    <td>${p.cover_date || ''}</td>
                    <td style="text-align:center;">${p.citation_count || 0}</td>
                    <td>${p.subtype_description || ''}</td>
                    <td><div class="text-wrap">${p.publicationName_Source || ''}</div></td>
                </tr>`).join('');
        };

        window.sortPapers = (key, btn) => {
            const isAsc = btn.classList.contains('asc');
            const th = btn;
            th.closest('tr').querySelectorAll('.sort-th').forEach(b => b.classList.remove('asc', 'desc'));
            th.classList.add(isAsc ? 'desc' : 'asc');

            const sorted = [...window._currentPapers].sort((a, b) => {
                let valA = a[key];
                let valB = b[key];
                
                if (['citedby_count_SJR', 'citation_count', 'scopus_id'].includes(key)) {
                    return isAsc ? (Number(valA || 0) - Number(valB || 0)) : (Number(valB || 0) - Number(valA || 0));
                }
                valA = (valA || '').toString().toLowerCase();
                valB = (valB || '').toString().toLowerCase();
                return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            });
            document.getElementById('papers-tbody').innerHTML = renderRows(sorted);
        };

        return `
            <div class="table-header-flex" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <h4>論文列表 (共 ${papers.length} 篇)</h4>
                <div class="text-muted" style="font-size:12px;">💡 點擊欄位名稱排序</div>
            </div>
            <div class="data-table-wrap" style="overflow-x: auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th class="sort-th" onclick="sortPapers('scopus_id', this)" style="cursor:pointer;">scopus_id <span class="sort-icon"></span></th>
                            <th class="sort-th" onclick="sortPapers('citedby_count_SJR', this)" style="cursor:pointer; text-align:center;">citedby_count <span class="sort-icon"></span></th>
                            <th class="sort-th" onclick="sortPapers('SJR_Best_Quartile', this)" style="cursor:pointer; text-align:center;">SJR_Best_Quartile <span class="sort-icon"></span></th>
                            <th class="sort-th" onclick="sortPapers('aggregation_type', this)" style="cursor:pointer;">aggregation_type <span class="sort-icon"></span></th>
                            <th class="sort-th" onclick="sortPapers('cover_date', this)" style="cursor:pointer;">cover_date <span class="sort-icon"></span></th>
                            <th class="sort-th" onclick="sortPapers('citation_count', this)" style="cursor:pointer; text-align:center;">citation_count <span class="sort-icon"></span></th>
                            <th class="sort-th" onclick="sortPapers('subtype_description', this)" style="cursor:pointer;">subtype_description <span class="sort-icon"></span></th>
                            <th class="sort-th" onclick="sortPapers('publicationName_Source', this)" style="cursor:pointer;">publicationName_Source <span class="sort-icon"></span></th>
                        </tr>
                    </thead>
                    <tbody id="papers-tbody">${renderRows(papers)}</tbody>
                </table>
            </div>`;
    },

    renderCoop: (authors, affs, countries) => {
        const renderCoopTable = (title, data, nameKey, isAuthorTable = false) => {
            let rows = data.map((d, i) => {
                let actionBtns = '';
                if (isAuthorTable && d.author_id) {
                    actionBtns = `
                        <div class="coop-actions">
                            <button class="btn-sm" title="查看個人頁面" onclick="document.getElementById('authorIdInfo').value='${d.author_id}'; ui.searchFullProfile()">👤</button>
                            <a class="btn-sm-link" title="Scopus" href="https://www.scopus.com/authid/detail.uri?authorId=${d.author_id}" target="_blank">🔗</a>
                        </div>
                    `;
                }
                return `
                <tr>
                    <td>#${i + 1}</td>
                    <td>${d[nameKey]}</td>
                    <td style="text-align:center;">${d.co_count}</td>
                    ${isAuthorTable ? `<td>${actionBtns}</td>` : ''}
                </tr>`;
            }).join('');
            
            if (data.length === 0) rows = `<tr><td colspan="${isAuthorTable ? 4 : 3}" style="text-align:center;">無資料</td></tr>`;
            
            return `
                <div class="info-group">
                    <h4>${title}</h4>
                    <div class="data-table-wrap" style="max-height:350px;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>排名</th>
                                    <th>名稱</th>
                                    <th>合作篇數</th>
                                    ${isAuthorTable ? '<th>操作</th>' : ''}
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>`;
        };
        return `
            <div class="coop-grid">
                ${renderCoopTable('Top 10 合作作者', authors.map(a => ({ ...a, name: `${a.surname} ${a.given_name}` })), 'name', true)}
                ${renderCoopTable('Top 10 合作機構', affs, 'entity_name')}
                ${renderCoopTable('Top 10 合作國家', countries, 'entity_name')}
            </div>`;
    },

    renderFieldStats: (fields) => {
        if (!fields || fields.length === 0) return '<p class="text-muted">無領域分析資料</p>';
        const total = fields.reduce((sum, f) => sum + f.cnt, 0);
        const content = fields.map(f => {
            const pct = total > 0 ? (f.cnt / total * 100).toFixed(1) : 0;
            return `
                <div class="area-bar-group">
                    <div class="area-label" title="${f.label}">${f.label}</div>
                    <div class="area-bar-row">
                        <div class="area-bar-container">
                            <div class="area-bar-fill" style="width:${pct}%;"></div>
                        </div>
                        <div class="area-count">${f.cnt} (${pct}%)</div>
                    </div>
                </div>`;
        }).join('');
        return `<h4>研究領域分析 (基於論文摘要 Top 5% 關鍵詞)</h4><div class="area-stats-grid">${content}</div>`;
    },

    // (接續在 ui.js 原有的 renderFieldStats 之後)

    searchRawData: async () => {
        const id = document.getElementById('rawAuthorId').value.trim();
        if (!id) return alert('請輸入作者 ID');
        const resDiv = document.getElementById('raw-data-res');
        await ui.renderRawData(id, resDiv);
    },

    renderRawData: async (id, container) => {
        container.innerHTML = '<div class="status-msg">正在載入並關聯所有資料表...</div>';

        try {
            const data = await api.get(`/author/${id}/raw`);

            let html = `<div class="raw-data-container">
                <h3 style="margin-bottom: 24px; color: var(--text-primary); border-left: 4px solid var(--accent-primary); padding-left: 12px;">
                    作者 ID: <span class="mono">${id}</span> 關聯數據全覽
                </h3>
            `;

            // 區塊 1: 基本資料 (Scopus)
            html += ui.renderRawSection('🌐 Scopus 基礎屬性 (data_author_name_aff_country, h_index, coredata, pub_range)', [
                { label: 'Surname', value: data.surname },
                { label: 'Given Name', value: data.given_name },
                { label: 'H-Index', value: data.h_index },
                { label: 'Document Count', value: data.document_count },
                { label: 'Cited-by Count', value: data.cited_by_count },
                { label: 'Publication Range', value: (data.pub_start || data.pub_end) ? `${data.pub_start} - ${data.pub_end}` : null },
                { label: 'Affiliation ID', value: data.affiliation_id },
                { label: 'Parent ID', value: data.parent },
                { label: 'Affiliation (Preferred)', value: data.ip_doc_parent_preferred_name },
                { label: 'Affiliation (Disp)', value: data.ip_doc_afdispname },
                { label: 'City', value: data.ip_doc_address_city },
                { label: 'Country', value: data.ip_doc_address_country }
            ]);

            // 區塊 2: 國科會 C302
            html += ui.renderRawSection('🇹🇼 國科會 C302 紀錄 (data_author_c302_Basic, author_id_rsNo)', [
                { label: 'NSTC rsNo', value: data.rsNo },
                { label: '中文姓名', value: data.name_chinese },
                { label: '英文姓名', value: data.name_english },
                { label: '所屬機構', value: data.c302_org },
                { label: '職稱', value: data.c302_title }
            ]);

            // 區塊 3: IEEE 紀錄
            html += ui.renderRawSection('🔌 IEEE 紀錄 (data_author_IEEE_author_id)', [
                { label: 'IEEE Year', value: data.ieee_year },
                { label: 'First Name', value: data.ieee_first },
                { label: 'Last Name', value: data.ieee_last },
                { label: 'English Name', value: data.ieee_en },
                { label: 'Chinese Name', value: data.ieee_cn },
                { label: 'Title', value: data.ieee_title },
                { label: 'Contribution', value: data.ieee_contrib },
                { label: 'Affiliation (En)', value: data.ieee_aff_e },
                { label: 'Affiliation (Cn)', value: data.ieee_aff_c }
            ]);

            // 區塊 4: Stanford Top 2%
            html += ui.renderRawSection('🏆 Stanford Top 2% 科學家 (data_author_top2_author_id)', [
                { label: 'Rank (ns)', value: data.top2_rank },
                { label: 'Main Field', value: data.top2_field },
                { label: 'Sub Field 1', value: data.top2_sub1 },
                { label: 'Sub Field 2', value: data.top2_sub2 },
                { label: 'Institution', value: data.top2_inst },
                { label: 'Country', value: data.top2_cntry },
                { label: 'First Year', value: data.top2_firstyr },
                { label: 'Last Year', value: data.top2_lastyr }
            ]);

            html += '</div>';

            // 區塊 4.5: 論文列表 (1對多)
            try {
                const papers = await api.getAuthorPapers(id);
                if (papers && papers.length > 0) {
                    html += `
                    <div class="raw-section" style="margin-top:20px;">
                        <div class="raw-section-title">📄 論文列表 (data_paper_type_cite_date, SJR_Best_Quartile) - 共 ${papers.length} 篇</div>
                        <div class="data-table-wrap" style="max-height: 400px; overflow-y: auto;">
                            <table class="data-table">
                                <thead><tr><th>期刊/會議</th><th>類型</th><th>引用數</th><th>SJR</th><th>合作人數</th></tr></thead>
                                <tbody>
                                    ${papers.map(p => `
                                    <tr>
                                        <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.journal || ''}">${p.journal || 'N/A'}</td>
                                        <td>${p.type || ''}</td>
                                        <td style="text-align:center;">${p.citations || 0}</td>
                                        <td>${p.sjr || ''}</td>
                                        <td style="text-align:center;">${p.coauthor_count || 1}</td>
                                    </tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>`;
                }
            } catch (e) {
                console.warn("Raw data: failed to fetch papers", e);
            }

            // 區塊 5: 非國科會摘要領域 (1對多)
            if (data.non_nstc_fields && data.non_nstc_fields.length > 0) {
                html += `
                <div class="raw-section" style="margin-top:20px;">
                    <div class="raw-section-title">📊 非國科會摘要領域 (data_author_non_nstc_field)</div>
                    <div class="data-table-wrap" style="max-height: 250px; overflow-y: auto;">
                        <table class="data-table">
                            <thead><tr><th>領域名稱 (non_nstc_area)</th><th>數量 (cnt)</th></tr></thead>
                            <tbody>
                                ${data.non_nstc_fields.map(f => `<tr><td>${f.non_nstc_area || 'N/A'}</td><td>${f.cnt}</td></tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>`;
            }

            // 區塊 6: 國科會計畫清單 (1對多)
            if (data.plans && data.plans.length > 0) {
                html += `
                <div class="raw-section" style="margin-top:20px;">
                    <div class="raw-section-title">📝 國科會計畫清單 (data_author_Plan_all) - 共 ${data.plans.length} 筆</div>
                    <div class="data-table-wrap" style="max-height: 400px; overflow-y: auto;">
                        <table class="data-table">
                            <thead><tr><th>年度</th><th>補助類別</th><th>學門代碼</th><th>計畫名稱</th><th>擔任工作</th><th>核定經費</th></tr></thead>
                            <tbody>
                                ${data.plans.map(p => `
                                <tr>
                                    <td>${p['年度'] || ''}</td>
                                    <td>${p['補助類別'] || ''}</td>
                                    <td>${p['學門代碼'] || ''}</td>
                                    <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p['計畫名稱'] || ''}">${p['計畫名稱'] || ''}</td>
                                    <td>${p['擔任工作'] || ''}</td>
                                    <td style="font-family: monospace;">${p['核定經費_新台幣'] ? '$' + parseInt(p['核定經費_新台幣']).toLocaleString() : ''}</td>
                                </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>`;
            }

            container.innerHTML = html;

        } catch (e) {
            container.innerHTML = `<div class="status-msg error">⚠ ${e.message}</div>`;
        }
    },

    // 輔助函數: 繪製 Raw Data 卡片區塊
    renderRawSection: (title, fields) => {
        // 過濾掉值為空或 null 的欄位
        let validFields = fields.filter(f => f.value !== null && f.value !== undefined && f.value !== '');

        if (validFields.length === 0) {
            return `
            <div class="raw-section">
                <div class="raw-section-title">${title}</div>
                <div style="padding: 16px; color: var(--text-muted); font-size: 13px;">此資料表中無該作者紀錄。</div>
            </div>`;
        }

        let html = `<div class="raw-section"><div class="raw-section-title">${title}</div><div class="raw-grid">`;
        validFields.forEach(f => {
            html += `
            <div class="raw-item">
                <span class="raw-label">${f.label}</span>
                <span class="raw-value">${f.value}</span>
            </div>`;
        });
        html += `</div></div>`;
        return html;
    },

    // 彈出視窗 (Modal) 相關函式 (保持不變)
    openModal: (title, content) => {
        document.getElementById('modal-title').innerHTML = title;
        document.getElementById('modal-body').innerHTML = content;
        document.getElementById('modal-overlay').style.display = 'flex';
    },

    closeModal: () => {
        document.getElementById('modal-overlay').style.display = 'none';
    },

    exportToImage: async (elementId, fileName) => {
        const element = document.getElementById(elementId);
        if (!element) return alert('找不到欲匯出的區塊');

        // 顯示載入提示
        const originalText = event.target.innerText;
        const btn = event.target;
        btn.innerText = '正在產生圖檔...';
        btn.disabled = true;

        try {
            const canvas = await html2canvas(element, {
                useCORS: true,
                backgroundColor: '#121821', // 使用系統背景色
                scale: 2, // 提高解析度
                logging: false,
                onclone: (clonedDoc) => {
                    // 在複製的 DOM 中隱藏按鈕列，避免按鈕出現在圖片中
                    const buttons = clonedDoc.querySelectorAll('button, .control-section');
                    buttons.forEach(b => b.style.display = 'none');

                    // 確保內容在圖片中是可見的
                    const panel = clonedDoc.getElementById(elementId);
                    if (panel) {
                        panel.style.display = 'block';
                        panel.style.padding = '20px';
                        panel.style.height = 'auto';
                    }
                }
            });

            const link = document.createElement('a');
            link.download = `${fileName}_${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) {
            console.error('匯出失敗:', e);
            alert('匯出圖檔失敗: ' + e.message);
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
    };