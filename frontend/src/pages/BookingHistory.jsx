
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/BookingHistory.css";

const API_BASE_URL = "http://127.0.0.1:8000/api";

const TIME_SLOTS = {
  "09:00-11:00": "09:00 AM - 11:00 AM",
  "11:00-13:00": "11:00 AM - 01:00 PM",
  "13:00-15:00": "01:00 PM - 03:00 PM",
  "15:00-17:00": "03:00 PM - 05:00 PM",
  "17:00-19:00": "05:00 PM - 07:00 PM",
};

function normalizeStatus(status) {
  return (status || "Pending").toLowerCase().trim();
}

function BookingHistory() {
  const [bookings, setBookings] = useState([]);
  const [activeFilter, setActiveFilter] = useState("upcoming");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchBookings() {
      const token = localStorage.getItem("token");

      if (!token) {
        if (isMounted) {
          setError("Please log in to view your booking history.");
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/bookings/`, {
          headers: {
            Authorization: `Token ${token}`,
            Accept: "application/json",
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || data.error || "Unable to load booking history."
          );
        }

        if (isMounted) {
          setBookings(
            Array.isArray(data) ? data : data.results || []
          );
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load booking history.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchBookings();

    return () => {
      isMounted = false;
    };
  }, []);

  function getServiceName(booking) {
    if (booking.service_name) return booking.service_name;

    if (booking.service && typeof booking.service === "object") {
      return booking.service.name || "Home Service";
    }

    return booking.service
      ? `Service #${booking.service}`
      : "Home Service";
  }

  function getTechnicianName(booking) {
    if (booking.technician_name) return booking.technician_name;

    if (booking.assigned_technician_name) {
      return booking.assigned_technician_name;
    }

    if (
      booking.assigned_technician &&
      typeof booking.assigned_technician === "object"
    ) {
      return (
        booking.assigned_technician.name ||
        booking.assigned_technician.username ||
        "Assigned"
      );
    }

    return booking.assigned_technician
      ? "Assigned"
      : "Not assigned yet";
  }

  function getStatusClass(status) {
    const normalized = normalizeStatus(status).replaceAll(" ", "_");

    const allowedStatuses = [
      "pending",
      "accepted",
      "completed",
      "cancelled",
      "rejected",
    ];

    return allowedStatuses.includes(normalized)
      ? normalized
      : "pending";
  }

  function formatDate(dateValue) {
    if (!dateValue) return "Not available";

    const date = new Date(`${dateValue}T00:00:00`);

    if (Number.isNaN(date.getTime())) return dateValue;

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function isUpcoming(booking) {
    if (!booking.booking_date) return false;

    const bookingDate = new Date(`${booking.booking_date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const status = normalizeStatus(booking.status);

    return (
      !Number.isNaN(bookingDate.getTime()) &&
      bookingDate >= today &&
      !["completed", "cancelled", "rejected"].includes(status)
    );
  }

  const counts = useMemo(() => {
    const upcoming = bookings.filter(isUpcoming).length;

    const completed = bookings.filter(
      (booking) => normalizeStatus(booking.status) === "completed"
    ).length;

    const cancelled = bookings.filter((booking) =>
      ["cancelled", "rejected"].includes(normalizeStatus(booking.status))
    ).length;

    return {
      total: bookings.length,
      upcoming,
      completed,
      cancelled,
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const result = bookings.filter((booking) => {
      const status = normalizeStatus(booking.status);

      if (activeFilter === "upcoming") return isUpcoming(booking);
      if (activeFilter === "completed") return status === "completed";

      if (activeFilter === "cancelled") {
        return ["cancelled", "rejected"].includes(status);
      }

      return true;
    });

    return result.sort((a, b) => {
      return (
        new Date(`${b.booking_date || "1970-01-01"}T00:00:00`) -
        new Date(`${a.booking_date || "1970-01-01"}T00:00:00`)
      );
    });
  }, [bookings, activeFilter]);

  const filters = [
    { key: "upcoming", label: "Upcoming", count: counts.upcoming },
    { key: "completed", label: "Completed", count: counts.completed },
    { key: "cancelled", label: "Cancelled", count: counts.cancelled },
    { key: "all", label: "All Bookings", count: counts.total },
  ];

  return (
    <div className="booking-history-page">
      <header className="history-header">
        <Link to="/dashboard" className="history-logo">
          HomeFix
        </Link>

        <Link to="/dashboard" className="history-back-link">
          ← Back to Dashboard
        </Link>
      </header>

      <main className="history-main">
        <section className="history-intro">
          <p className="history-eyebrow">YOUR BOOKINGS</p>
          <h1>Booking History</h1>
          <p>View and track all your home service bookings.</p>
        </section>

        <section className="history-summary">
          <article className="history-summary-card">
            <span>Total Bookings</span>
            <strong>{counts.total}</strong>
          </article>

          <article className="history-summary-card">
            <span>Upcoming</span>
            <strong>{counts.upcoming}</strong>
          </article>

          <article className="history-summary-card">
            <span>Completed</span>
            <strong>{counts.completed}</strong>
          </article>

          <article className="history-summary-card">
            <span>Cancelled</span>
            <strong>{counts.cancelled}</strong>
          </article>
        </section>

        <section className="history-content">
          <div className="history-content-heading">
            <div>
              <h2>My Bookings</h2>
              <p>Select a category to view your bookings.</p>
            </div>
          </div>

          <div className="history-filters">
            {filters.map((filter) => (
              <button
                type="button"
                key={filter.key}
                className={
                  activeFilter === filter.key
                    ? "history-filter active"
                    : "history-filter"
                }
                onClick={() => setActiveFilter(filter.key)}
              >
                {filter.label}
                <span>{filter.count}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="history-message">
              Loading your bookings...
            </div>
          ) : error ? (
            <div className="history-error" role="alert">
              {error}
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="history-empty">
              <div className="history-empty-icon">📅</div>
              <h3>No bookings found</h3>
              <p>
                No bookings are available in this category.
              </p>
              <Link to="/services" className="history-book-btn">
                Browse Services
              </Link>
            </div>
          ) : (
            <div className="history-booking-list">
              {filteredBookings.map((booking) => (
                <article
                  className="history-booking-card"
                  key={booking.id}
                >
                  <div className="history-service-icon">🛠️</div>

                  <div className="history-booking-content">
                    <div className="history-booking-top">
                      <div>
                        <h3>{getServiceName(booking)}</h3>
                        <p>Booking ID: #{booking.id}</p>
                      </div>

                      <span
                        className={`history-status ${getStatusClass(
                          booking.status
                        )}`}
                      >
                        {booking.status || "Pending"}
                      </span>
                    </div>

                    <div className="history-booking-details">
                      <div>
                        <span>Booking Date</span>
                        <strong>
                          {formatDate(booking.booking_date)}
                        </strong>
                      </div>

                      <div>
                        <span>Time Slot</span>
                        <strong>
                          {TIME_SLOTS[booking.time_slot] ||
                            booking.time_slot ||
                            "Not available"}
                        </strong>
                      </div>

                      <div>
                        <span>Technician</span>
                        <strong>{getTechnicianName(booking)}</strong>
                      </div>
                    </div>

                    <div className="history-card-footer">
                      <span>
                        {normalizeStatus(booking.status) === "completed"
                          ? "Service completed"
                          : normalizeStatus(booking.status) === "cancelled"
                          ? "Booking cancelled"
                          : normalizeStatus(booking.status) === "rejected"
                          ? "Booking rejected"
                          : "Booking status updated by service team"}
                      </span>

                      <Link
                        to="/dashboard#my-bookings"
                        className="history-details-link"
                      >
                        Manage Booking →
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="history-footer">
        © {new Date().getFullYear()} HomeFix. All rights reserved.
      </footer>
    </div>
  );
}

export default BookingHistory;
