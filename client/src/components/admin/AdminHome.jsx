import { Navigate, useOutletContext } from 'react-router-dom';
import { getLastAdminPage } from './lastAdminPage';

const DEFAULT_PAGE = '/admin/dashboard';

function AdminHome() {
    const { admin } = useOutletContext();

    let target = DEFAULT_PAGE;
    if (admin.openLastPage) {
        const last = getLastAdminPage(admin.id);
        const blocked = !admin.isMain && last?.startsWith('/admin/manage');
        if (last && last.startsWith('/admin/') && !blocked) target = last;
    }

    return <Navigate to={target} replace />;
}

export default AdminHome;
