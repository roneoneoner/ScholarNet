// --- START OF FILE frontend/js/api.js ---

const API_BASE = "http://localhost:8000/api";

const api = {
    get: async (url) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 600000); // 60秒超時
        try {
            const res = await fetch(API_BASE + url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({ detail: `查無結果或發生異常 (狀態碼: ${res.status})` }));
                throw new Error(errorBody.detail);
            }
            return res.json();
        } catch (e) {
            clearTimeout(timeoutId);
            if (e.name === 'AbortError') throw new Error('伺服器響應超時 (60秒)，請減少選取的屬性以縮小運算範圍。');
            throw e;
        }
    },
    post: async (url, data) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超時
        try {
            const res = await fetch(API_BASE + url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({ detail: `POST 請求失敗 (狀態碼: ${res.status})` }));
                throw new Error(errorBody.detail);
            }
            return res.json();
        } catch (e) {
            clearTimeout(timeoutId);
            if (e.name === 'AbortError') throw new Error('伺服器響應超時 (60秒)，請減少選取的屬性以縮小運算範圍。');
            throw e;
        }
    },

    getAuthorFull: (id) => api.get(`/author/${id}/full`),
    getAuthorPapers: (id) => api.get(`/author/${id}/papers`),
    getAuthorList: async (params) => {
        const cleanParams = Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null && v !== ''));
        const query = new URLSearchParams(cleanParams).toString();
        return api.get(`/author/?${query}`);
    },
    getMetaAll: () => api.get('/author/meta/all'),
    getCoop: (type, target, p, c, a, u, limit) => {
        const params = new URLSearchParams({ p, limit });
        if (c) params.append('c', c);
        if (a) params.append('a', a);
        if (u) params.append('u', u);
        return api.get(`/coop/${type}/${target}?${params}`);
    },
    getClusterCentrality: async (author_ids, target_author_id = null, steps = 1) => {
        const payload = { author_ids: author_ids, steps: steps };
        if (target_author_id) payload.target_author_id = target_author_id;
        return api.post('/coop/cluster_centrality', payload);
    }
};
