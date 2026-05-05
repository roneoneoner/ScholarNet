const app = {
    switchTab: (tabId, e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        (e ? e.target : event.target).classList.add('active');
        document.getElementById('panel-' + tabId).classList.add('active');
    }
};

// 頁面載入後初始化選單
window.addEventListener('DOMContentLoaded', async () => {
    nobel.init();
    await ui.initFilters();

    // 檢查 URL 參數 (?authorId=xxx)
    const urlParams = new URLSearchParams(window.location.search);
    const authorId = urlParams.get('authorId');
    if (authorId) {
        // 切換到個人資訊分頁
        const infoBtn = document.querySelector('nav.tab-nav button[onclick*="info"]');
        if (infoBtn) infoBtn.click();
        
        // 填入並搜尋
        const input = document.getElementById('authorIdInfo');
        if (input) {
            input.value = authorId;
            ui.searchFullProfile();
        }
    }
});
