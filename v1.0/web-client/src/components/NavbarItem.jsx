import React from "react";
import {NavLink} from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

function NavbarItem(props){
    const { title, icon, path } = props;
    return(
        <NavLink to={path} className={({ isActive }) => isActive ? "navbar-item active" : "navbar-item"}>
            <FontAwesomeIcon icon={icon} />
            <span className="navbar-item-text">{title}</span>
        </NavLink>
    )

}

export default NavbarItem;