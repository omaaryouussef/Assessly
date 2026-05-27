import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuildingColumns } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import "./components.css";

function Header() {
  return (
    <>
      <Link to="/courses" className="logo">
        <FontAwesomeIcon icon={faBuildingColumns} className="logo-icon" />
      </Link>
      <Navbar />
      <Sidebar />
    </>
  );  
}

export default Header;
