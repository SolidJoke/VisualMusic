import React from 'react';
import './Sidebar.css';

const Sidebar = ({ isOpen, toggleSidebar, children, uiTheme }) => {
  return (
    <div className={`app-sidebar ${isOpen ? 'is-open' : 'is-closed'} theme-${uiTheme}`}>
      <button 
        className="sidebar-toggle" 
        onClick={toggleSidebar}
        title={isOpen ? "Fermer le panneau" : "Ouvrir le panneau"}
      >
        {isOpen ? '◀' : '▶'}
      </button>
      
      <div className="sidebar-content">
        {children}
      </div>
    </div>
  );
};

export default Sidebar;
