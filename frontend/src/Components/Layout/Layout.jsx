import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../Navbar/Navbar";
import Footer from "../Footer/Footer";

export default function Layout() {
  const location = useLocation();
  const isChat = location.pathname === "/chat";

  return (
    <div
      className={`flex flex-col ${
        isChat ? "h-screen overflow-hidden" : "min-h-screen"
      }`}
    >
      <Navbar />
      <main
        className={`flex-1 flex flex-col ${
          isChat ? "min-h-0 overflow-hidden" : ""
        }`}
      >
        <Outlet />
      </main>
      {!isChat && <Footer />}
    </div>
  );
}