// src/pages/admin/Role/RoleManagement.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import roleApi from '../../services/roleApi';

import './RoleManagement.css';

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [activeRole, setActiveRole] = useState(null);
  const [checkedPermissions, setCheckedPermissions] = useState([]);
  
  const [isChanged, setIsChanged] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ text: 'Dữ liệu đã được đồng bộ với máy chủ.', isError: false });

  const navigate = useNavigate();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const data = await roleApi.getAll();
        const manageableRoles = data.roles.filter(
            role => role.MaQuyen !== 'ADMIN' && role.MaQuyen !== 'CUST'
        );

        setRoles(manageableRoles);
        setPermissions(data.permissions);
        if (manageableRoles.length > 0) {
            setActiveRole(manageableRoles[0]);
        } else {
            setActiveRole(null); 
        }
      } catch (error) {
        console.error("Lỗi tải data ban đầu:", error);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchRolePermissions = async () => {
      if (!activeRole) return;
      try {
        const assignedPerms = await roleApi.getPermissions(activeRole.MaQuyen);
        setCheckedPermissions(assignedPerms);
        setIsChanged(false);
        setSaveStatus({ text: 'Dữ liệu đã được đồng bộ.', isError: false });
      } catch (error) {
        console.error("Lỗi:", error);
      }
    };
    fetchRolePermissions();
  }, [activeRole]);

  const handleToggle = (maChucNang, isHideAction, moduleName) => {
    setIsChanged(true);
    setSaveStatus({ text: 'Thay đổi chưa được lưu. Hãy kiểm tra kỹ trước khi xác nhận.', isError: false });
    
    setCheckedPermissions(prev => {
      const isChecking = !prev.includes(maChucNang); 
      let newPerms;

      if (isChecking) {
        newPerms = [...prev, maChucNang]; 
        
        if (isHideAction) {
          const detailCodes = permissions
            .filter(p => p.NhomChucNang === moduleName && !p.MaChucNang.startsWith('HIDE_MODULE_'))
            .map(p => p.MaChucNang);
            
          newPerms = newPerms.filter(code => !detailCodes.includes(code));
        } else {
          const hideCode = permissions.find(p => p.NhomChucNang === moduleName && p.MaChucNang.startsWith('HIDE_MODULE_'))?.MaChucNang;
          if (hideCode) {
            newPerms = newPerms.filter(code => code !== hideCode);
          }
        }
      } else {
        newPerms = prev.filter(item => item !== maChucNang); 
      }
      return newPerms;
    });
  };

  const handleSave = async () => {
    if (!isChanged) return;
    setSaveStatus({ text: 'Đang lưu thiết lập...', isError: false });
    try {
      await roleApi.updatePermissions(activeRole.MaQuyen, checkedPermissions);
      setIsChanged(false);
      setSaveStatus({ text: `Đã lưu thành công quyền cho: ${activeRole.TenQuyen}!`, isError: false });
    } catch {
      setSaveStatus({ text: 'Lỗi khi lưu! Vui lòng thử lại.', isError: true });
    }
  };

  const modules = [...new Set(permissions.map(p => p.NhomChucNang))];
  
  const actions = [
    { key: 'VIEW', label: 'XEM', isHideAction: false },
    { key: 'ADD', label: 'THÊM', isHideAction: false },
    { key: 'EDIT', label: 'SỬA', isHideAction: false },
    { key: 'DELETE', label: 'XOÁ', isHideAction: false },
    { key: 'HIDE', label: 'ẨN', isHideAction: true },
  ];

  const getPermissionCode = (moduleName, actionKey) => {
    if (actionKey === 'HIDE') {
      return permissions.find(p => p.NhomChucNang === moduleName && p.MaChucNang.startsWith('HIDE_MODULE_'))?.MaChucNang || null;
    }
    const perm = permissions.find(p => p.NhomChucNang === moduleName && p.MaChucNang.includes(actionKey) && !p.MaChucNang.startsWith('HIDE_MODULE_'));
    return perm ? perm.MaChucNang : null;
  };

  return (
    <div className="role-matrix-container">
      
      {/* THANH TAB CHỨC VỤ ĐÃ ĐƯỢC DỌN DẸP SẠCH SẼ */}
      <div className="role-selector-bar">
        {roles.map(role => (
          <div 
            key={role.MaQuyen}
            className={`role-tab ${activeRole?.MaQuyen === role.MaQuyen ? 'active' : ''}`}
            onClick={() => setActiveRole(role)}
            style={{ cursor: 'pointer' }}
          >
            {role.TenQuyen}
          </div>
        ))}
      </div>

      <div className="matrix-table-wrapper">
        <table className="permissions-table">
          <thead>
            <tr>
              <th>Chức năng (Module)</th>
              {actions.map(act => (
                <th key={act.key} className={act.isHideAction ? 'hide-header' : ''}>
                  {act.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map(module => (
              <tr key={module}>
                <td>{module}</td>
                {actions.map(act => {
                  const permCode = getPermissionCode(module, act.key);
                  return (
                    <td key={act.key}>
                      {permCode && (
                        <label className={`custom-checkbox ${act.isHideAction ? 'check-hide' : ''}`}>
                          <input 
                            type="checkbox" 
                            checked={checkedPermissions.includes(permCode)}
                            onChange={() => handleToggle(permCode, act.isHideAction, module)}
                          />
                          <span className="checkmark"></span>
                        </label>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* THANH HÀNH ĐỘNG DƯỚI CÙNG */}
      <div className="action-bottom-bar">
        <div className="status-message" style={{ color: saveStatus.isError ? 'red' : '#635F40' }}>
          <div className="status-dot" style={{ backgroundColor: saveStatus.isError ? 'red' : '#635F40' }}></div>
          {saveStatus.text}
        </div>
        
        <div className="action-buttons" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          
          {/* Đổi class từ btn thành role-btn và cập nhật chữ Employee */}
          <button 
            className="role-btn btn-redirect"
            onClick={() => navigate('/admin/employee')}
          >
            👥 Quản lý nhân viên
          </button>

          {/* Đổi class từ btn thành role-btn */}
          <button 
            className="role-btn btn-cancel"
            onClick={() => {
              setIsChanged(false);
              setSaveStatus({ text: 'Đã hủy các thay đổi.', isError: false });
              roleApi.getPermissions(activeRole.MaQuyen).then(setCheckedPermissions);
            }}
          >
            Hủy bỏ
          </button>
          
          {/* Đổi class từ btn thành role-btn */}
          <button 
            className="role-btn btn-save" 
            onClick={handleSave}
            style={{ opacity: isChanged ? 1 : 0.6 }}
          >
            Lưu thiết lập
          </button>
        </div>
      </div>

    </div>
  );
}