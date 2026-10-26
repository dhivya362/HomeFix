
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Booking.css";

const API_BASE = "http://127.0.0.1:8000/api";

function Booking() {
  const navigate = useNavigate();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [bookingCreated, setBookingCreated] = useState(false);

  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");

  const [additionalWorks, setAdditionalWorks] = useState([]);
  const [selectedWorks, setSelectedWorks] = useState([]);
  const [estimatedTotal, setEstimatedTotal] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);

  const [formData, setFormData] = useState({
    service: "",
    customer_name: "",
    phone: "",
    address: "",
    issue_description: "",
    booking_date: "",
    time_slot: "",
  });

  // Load services
  useEffect(() => {
    let cancelled = false;

    async function loadServices() {
      try {
        const response = await fetch(`${API_BASE}/services/`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error("Unable to load services.");
        }

        const list = Array.isArray(data) ? data : data.results || [];

        if (!cancelled) {
          setServices(
            list.filter((service) => service.is_available !== false)
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load services.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadServices();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load additional works for selected service
  useEffect(() => {
    let cancelled = false;

    async function loadAdditionalWorks() {
      setAdditionalWorks([]);
      setSelectedWorks([]);
      setEstimatedTotal(null);

      if (!formData.service) return;

      try {
        const response = await fetch(
          `${API_BASE}/services/additional-works/?service=${formData.service}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error("Unable to load additional works.");
        }

        const list = Array.isArray(data) ? data : data.results || [];

        if (!cancelled) {
          setAdditionalWorks(
            list.filter((work) => work.is_available !== false)
          );
        }
      } catch (err) {
        console.error("Additional works error:", err);
      }
    }

    loadAdditionalWorks();

    return () => {
      cancelled = true;
    };
  }, [formData.service]);

  // Calculate estimated price
  useEffect(() => {
    let cancelled = false;

    async function calculatePrice() {
      if (!formData.service) {
        setEstimatedTotal(null);
        return;
      }

      const token = localStorage.getItem("token");

      if (!token) {
        setEstimatedTotal(null);
        return;
      }

      setPriceLoading(true);

      try {
        const response = await fetch(
          `${API_BASE}/bookings/price-estimate/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Token ${token}`,
              Accept: "application/json",
            },
            body: JSON.stringify({
              service_id: Number(formData.service),
              additional_work_ids: selectedWorks,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Price calculation failed.");
        }

        if (!cancelled) setEstimatedTotal(data);
      } catch (err) {
        if (!cancelled) {
          setEstimatedTotal(null);
          console.error("Price estimate error:", err);
        }
      } finally {
        if (!cancelled) setPriceLoading(false);
      }
    }

    calculatePrice();

    return () => {
      cancelled = true;
    };
  }, [formData.service, selectedWorks]);

  // Load available time slots
  useEffect(() => {
    let cancelled = false;

    async function loadAvailableSlots() {
      if (!formData.service || !formData.booking_date) {
        setAvailableSlots([]);
        setSlotsError("");
        setSlotsLoading(false);
        return;
      }

      const token = localStorage.getItem("token");

      if (!token) {
        setAvailableSlots([]);
        setSlotsError("Please log in to view available slots.");
        setSlotsLoading(false);
        navigate("/login");
        return;
      }

      setAvailableSlots([]);
      setSlotsError("");
      setSlotsLoading(true);

      try {
        const params = new URLSearchParams({
          date: formData.booking_date,
          service: formData.service,
        });

        const response = await fetch(
          `${API_BASE}/bookings/available-slots/?${params}`,
          {
            headers: {
              Authorization: `Token ${token}`,
              Accept: "application/json",
            },
          }
        );

        const data = await response.json().catch(() => ({}));

        if (response.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
          return;
        }

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to load available time slots."
          );
        }

        if (!Array.isArray(data)) {
          throw new Error("Invalid time slot response.");
        }

        if (!cancelled) {
          setAvailableSlots(data);

          setFormData((previous) => ({
            ...previous,
            time_slot: data.some(
              (slot) => slot.value === previous.time_slot
            )
              ? previous.time_slot
              : "",
          }));
        }
      } catch (err) {
        if (!cancelled) {
          setSlotsError(
            err.message || "Unable to load time slots."
          );
        }
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    }

    loadAvailableSlots();

    return () => {
      cancelled = true;
    };
  }, [formData.service, formData.booking_date, navigate]);

  // Handle form changes
  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "service" || name === "booking_date"
        ? { time_slot: "" }
        : {}),
    }));

    setError("");
    setMessage("");
    setBookingCreated(false);
  }

  // Handle additional work checkbox
  function handleWorkChange(workId, checked) {
    setSelectedWorks((previous) =>
      checked
        ? [...previous, workId]
        : previous.filter((id) => id !== workId)
    );
  }

  // Submit booking
  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");
    setBookingCreated(false);

    if (!formData.service || !formData.booking_date) {
      setError("Please select a service and booking date.");
      return;
    }

    if (slotsLoading || slotsError) {
      setError("Please wait until available time slots load.");
      return;
    }

    if (
      !availableSlots.some(
        (slot) => slot.value === formData.time_slot
      )
    ) {
      setError("Please select an available time slot.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please log in before creating a booking.");
      navigate("/login");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/bookings/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          ...formData,
          service: Number(formData.service),
          additional_works: selectedWorks,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        setError("Your session expired. Please log in again.");
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(
            data.error ||
              "This time slot is already booked. Select another slot."
          );
        }

        const details = Object.entries(data)
          .map(([key, value]) => {
            const text = Array.isArray(value)
              ? value.join(", ")
              : typeof value === "object" && value !== null
              ? JSON.stringify(value)
              : String(value);

            return `${key}: ${text}`;
          })
          .join(" | ");

        throw new Error(details || "Booking failed.");
      }

      setMessage(
        `Booking successful! Your booking ID is #${data.id}.`
      );
      setBookingCreated(true);

      setFormData({
        service: "",
        customer_name: "",
        phone: "",
        address: "",
        issue_description: "",
        booking_date: "",
        time_slot: "",
      });

      setAvailableSlots([]);
      setAdditionalWorks([]);
      setSelectedWorks([]);
      setEstimatedTotal(null);
      setSlotsError("");
    } catch (err) {
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setSubmitting(false);
    }
  }

  // Prevent past dates
  const today = new Date();

  const minDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  return (
    <main className="booking-page">
      <header className="booking-header">
        <Link to="/" className="booking-logo">
          HomeFix
        </Link>
        <Link to="/dashboard">Customer Dashboard</Link>
      </header>

      <section className="booking-card">
        <h1>Book a Home Service</h1>
        <p>Select a service and your preferred appointment time.</p>

        {error && (
          <p className="booking-error" role="alert">
            {error}
          </p>
        )}

        {message && (
          <p className="booking-success" role="status">
            {message}
          </p>
        )}

        {bookingCreated && (
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
          >
            Go to Customer Dashboard
          </button>
        )}

        {!bookingCreated && (
          <form onSubmit={handleSubmit}>
            <label htmlFor="service">Select Service</label>

            <select
              id="service"
              name="service"
              value={formData.service}
              onChange={handleChange}
              required
              disabled={loading || submitting}
            >
              <option value="">
                {loading ? "Loading services..." : "Choose a service"}
              </option>

              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} — ₹{service.price}
                </option>
              ))}
            </select>

            {/* Additional Work Options */}
            {formData.service && (
              <div className="additional-works">
                <h3>Additional Work</h3>

                {additionalWorks.length === 0 ? (
                  <p>No additional work available.</p>
                ) : (
                  additionalWorks.map((work) => (
                    <label
                      key={work.id}
                      className="additional-work-option"
                    >
                      <input
                        type="checkbox"
                        checked={selectedWorks.includes(work.id)}
                        onChange={(event) =>
                          handleWorkChange(
                            work.id,
                            event.target.checked
                          )
                        }
                        disabled={submitting}
                      />

                      <span>
                        {work.name} — ₹{work.estimated_price}
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}

            {/* Price Estimate */}
            {formData.service && (
              <div className="price-estimate">
                <h3>Estimated Price</h3>

                {priceLoading ? (
                  <p>Calculating price...</p>
                ) : estimatedTotal ? (
                  <>
                    <p>
                      Base Price: ₹{estimatedTotal.base_price}
                    </p>
                    <p>
                      Additional Work: ₹
                      {estimatedTotal.additional_total}
                    </p>
                    <h3>
                      Estimated Total: ₹
                      {estimatedTotal.estimated_total}
                    </h3>
                  </>
                ) : (
                  <p>
                    Price estimate unavailable. Please log in and
                    try again.
                  </p>
                )}
              </div>
            )}

            <label htmlFor="customer_name">Customer Name</label>
            <input
              id="customer_name"
              name="customer_name"
              type="text"
              value={formData.customer_name}
              onChange={handleChange}
              required
              disabled={submitting}
            />

            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              title="Enter a valid 10-digit phone number"
              value={formData.phone}
              onChange={handleChange}
              required
              disabled={submitting}
            />

            <label htmlFor="address">Service Address</label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
              disabled={submitting}
            />

            <label htmlFor="issue_description">
              Describe the Issue
            </label>
            <textarea
              id="issue_description"
              name="issue_description"
              value={formData.issue_description}
              onChange={handleChange}
              required
              disabled={submitting}
            />

            <label htmlFor="booking_date">Booking Date</label>
            <input
              id="booking_date"
              name="booking_date"
              type="date"
              min={minDate}
              value={formData.booking_date}
              onChange={handleChange}
              required
              disabled={submitting}
            />

            <label htmlFor="time_slot">Preferred Time Slot</label>
            <select
              id="time_slot"
              name="time_slot"
              value={formData.time_slot}
              onChange={handleChange}
              required
              disabled={
                !formData.service ||
                !formData.booking_date ||
                slotsLoading ||
                !!slotsError ||
                submitting
              }
            >
              <option value="">
                {!formData.service || !formData.booking_date
                  ? "Select service and date first"
                  : slotsLoading
                  ? "Loading available slots..."
                  : slotsError
                  ? "Unable to load slots"
                  : availableSlots.length === 0
                  ? "No slots available"
                  : "Choose a time slot"}
              </option>

              {availableSlots.map((slot) => (
                <option key={slot.value} value={slot.value}>
                  {slot.label}
                </option>
              ))}
            </select>

            {slotsError && (
              <p className="booking-error" role="alert">
                {slotsError}
              </p>
            )}

            {formData.service &&
              formData.booking_date &&
              !slotsLoading &&
              !slotsError &&
              availableSlots.length === 0 && (
                <p role="status">
                  No time slots available. Please choose another date.
                </p>
              )}

            <button
              type="submit"
              disabled={
                submitting ||
                loading ||
                services.length === 0 ||
                slotsLoading ||
                !!slotsError ||
                availableSlots.length === 0
              }
            >
              {submitting ? "Booking..." : "Confirm Booking"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

export default Booking;
