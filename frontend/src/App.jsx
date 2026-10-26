
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CustomerDashboard from "./pages/CustomerDashboard";
import Booking from "./pages/Booking"; 
import Services from "./pages/Services";
import AdminDashboard from "./pages/AdminDashboard";
import TechnicianDashboard from "./pages/TechnicianDashboard";
import Profile from "./pages/Profile";
import BookingHistory from "./pages/BookingHistory";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<CustomerDashboard />} />
        <Route path="/booking" element={<Booking />}/>
        <Route path="/book-service/:id"element={<Booking />} />
        <Route path="/services" element={<Services />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/technician-dashboard" element={<TechnicianDashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/booking-history" element={<BookingHistory />} />
        <Route path="*"
        element={
        <div style={{ padding: "40px", textAlign: "center" }}>
          <h2>Page Not Found</h2>
          <a href="/">Go to Home</a>
        </div>
      }
    />
      </Routes>
    </BrowserRouter>
  );
}

export default App;