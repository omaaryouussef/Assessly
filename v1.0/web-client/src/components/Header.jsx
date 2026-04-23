import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuildingColumns } from "@fortawesome/free-solid-svg-icons";
import Navbar from "./Navbar";
import "./components.css";

function Header() {
  return (
    <>
      <a href="/" className="logo">
        <FontAwesomeIcon icon={faBuildingColumns} className="logo-icon" />
      </a>
      <Navbar />
    </>
  );  
}

export default Header;
