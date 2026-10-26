
import { useEffect, useState } from "react";
import "../styles/Services.css";

function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/services/")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load services");
        }
        return response.json();
      })
      .then((data) => {
        setServices(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Services load ஆகவில்லை. Django server-ஐ check பண்ணுங்கள்.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p>Loading services...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div className="services-page">
      <h1>Our Home Services</h1>
      <p>Choose a service for your home.</p>

      <div className="services-grid">
        {services.map((service) => (
          <div className="service-card" key={service.id}>
            <h2>{service.name}</h2>
            <p>{service.description}</p>
            <h3>₹{service.price}</h3>
            <button
              onClick={() =>
                alert(`${service.name} selected! Booking will be added next.`)
              }
            >
              Book Service
            </button>
          </div>
        ))}
      </div>

      {services.length === 0 && (
        <p>No services available yet. Add services in Django Admin.</p>
      )}
    </div>
  );
}

export default Services;