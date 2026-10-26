import { useNavigate } from "react-router-dom";

function ServiceCard({ id, title, description, icon, price }) {
  const navigate = useNavigate();

  const handleBookNow = () => {
    if (!id) {
      alert("Service ID is missing. Please try again.");
      return;
    }

    navigate(`/book-service/${id}`);
  };

  return (
    <div className="service-card">
      <div className="service-icon">
        {icon || "🛠️"}
      </div>

      <h3>{title}</h3>

      <p>{description}</p>

      <h4>Starting at ₹{Number(price).toFixed(2)}</h4>

      <button
        type="button"
        className="book-btn"
        onClick={handleBookNow}
      >
        Book Now
      </button>
    </div>
  );
}

export default ServiceCard;