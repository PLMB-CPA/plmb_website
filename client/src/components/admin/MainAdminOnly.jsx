import { Navigate, Outlet, useOutletContext } from 'react-router-dom';

function MainAdminOnly() {
    const context = useOutletContext();

    if (!context.admin.isMain) return <Navigate to="/admin" replace />;

    return <Outlet context={context} />;
}

export default MainAdminOnly;
