import React from "react";
import NavbarItem from "./NavbarItem";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBookOpen,
  faArrowRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import {
  faCalendar,
  faCircleQuestion,
  faCircleUser,
} from "@fortawesome/free-regular-svg-icons";

import { useAuth } from "./auth/AuthWrapper";
import { useNavigate } from "react-router-dom";

function Navbar() {
    const {logout} = useAuth();
    const navigate = useNavigate();
    const handleLogout = ()=>{
        logout();
        navigate("/login");
    }
  return (
    <>
      <div className="navbar-container">
        <ul className="navbar-links">
          <NavbarItem title="Courses" path="/courses" icon={faBookOpen} />
          <NavbarItem title="Schedule" path="/schedule" icon={faCalendar} />
          <NavbarItem title="Help" path="/help" icon={faCircleQuestion} />
          <NavbarItem title="Account" path="/account" icon={faCircleUser} />
        </ul>
        <button className="logout-button" onClick={handleLogout}>
          <FontAwesomeIcon icon={faArrowRightFromBracket} />
        </button>
      </div>
    </>
  );
}

export default Navbar;
