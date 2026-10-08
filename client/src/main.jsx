import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import KioskSearch from "./KioskSearch";
import StaffPortal from "./StaffPortal";

const isStaffRoute = window.location.pathname.replace(/\/$/, "") === "/staff";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isStaffRoute ? <StaffPortal /> : <KioskSearch />}
  </React.StrictMode>
);
