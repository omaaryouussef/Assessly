import React from "react";
import { NavLink } from "react-router-dom";

function SidebarItem(props){
    const {path, title} = props;
    return(
        <li>
            <NavLink to={path} className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
                <span className="sidebar-item-text">{title}</span>
            </NavLink>
        </li>
    )
}


export default SidebarItem;