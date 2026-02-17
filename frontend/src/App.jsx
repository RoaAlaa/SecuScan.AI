import { Route, Routes } from "react-router-dom"
import "@fortawesome/fontawesome-free/css/all.min.css";
import Home from "./Pages/Home"
import Login from "./Pages/Login"
import Register from "./Pages/Register"
import Scan from "./Pages/Scan"
import Loading from "./Pages/Loading"
import Results from "./Pages/Results"
import Report from "./Pages/Report"

function App() {

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/scan" element={<Scan />} />
      <Route path="/loading" element={<Loading />} />
      <Route path="/results" element={<Results />} />
      <Route path="/report" element={< Report />} />


    </Routes>
   )
}

export default App
