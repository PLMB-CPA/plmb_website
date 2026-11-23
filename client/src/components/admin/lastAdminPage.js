const keyFor = adminId => `plmb-last-admin-page-${adminId}`;

export function saveLastAdminPage(adminId, path) {
    if (!path.startsWith('/admin/') || path.startsWith('/admin/login')) return;
    try {
        localStorage.setItem(keyFor(adminId), path);
    } catch {
        return;
    }
}

export function getLastAdminPage(adminId) {
    try {
        return localStorage.getItem(keyFor(adminId));
    } catch {
        return null;
    }
}
