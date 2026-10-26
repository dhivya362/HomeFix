
import { useEffect, useState } from "react";

import Navbar from "../components/Navbar";
import ServiceCard from "../components/ServiceCard";
import Footer from "../components/Footer";
import "../styles/Home.css";

const API_BASE_URL = "http://127.0.0.1:8000/api";

function Home() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState("");

  // Load services from Django API
  useEffect(() => {
    fetch(`${API_BASE_URL}/services/`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load services");
        }
        return response.json();
      })
      .then((data) => {
        setServices(
          Array.isArray(data) ? data : data.results || []
        );
        setError("");
      })
      .catch((err) => {
        console.error("Services API error:", err);
        setError(
          "Services load ஆகவில்லை. Django server-ஐ check பண்ணவும்."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Load public customer reviews
  useEffect(() => {
    fetch(`${API_BASE_URL}/bookings/reviews/list/`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load reviews");
        }
        return response.json();
      })
      .then((data) => {
        setReviews(
          Array.isArray(data) ? data : data.results || []
        );
        setReviewsError("");
      })
      .catch((err) => {
        console.error("Reviews API error:", err);
        setReviewsError(
          "Customer reviews இப்போது load ஆகவில்லை."
        );
      })
      .finally(() => {
        setReviewsLoading(false);
      });
  }, []);

  return (
    <>
      <Navbar />

      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-content">
            <span className="hero-label">
              YOUR TRUSTED HOME SERVICE PARTNER
            </span>

            <h1>
              Home Repairs Made
              <span> Simple & Reliable</span>
            </h1>

            <p>
              Book trusted professionals for your home.
              Choose your service, date and time in minutes.
            </p>

            <a href="#services" className="hero-btn">
              Explore Services →
            </a>

            <div className="hero-features">
              <span>✓ Verified Technicians</span>
              <span>✓ Flexible Time Slots</span>
              <span>✓ Easy Booking</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-emoji">🧰</div>

            <div className="floating-card">
              <span>⭐ 4.9/5</span>
              <p>Trusted home services</p>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="services-section">
          <div className="section-heading">
            <span>OUR SERVICES</span>
            <h2>What can we fix for you?</h2>
            <p>
              Professional help for everyday home problems.
            </p>
          </div>

          {loading && <p>Loading services...</p>}

          {error && <p>{error}</p>}

          {!loading && !error && (
            <div className="service-grid">
              {services.map((service) => (
                <div key={service.id}>
                  <ServiceCard
                    id={service.id}
                    title={service.name}
                    description={service.description}
                    price={Number(service.price)}
                    icon="🛠️"
                  />
                </div>
              ))}
            </div>
          )}

          {!loading && !error && services.length === 0 && (
            <p>
              No services available. Please add services in Django Admin.
            </p>
          )}
        </section>

        {/* Why Choose HomeFix */}
        <section id="about" className="why-section">
          <h2>Why Choose HomeFix?</h2>

          <div className="why-grid">
            <div>
              <span>🛡️</span>
              <h3>Trusted Professionals</h3>
              <p>
                Find service professionals for your needs.
              </p>
            </div>

            <div>
              <span>📅</span>
              <h3>Convenient Scheduling</h3>
              <p>
                Choose a date and time that works for you.
              </p>
            </div>

            <div>
              <span>📋</span>
              <h3>Booking Updates</h3>
              <p>
                Follow your booking status in one place.
              </p>
            </div>
          </div>
        </section>

        {/* Customer Reviews Section */}
        <section
          id="reviews"
          className="customer-reviews-section"
        >
          <div className="section-heading">
            <span>WHAT OUR CUSTOMERS SAY</span>
            <h2>Customer Reviews</h2>
            <p>
              Feedback from customers who have used our services.
            </p>
          </div>

          {reviewsLoading && (
            <p>Loading customer reviews...</p>
          )}

          {!reviewsLoading && reviewsError && (
            <p className="reviews-message">
              {reviewsError}
            </p>
          )}

          {!reviewsLoading &&
            !reviewsError &&
            reviews.length === 0 && (
              <p className="reviews-message">
                No customer reviews yet. Be the first to share your experience!
              </p>
            )}

          {!reviewsLoading &&
            !reviewsError &&
            reviews.length > 0 && (
              <>
                <div className="reviews-summary">
                  <span className="reviews-summary-star">★</span>

                  <span>
                    {(
                      reviews.reduce(
                        (total, review) =>
                          total + Number(review.rating || 0),
                        0
                      ) / reviews.length
                    ).toFixed(1)}
                  </span>

                  <span className="reviews-summary-count">
                    Based on {reviews.length} customer{" "}
                    {reviews.length === 1 ? "review" : "reviews"}
                  </span>
                </div>

                <div className="customer-reviews-grid">
                  {reviews.map((review) => (
                    <article
                      className="customer-review-card"
                      key={review.id}
                    >
                      <div className="review-card-top">
                        <div className="review-avatar">
                          {(review.customer_name || "C")
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="review-customer-info">
                          <h3>
                            {review.customer_name || "Customer"}
                          </h3>
                          <p>
                            {review.service_name || "Home Service"}
                          </p>
                        </div>
                      </div>

                      <div
                        className="review-stars"
                        aria-label={`${review.rating} out of 5 stars`}
                      >
                        {"★".repeat(
                          Math.min(
                            5,
                            Math.max(
                              0,
                              Number(review.rating) || 0
                            )
                          )
                        )}

                        <span>
                          {"☆".repeat(
                            5 -
                              Math.min(
                                5,
                                Math.max(
                                  0,
                                  Number(review.rating) || 0
                                )
                              )
                          )}
                        </span>
                      </div>

                      <p className="review-comment">
                        “
                        {review.comment ||
                          "Thank you for the service."}
                        ”
                      </p>

                      <p className="review-date">
                        {review.created_at &&
                          new Date(
                            review.created_at
                          ).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                      </p>
                    </article>
                  ))}
                </div>
              </>
            )}
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Home;
