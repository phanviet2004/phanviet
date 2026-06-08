// src/layouts/AdminLayout/AdminLayout.jsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import 'bootstrap/dist/css/bootstrap.min.css';
import './AdminLayout.css';

const AdminLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const handleToggleSidebar = () => {
        setIsSidebarOpen((prev) => !prev);
    };

    return (
        <div className="admin-layout-container">
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={handleToggleSidebar} />

            <div className="admin-main-wrapper">
                <main className="admin-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;