
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TechnicianMap from "../components/TechnicianMap";
import "../styles/CustomerDashboard.css";

const API_BASE_URL = "http://127.0.0.1:8000/api";
const BACKEND_BASE_URL = "http://127.0.0.1:8000";

const TIME_SLOTS = [
  { value: "09:00-11:00", label: "09:00 AM - 11:00 AM" },
  { value: "11:00-13:00", label: "11:00 AM - 01:00 PM" },
  { value: "13:00-15:00", label: "01:00 PM - 03:00 PM" },
  { value: "15:00-17:00", label: "03:00 PM - 05:00 PM" },
  { value: "17:00-19:00", label: "05:00 PM - 07:00 PM" },
];

function CustomerDashboard() {
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [bookingError, setBookingError] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  const [rescheduleBookingId, setRescheduleBookingId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlot, setRescheduleSlot] = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] =
    useState(false);

  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const [paymentBookingId, setPaymentBookingId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [paymentLoadingId, setPaymentLoadingId] = useState(null);
  const [paymentError, setPaymentError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");

  const [reviewBookingId, setReviewBookingId] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewedBookingIds, setReviewedBookingIds] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewError, setReviewError] = useState("");

  const [notifications, setNotifications] = useState([]);
  const [notificationError, setNotificationError] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [readingNotificationId, setReadingNotificationId] = useState(null);

  const token = localStorage.getItem("token");

  function getAuthHeaders(json = false) {
    const currentToken = localStorage.getItem("token");

    return {
      ...(currentToken
        ? { Authorization: `Token ${currentToken}` }
        : {}),
      Accept: "application/json",
      ...(json ? { "Content-Type": "application/json" } : {}),
    };
  }

  async function readResponse(response) {
    const text = await response.text();

    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        `Invalid server response. HTTP ${response.status}. URL: ${response.url}`
      );
    }
  }

  function getPhotoUrl(path) {
    if (!path || typeof path !== "string") return "";

    const value = path.trim();

    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;

    if (value.startsWith("//")) {
      return `${window.location.protocol}${value}`;
    }

    return `${BACKEND_BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
  }

  async function fetchDashboardData() {
    setLoading(true);
    setError("");

    try {
      if (!localStorage.getItem("token")) {
        throw new Error("Please log in to view your dashboard.");
      }

      const headers = getAuthHeaders();

      const [servicesResponse, bookingsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/services/`, { headers }),
        fetch(`${API_BASE_URL}/bookings/`, { headers }),
      ]);

      const servicesData = await readResponse(servicesResponse);
      const bookingsData = await readResponse(bookingsResponse);

      if (!servicesResponse.ok) {
        throw new Error(
          servicesData.detail ||
            servicesData.error ||
            "Unable to load services."
        );
      }

      if (!bookingsResponse.ok) {
        throw new Error(
          bookingsData.detail ||
            bookingsData.error ||
            "Unable to load bookings."
        );
      }

      setServices(
        Array.isArray(servicesData)
          ? servicesData
          : servicesData.results || []
      );

      setBookings(
        Array.isArray(bookingsData)
          ? bookingsData
          : bookingsData.results || []
      );
    } catch (err) {
      setError(err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchNotifications() {
    if (!localStorage.getItem("token")) {
      setNotificationError("Please log in again.");
      return;
    }

    setNotificationLoading(true);
    setNotificationError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/bookings/notifications/`,
        { headers: getAuthHeaders() }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.detail || data.error || "Unable to load notifications."
        );
      }

      setNotifications(
        Array.isArray(data) ? data : data.results || []
      );
    } catch (err) {
      setNotificationError(
        err.message || "Unable to load notifications."
      );
    } finally {
      setNotificationLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function handleMarkAsRead(id) {
    setReadingNotificationId(id);
    setNotificationError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/bookings/notifications/${id}/read/`,
        {
          method: "PATCH",
          headers: getAuthHeaders(true),
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.detail || data.error || "Unable to update notification."
        );
      }

      setNotifications((items) =>
        items.map((item) =>
          String(item.id) === String(id)
            ? { ...item, is_read: true }
            : item
        )
      );
    } catch (err) {
      setNotificationError(
        err.message || "Unable to update notification."
      );
    } finally {
      setReadingNotificationId(null);
    }
  }

  function getStatusClass(status) {
    switch ((status || "").toLowerCase()) {
      case "accepted":
        return "accepted";
      case "completed":
        return "completed";
      case "rejected":
        return "rejected";
      case "cancelled":
        return "cancelled";
      default:
        return "pending";
    }
  }

  function getServiceName(booking) {
    if (booking.service_name) return booking.service_name;

    if (booking.service && typeof booking.service === "object") {
      return booking.service.name || "Service";
    }

    const service = services.find(
      (item) => String(item.id) === String(booking.service)
    );

    return service?.name || "Service";
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

  function getAdditionalWorks(booking) {
    const works =
      booking.additional_work_details ||
      booking.additional_works ||
      [];

    return Array.isArray(works) ? works : [];
  }

  function getEstimatedTotal(booking) {
    if (!booking) return null;

    const amountFields = [
      booking.final_total,
      booking.estimated_total,
      booking.total_price,
      booking.total_amount,
      booking.estimated_price,
      booking.service_price,
      booking.price,
      booking.service && typeof booking.service === "object"
        ? booking.service.price
        : null,
    ];

    for (const value of amountFields) {
      if (value === null || value === undefined || value === "") continue;

      const amount = Number(value);

      if (Number.isFinite(amount) && amount > 0) return amount;
    }

    const serviceId =
      typeof booking.service === "object"
        ? booking.service?.id
        : booking.service;

    const service = services.find(
      (item) => String(item.id) === String(serviceId)
    );

    if (
      service?.price !== null &&
      service?.price !== undefined &&
      service?.price !== ""
    ) {
      const amount = Number(service.price);

      if (Number.isFinite(amount) && amount > 0) return amount;
    }

    return null;
  }

  function getAdditionalWorkName(work) {
    if (typeof work === "string" || typeof work === "number") {
      return `Additional Work #${work}`;
    }

    return (
      work?.name ||
      work?.service_name ||
      work?.title ||
      "Additional Work"
    );
  }

  function getAdditionalWorkPrice(work) {
    if (!work || typeof work !== "object") return null;

    return work.estimated_price ?? work.price ?? work.amount ?? null;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);
  }

  function openRescheduleForm(booking) {
    setRescheduleBookingId(booking.id);
    setRescheduleDate(booking.booking_date || "");
    setRescheduleSlot(booking.time_slot || "");
    setRescheduleSlots([]);
    setBookingError("");
    setBookingMessage("");
  }

  async function fetchRescheduleSlots(bookingId, dateValue) {
    const booking = bookings.find(
      (item) => String(item.id) === String(bookingId)
    );

    if (!booking || !dateValue) {
      setRescheduleSlots([]);
      setRescheduleSlot("");
      return;
    }

    const serviceId =
      typeof booking.service === "object"
        ? booking.service.id
        : booking.service;

    if (!serviceId) {
      setRescheduleSlots(TIME_SLOTS);
      return;
    }

    setRescheduleSlotsLoading(true);
    setBookingError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/bookings/available-slots/?date=${encodeURIComponent(
          dateValue
        )}&service=${encodeURIComponent(serviceId)}`,
        { headers: getAuthHeaders() }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error || data.detail || "Unable to load available slots."
        );
      }

      const slots = Array.isArray(data)
        ? [...data]
        : [...(data.results || [])];

      if (
        booking.booking_date === dateValue &&
        booking.time_slot &&
        !slots.some((slot) => slot.value === booking.time_slot)
      ) {
        slots.push({
          value: booking.time_slot,
          label:
            TIME_SLOTS.find(
              (slot) => slot.value === booking.time_slot
            )?.label || booking.time_slot,
        });
      }

      setRescheduleSlots(slots);

      setRescheduleSlot((current) =>
        slots.some((slot) => slot.value === current) ? current : ""
      );
    } catch (err) {
      setBookingError(
        err.message || "Unable to load available slots."
      );
      setRescheduleSlots([]);
    } finally {
      setRescheduleSlotsLoading(false);
    }
  }

  async function handleRescheduleBooking(event) {
    event.preventDefault();

    if (!rescheduleBookingId || !rescheduleDate || !rescheduleSlot) {
      setBookingError("Please select a date and time slot.");
      return;
    }

    setRescheduleLoading(true);
    setBookingError("");
    setBookingMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/bookings/reschedule/${rescheduleBookingId}/`,
        {
          method: "PATCH",
          headers: getAuthHeaders(true),
          body: JSON.stringify({
            booking_date: rescheduleDate,
            time_slot: rescheduleSlot,
          }),
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error || data.detail || "Unable to reschedule booking."
        );
      }

      if (data.booking) {
        setBookings((items) =>
          items.map((booking) =>
            String(booking.id) === String(rescheduleBookingId)
              ? { ...booking, ...data.booking }
              : booking
          )
        );
      } else {
        await fetchDashboardData();
      }

      setBookingMessage(
        data.message || "Booking rescheduled successfully."
      );

      setRescheduleBookingId(null);
      setRescheduleDate("");
      setRescheduleSlot("");
      setRescheduleSlots([]);

      await fetchNotifications();
    } catch (err) {
      setBookingError(
        err.message || "Unable to reschedule booking."
      );
    } finally {
      setRescheduleLoading(false);
    }
  }

  async function handleCancelBooking(bookingId) {
    if (!window.confirm("Are you sure you want to cancel this booking?")) {
      return;
    }

    setCancellingId(bookingId);
    setBookingMessage("");
    setBookingError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/bookings/${bookingId}/cancel/`,
        {
          method: "PATCH",
          headers: getAuthHeaders(true),
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error || data.detail || "Unable to cancel booking."
        );
      }

      const status =
        data.booking?.status || data.status || "Cancelled";

      setBookings((items) =>
        items.map((booking) =>
          String(booking.id) === String(bookingId)
            ? { ...booking, status }
            : booking
        )
      );

      setBookingMessage(
        data.message || "Booking cancelled successfully."
      );

      setRescheduleBookingId(null);
      await fetchNotifications();
    } catch (err) {
      setBookingError(
        err.message || "Unable to cancel booking."
      );
    } finally {
      setCancellingId(null);
    }
  }

  async function handleSubmitReview(event) {
    event.preventDefault();

    setReviewLoading(true);
    setReviewMessage("");
    setReviewError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/bookings/reviews/`,
        {
          method: "POST",
          headers: getAuthHeaders(true),
          body: JSON.stringify({
            booking_id: reviewBookingId,
            rating,
            comment,
          }),
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error || data.detail || "Unable to submit review."
        );
      }

      setReviewedBookingIds((items) => [
        ...items,
        String(reviewBookingId),
      ]);

      setReviewBookingId(null);
      setRating(5);
      setComment("");
      setReviewMessage("Thank you! Your review was submitted.");
    } catch (err) {
      setReviewError(
        err.message || "Unable to submit review."
      );
    } finally {
      setReviewLoading(false);
    }
  }

  function downloadInvoice(booking) {
    const total = getEstimatedTotal(booking);
    const works = getAdditionalWorks(booking);
    const serviceName = getServiceName(booking);

    const worksHtml = works
      .map((work) => {
        const price = getAdditionalWorkPrice(work);

        return `<tr>
          <td>${escapeHtml(getAdditionalWorkName(work))}</td>
          <td>${
            price === null
              ? "Included"
              : `₹${Number(price).toFixed(2)}`
          }</td>
        </tr>`;
      })
      .join("");

    const invoiceWindow = window.open(
      "",
      "_blank",
      "width=800,height=900"
    );

    if (!invoiceWindow) {
      setBookingError(
        "Please allow pop-ups in your browser to download the invoice."
      );
      return;
    }

    invoiceWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>HomeFix Invoice - Booking ${booking.id}</title>
        <meta charset="UTF-8" />
        <style>
          body{font-family:Arial,sans-serif;padding:35px;color:#222}
          .header{display:flex;justify-content:space-between;border-bottom:2px solid #6d28d9;padding-bottom:18px}
          h1{color:#6d28d9;margin:0}
          h2{margin-top:30px}
          .muted{color:#666}
          table{width:100%;border-collapse:collapse;margin-top:18px}
          th,td{text-align:left;padding:12px;border-bottom:1px solid #ddd}
          th{background:#f3f4f6}
          .total{text-align:right;font-size:20px;font-weight:bold;margin-top:25px}
          .footer{margin-top:50px;text-align:center;color:#666}
          @media print{button{display:none}body{padding:10px}}
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>HomeFix</h1>
            <p class="muted">Home Services Invoice</p>
          </div>
          <div>
            <strong>Invoice</strong>
            <p>Booking #${booking.id}</p>
          </div>
        </div>

        <h2>Booking Details</h2>
        <p><strong>Service:</strong> ${escapeHtml(serviceName)}</p>
        <p><strong>Booking Date:</strong> ${escapeHtml(booking.booking_date || "N/A")}</p>
        <p><strong>Time Slot:</strong> ${escapeHtml(booking.time_slot || "N/A")}</p>
        <p><strong>Status:</strong> ${escapeHtml(booking.status || "Pending")}</p>

        <table>
          <thead>
            <tr><th>Description</th><th>Amount</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>${escapeHtml(serviceName)}</td>
              <td>Base service</td>
            </tr>
            ${worksHtml}
          </tbody>
        </table>

        <div class="total">
          Total: ${
            total === null
              ? "Amount not available"
              : `₹${total.toFixed(2)}`
          }
        </div>

        <div class="footer">
          <p>Thank you for choosing HomeFix!</p>
          <p>This is a booking estimate/invoice summary.</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);

    invoiceWindow.document.close();
  }

  async function handlePayment(booking) {
    setPaymentError("");
    setPaymentMessage("");

    if (["Rejected", "Cancelled"].includes(booking.status)) {
      setPaymentError(
        "Rejected or cancelled bookings cannot be paid."
      );
      return;
    }

    const amount = getEstimatedTotal(booking);

    if (amount === null || amount <= 0) {
      setPaymentError(
        "A valid booking amount is not available. Please check the service price."
      );
      return;
    }

    if (paymentMethod === "cash") {
      setPaymentMessage(
        "Cash selected. Please pay the technician after the service. This dashboard does not automatically mark cash as paid."
      );
      return;
    }

    setPaymentLoadingId(booking.id);

    try {
      const response = await fetch(
        `${API_BASE_URL}/bookings/create-razorpay-order/`,
        {
          method: "POST",
          headers: getAuthHeaders(true),
          body: JSON.stringify({ booking_id: booking.id }),
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error || data.detail || "Unable to create payment order."
        );
      }

      if (!window.Razorpay) {
        throw new Error(
          "Razorpay Checkout is not loaded. Add its script to public/index.html."
        );
      }

      const checkout = new window.Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: data.currency || "INR",
        name: "HomeFix",
        description: `Payment for booking #${booking.id}`,
        order_id: data.razorpay_order_id,

        handler: function () {
          setPaymentMessage(
            "Payment response received. Backend signature verification is required before marking this booking paid."
          );
        },

        prefill: {
          name: localStorage.getItem("user") || "",
        },

        theme: { color: "#6d28d9" },

        modal: {
          ondismiss: () =>
            setPaymentMessage("Payment window closed."),
        },
      });

      checkout.on("payment.failed", () => {
        setPaymentError("Payment failed. Please try again.");
      });

      checkout.open();
    } catch (err) {
      setPaymentError(err.message || "Unable to start payment.");
    } finally {
      setPaymentLoadingId(null);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    window.location.href = "/login";
  }

  const unreadCount = notifications.filter(
    (item) => !item.is_read
  ).length;

  const pendingBookings = bookings.filter(
    (item) => item.status === "Pending"
  ).length;

  const completedBookings = bookings.filter(
    (item) => item.status === "Completed"
  ).length;

  const activeBookings = bookings.filter((item) =>
    ["Pending", "Accepted"].includes(item.status)
  ).length;

  const today = new Date();

  const minBookingDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  if (loading) {
    return (
      <div className="customer-dashboard customer-sidebar-layout">
        <aside className="customer-sidebar">
          <Link to="/dashboard" className="customer-sidebar-brand">
            <span className="customer-sidebar-brand-icon">🏠</span>
            <span>HomeFix</span>
          </Link>
        </aside>

        <main className="customer-content">
          <div className="dashboard-loading">
            Loading your dashboard...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="customer-dashboard customer-sidebar-layout">
      {/* Single sidebar */}
      <aside className="customer-sidebar">
        <Link to="/dashboard" className="customer-sidebar-brand">
          <span className="customer-sidebar-brand-icon">🏠</span>
          <span>HomeFix</span>
        </Link>

        <p className="customer-sidebar-label">CUSTOMER MENU</p>

        <nav className="customer-sidebar-nav">
          <a href="#customer-overview" className="customer-sidebar-link">
            <span className="customer-sidebar-icon">⌂</span>
            <span className="customer-sidebar-link-text">Dashboard</span>
          </a>

          <a href="#services" className="customer-sidebar-link">
            <span className="customer-sidebar-icon">🛠️</span>
            <span className="customer-sidebar-link-text">Services</span>
          </a>

          <a href="#my-bookings" className="customer-sidebar-link">
            <span className="customer-sidebar-icon">📅</span>
            <span className="customer-sidebar-link-text">My Bookings</span>
            <span className="customer-sidebar-badge">
              {bookings.length}
            </span>
          </a>

          <Link to="/booking-history" className="customer-sidebar-link">
            <span className="customer-sidebar-icon">📋</span>
            <span className="customer-sidebar-link-text">Booking History</span>
          </Link>

          <Link to="/profile" className="customer-sidebar-link">
            <span className="customer-sidebar-icon">👤</span>
            <span className="customer-sidebar-link-text">My Profile</span>
          </Link>

          <button
            type="button"
            className="customer-sidebar-link customer-sidebar-notifications"
            onClick={() => {
              setShowNotifications((current) => !current);
              fetchNotifications();
            }}
          >
            <span className="customer-sidebar-icon">🔔</span>
            <span className="customer-sidebar-link-text">Notifications</span>
            {unreadCount > 0 && (
              <span className="customer-sidebar-badge">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="sidebar-notification-panel">
              <div className="notification-heading">
                <h3>Notifications</h3>
                <button
                  type="button"
                  onClick={fetchNotifications}
                  disabled={notificationLoading}
                >
                  Refresh
                </button>
              </div>

              {notificationError && (
                <p className="notification-error">
                  {notificationError}
                </p>
              )}

              {notificationLoading ? (
                <p>Loading notifications...</p>
              ) : notifications.length === 0 ? (
                <p className="notification-empty">
                  No notifications yet.
                </p>
              ) : (
                notifications.map((item) => (
                  <article
                    key={item.id}
                    className={`notification-item ${
                      item.is_read ? "is-read" : "is-unread"
                    }`}
                  >
                    <strong>{item.title || "HomeFix Update"}</strong>
                    <p>{item.message}</p>

                    {item.created_at && (
                      <small>
                        {new Date(item.created_at).toLocaleString("en-IN")}
                      </small>
                    )}

                    {!item.is_read && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(item.id)}
                        disabled={readingNotificationId !== null}
                      >
                        {String(readingNotificationId) === String(item.id)
                          ? "Updating..."
                          : "Mark as read"}
                      </button>
                    )}
                  </article>
                ))
              )}
            </div>
          )}
        </nav>

        <div className="customer-sidebar-bottom">
          <div className="customer-sidebar-user">
            <span className="customer-sidebar-avatar">👤</span>
            <div>
              <strong>Customer</strong>
              <small>HomeFix Account</small>
            </div>
          </div>

          <button
            type="button"
            className="customer-sidebar-logout"
            onClick={handleLogout}
          >
            <span>↪</span>
            <span className="customer-sidebar-link-text">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main dashboard content */}
      <div className="customer-content">
        <main className="customer-main">
          <section id="customer-overview" className="customer-welcome">
            <div>
              <p className="welcome-label">CUSTOMER DASHBOARD</p>
              <h1>Welcome to HomeFix!</h1>
              <p>
                Book trusted home services and manage your bookings in one
                place.
              </p>
            </div>

            <Link to="/services" className="browse-services-btn">
              Browse Services
            </Link>
          </section>

          {error && (
            <div className="dashboard-error" role="alert">
              {error}
            </div>
          )}

          {!error && (
            <>
              <section className="customer-stats">
                <div className="stat-card">
                  <span>Total Bookings</span>
                  <h2>{bookings.length}</h2>
                </div>

                <div className="stat-card">
                  <span>Pending Bookings</span>
                  <h2>{pendingBookings}</h2>
                </div>

                <div className="stat-card">
                  <span>Active Bookings</span>
                  <h2>{activeBookings}</h2>
                </div>

                <div className="stat-card">
                  <span>Completed Bookings</span>
                  <h2>{completedBookings}</h2>
                </div>
              </section>

              <section id="services" className="customer-section">
                <div className="section-heading">
                  <div>
                    <h2>Available Services</h2>
                    <p>Choose a service for your home.</p>
                  </div>

                  <Link to="/services" className="view-all-link">
                    View All
                  </Link>
                </div>

                {services.length === 0 ? (
                  <p className="empty-state">
                    No services are available right now.
                  </p>
                ) : (
                  <div className="customer-services-grid">
                    {services.slice(0, 6).map((service) => {
                      const servicePrice = Number(service.price);

                      return (
                        <article
                          className="customer-service-card"
                          key={service.id}
                        >
                          <div className="service-card-icon">🛠️</div>
                          <h3>{service.name}</h3>
                          <p>
                            {service.description ||
                              "Professional home service"}
                          </p>

                          <div className="service-card-bottom">
                            <strong>
                              {Number.isFinite(servicePrice) &&
                              servicePrice > 0
                                ? `₹${servicePrice.toLocaleString("en-IN")}`
                                : "Price unavailable"}
                            </strong>

                            <Link
                              to={`/book-service/${service.id}`}
                              className="book-service-btn"
                            >
                              Book Now
                            </Link>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <section
                id="my-bookings"
                className="customer-section my-bookings-section"
              >
                <div className="section-heading">
                  <div>
                    <h2>My Bookings</h2>
                    <p>
                      Track, reschedule, view work photos, pay and review
                      bookings.
                    </p>
                  </div>

                  <Link to="/booking-history" className="view-all-link">
                    View Booking History
                  </Link>
                </div>

                {bookingMessage && (
                  <div className="dashboard-success" role="status">
                    {bookingMessage}
                  </div>
                )}

                {bookingError && (
                  <div className="dashboard-error" role="alert">
                    {bookingError}
                  </div>
                )}

                {paymentMessage && (
                  <div className="dashboard-success" role="status">
                    {paymentMessage}
                  </div>
                )}

                {paymentError && (
                  <div className="dashboard-error" role="alert">
                    {paymentError}
                  </div>
                )}

                {reviewMessage && (
                  <div className="dashboard-success" role="status">
                    {reviewMessage}
                  </div>
                )}

                {reviewError && (
                  <div className="dashboard-error" role="alert">
                    {reviewError}
                  </div>
                )}

                {bookings.length === 0 ? (
                  <div className="empty-state">
                    <h3>No bookings yet</h3>
                    <p>Book your first home service to see it here.</p>
                    <Link to="/services" className="browse-services-btn">
                      Explore Services
                    </Link>
                  </div>
                ) : (
                  <div className="customer-bookings-list">
                    {bookings.map((booking) => {
                      const canCancel = ["Pending", "Accepted"].includes(
                        booking.status
                      );

                      const isCancelling =
                        String(cancellingId) === String(booking.id);

                      const isRescheduling =
                        String(rescheduleBookingId) === String(booking.id);

                      const isCompleted = booking.status === "Completed";

                      const hasReviewed = reviewedBookingIds.includes(
                        String(booking.id)
                      );

                      const beforePhoto = getPhotoUrl(booking.before_photo);
                      const afterPhoto = getPhotoUrl(booking.after_photo);
                      const total = getEstimatedTotal(booking);

                      const paymentBusy =
                        String(paymentLoadingId) === String(booking.id);

                      return (
                        <article
                          className="customer-booking-card"
                          key={booking.id}
                        >
                          <div className="booking-card-top">
                            <div>
                              <h3>{getServiceName(booking)}</h3>
                              <p>Booking ID: #{booking.id}</p>
                            </div>

                            <span
                              className={`booking-status ${getStatusClass(
                                booking.status
                              )}`}
                            >
                              {booking.status || "Pending"}
                            </span>
                          </div>

                          <div className="booking-details-grid">
                            <div>
                              <span className="booking-detail-label">
                                Booking Date
                              </span>
                              <p>{booking.booking_date || "Not available"}</p>
                            </div>

                            <div>
                              <span className="booking-detail-label">
                                Time Slot
                              </span>
                              <p>
                                {TIME_SLOTS.find(
                                  (slot) =>
                                    slot.value === booking.time_slot
                                )?.label ||
                                  booking.time_slot ||
                                  "Not available"}
                              </p>
                            </div>

                            <div>
                              <span className="booking-detail-label">
                                Technician
                              </span>
                              <p>{getTechnicianName(booking)}</p>
                            </div>
                          </div>

                          <section className="technician-live-tracking">
                            <h4>📍 Track Your Technician</h4>
                            <p>
                              View your assigned technician's latest location.
                            </p>
                            <TechnicianMap bookingId={booking.id} />
                          </section>

                          <section className="customer-work-photos">
                            <div className="customer-work-photos-heading">
                              <h4>📸 Work Progress Photos</h4>
                              <p>
                                View photos uploaded by your technician.
                              </p>
                            </div>

                            {beforePhoto || afterPhoto ? (
                              <div className="customer-work-photo-grid">
                                {beforePhoto && (
                                  <div className="customer-work-photo-item">
                                    <h5>Before Service</h5>

                                    <button
                                      type="button"
                                      className="customer-photo-preview-btn"
                                      onClick={() =>
                                        setSelectedPhoto({
                                          url: beforePhoto,
                                          title: `Before Service — Booking #${booking.id}`,
                                        })
                                      }
                                    >
                                      <img
                                        src={beforePhoto}
                                        alt="Before service"
                                        className="customer-work-photo"
                                        loading="lazy"
                                        onError={(event) => {
                                          event.currentTarget.style.display =
                                            "none";
                                        }}
                                      />
                                    </button>

                                    <a
                                      href={beforePhoto}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="customer-photo-open-link"
                                    >
                                      Open photo
                                    </a>
                                  </div>
                                )}

                                {afterPhoto && (
                                  <div className="customer-work-photo-item">
                                    <h5>After Service</h5>

                                    <button
                                      type="button"
                                      className="customer-photo-preview-btn"
                                      onClick={() =>
                                        setSelectedPhoto({
                                          url: afterPhoto,
                                          title: `After Service — Booking #${booking.id}`,
                                        })
                                      }
                                    >
                                      <img
                                        src={afterPhoto}
                                        alt="After service"
                                        className="customer-work-photo"
                                        loading="lazy"
                                        onError={(event) => {
                                          event.currentTarget.style.display =
                                            "none";
                                        }}
                                      />
                                    </button>

                                    <a
                                      href={afterPhoto}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="customer-photo-open-link"
                                    >
                                      Open photo
                                    </a>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="customer-no-work-photos">
                                Work photos have not been uploaded yet.
                              </p>
                            )}
                          </section>

                          <div className="booking-price-details">
                            <h4>Booking Price Details</h4>

                            {getAdditionalWorks(booking).length ? (
                              <div className="additional-works-list">
                                <p>
                                  <strong>Additional Work:</strong>
                                </p>

                                {getAdditionalWorks(booking).map(
                                  (work, index) => {
                                    const price =
                                      getAdditionalWorkPrice(work);
                                    const numericPrice = Number(price);

                                    return (
                                      <p key={work?.id || index}>
                                        {getAdditionalWorkName(work)}
                                        {price !== null &&
                                          Number.isFinite(numericPrice) &&
                                          ` — ₹${numericPrice.toLocaleString(
                                            "en-IN"
                                          )}`}
                                      </p>
                                    );
                                  }
                                )}
                              </div>
                            ) : (
                              <p>No additional work selected.</p>
                            )}

                            {total !== null ? (
                              <p className="booking-estimated-total">
                                <strong>
                                  {isCompleted &&
                                  booking.final_total != null
                                    ? "Final Total: "
                                    : "Estimated Total: "}
                                  ₹
                                  {total.toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </strong>
                              </p>
                            ) : (
                              <p className="booking-amount-unavailable">
                                Amount not available. Please check the
                                service price in the backend.
                              </p>
                            )}

                            <div className="invoice-payment-actions">
                              <button
                                type="button"
                                className="download-invoice-btn"
                                onClick={() => downloadInvoice(booking)}
                              >
                                Download Invoice PDF
                              </button>

                              {!["Rejected", "Cancelled"].includes(
                                booking.status
                              ) && (
                                <button
                                  type="button"
                                  className="pay-booking-btn"
                                  onClick={() => {
                                    setPaymentBookingId(
                                      String(paymentBookingId) ===
                                        String(booking.id)
                                        ? null
                                        : booking.id
                                    );
                                    setPaymentError("");
                                    setPaymentMessage("");
                                    setPaymentMethod("razorpay");
                                  }}
                                >
                                  Pay / Payment Options
                                </button>
                              )}
                            </div>

                            {String(paymentBookingId) ===
                              String(booking.id) && (
                              <div className="payment-options-panel">
                                <h4>Choose Payment Method</h4>

                                <p className="payment-amount">
                                  Amount:{" "}
                                  <strong>
                                    {total === null
                                      ? "Not available"
                                      : `₹${total.toLocaleString("en-IN", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}`}
                                  </strong>
                                </p>

                                <label className="payment-method-option">
                                  <input
                                    type="radio"
                                    name={`payment-method-${booking.id}`}
                                    value="razorpay"
                                    checked={paymentMethod === "razorpay"}
                                    onChange={() =>
                                      setPaymentMethod("razorpay")
                                    }
                                  />
                                  UPI / Credit Card / Debit Card (Razorpay)
                                </label>

                                <label className="payment-method-option">
                                  <input
                                    type="radio"
                                    name={`payment-method-${booking.id}`}
                                    value="cash"
                                    checked={paymentMethod === "cash"}
                                    onChange={() =>
                                      setPaymentMethod("cash")
                                    }
                                  />
                                  Cash to technician
                                </label>

                                <button
                                  type="button"
                                  className="pay-booking-btn"
                                  disabled={
                                    paymentBusy || total === null || total <= 0
                                  }
                                  onClick={() => handlePayment(booking)}
                                >
                                  {paymentBusy
                                    ? "Starting payment..."
                                    : paymentMethod === "cash"
                                    ? "Confirm Cash Payment Plan"
                                    : "Continue to Secure Payment"}
                                </button>

                                <p className="payment-note">
                                  Online payment is not marked as paid until
                                  the backend verifies the Razorpay signature.
                                </p>
                              </div>
                            )}
                          </div>

                          {canCancel && (
                            <div className="booking-card-actions">
                              <button
                                type="button"
                                className="reschedule-booking-btn"
                                onClick={() => {
                                  if (isRescheduling) {
                                    setRescheduleBookingId(null);
                                    setRescheduleSlots([]);
                                  } else {
                                    openRescheduleForm(booking);
                                  }
                                }}
                                disabled={
                                  rescheduleLoading || cancellingId !== null
                                }
                              >
                                {isRescheduling
                                  ? "Close Reschedule"
                                  : "Reschedule"}
                              </button>

                              <button
                                type="button"
                                className="cancel-booking-btn"
                                onClick={() =>
                                  handleCancelBooking(booking.id)
                                }
                                disabled={
                                  cancellingId !== null || rescheduleLoading
                                }
                              >
                                {isCancelling
                                  ? "Cancelling..."
                                  : "Cancel Booking"}
                              </button>
                            </div>
                          )}

                          {isRescheduling && canCancel && (
                            <form
                              className="reschedule-form"
                              onSubmit={handleRescheduleBooking}
                            >
                              <h4>Reschedule Your Booking</h4>

                              <label htmlFor={`reschedule-date-${booking.id}`}>
                                New date
                              </label>

                              <input
                                id={`reschedule-date-${booking.id}`}
                                type="date"
                                min={minBookingDate}
                                value={rescheduleDate}
                                required
                                onChange={(event) => {
                                  const date = event.target.value;
                                  setRescheduleDate(date);
                                  setRescheduleSlot("");
                                  setRescheduleSlots([]);

                                  if (date) {
                                    fetchRescheduleSlots(booking.id, date);
                                  }
                                }}
                              />

                              <label htmlFor={`reschedule-slot-${booking.id}`}>
                                Available time slot
                              </label>

                              <select
                                id={`reschedule-slot-${booking.id}`}
                                value={rescheduleSlot}
                                required
                                disabled={
                                  !rescheduleDate ||
                                  rescheduleSlotsLoading ||
                                  !rescheduleSlots.length
                                }
                                onChange={(event) =>
                                  setRescheduleSlot(event.target.value)
                                }
                              >
                                <option value="">
                                  {rescheduleSlotsLoading
                                    ? "Loading available slots..."
                                    : !rescheduleDate
                                    ? "Select a date first"
                                    : !rescheduleSlots.length
                                    ? "No available slots"
                                    : "Select a time slot"}
                                </option>

                                {rescheduleSlots.map((slot) => (
                                  <option
                                    key={slot.value}
                                    value={slot.value}
                                  >
                                    {slot.label || slot.value}
                                  </option>
                                ))}
                              </select>

                              <div className="reschedule-form-actions">
                                <button
                                  type="submit"
                                  className="submit-reschedule-btn"
                                  disabled={
                                    rescheduleLoading ||
                                    rescheduleSlotsLoading ||
                                    !rescheduleDate ||
                                    !rescheduleSlot
                                  }
                                >
                                  {rescheduleLoading
                                    ? "Rescheduling..."
                                    : "Confirm Reschedule"}
                                </button>

                                <button
                                  type="button"
                                  className="cancel-review-btn"
                                  disabled={rescheduleLoading}
                                  onClick={() => {
                                    setRescheduleBookingId(null);
                                    setRescheduleSlots([]);
                                    setRescheduleDate("");
                                    setRescheduleSlot("");
                                    setBookingError("");
                                  }}
                                >
                                  Close
                                </button>
                              </div>
                            </form>
                          )}

                          {isCompleted && (
                            <div className="booking-review-section">
                              {hasReviewed ? (
                                <p className="review-submitted">
                                  ⭐ Review submitted
                                </p>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="rate-service-btn"
                                    onClick={() => {
                                      setReviewBookingId(booking.id);
                                      setRating(5);
                                      setComment("");
                                      setReviewError("");
                                      setReviewMessage("");
                                    }}
                                  >
                                    ⭐ Rate Service
                                  </button>

                                  {String(reviewBookingId) ===
                                    String(booking.id) && (
                                    <form
                                      className="service-review-form"
                                      onSubmit={handleSubmitReview}
                                    >
                                      <h4>
                                        Rate {getServiceName(booking)}
                                      </h4>

                                      <div
                                        className="rating-stars"
                                        role="group"
                                        aria-label="Choose a rating"
                                      >
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <button
                                            key={star}
                                            type="button"
                                            className={
                                              star <= rating
                                                ? "rating-star selected"
                                                : "rating-star"
                                            }
                                            onClick={() => setRating(star)}
                                            aria-label={`${star} stars`}
                                          >
                                            ★
                                          </button>
                                        ))}
                                      </div>

                                      <label htmlFor={`review-${booking.id}`}>
                                        Your review (optional)
                                      </label>

                                      <textarea
                                        id={`review-${booking.id}`}
                                        value={comment}
                                        onChange={(event) =>
                                          setComment(event.target.value)
                                        }
                                        rows={3}
                                        maxLength={1000}
                                        placeholder="Tell us about your experience"
                                      />

                                      <div className="review-form-actions">
                                        <button
                                          type="submit"
                                          className="submit-review-btn"
                                          disabled={reviewLoading}
                                        >
                                          {reviewLoading
                                            ? "Submitting..."
                                            : "Submit Review"}
                                        </button>

                                        <button
                                          type="button"
                                          className="cancel-review-btn"
                                          disabled={reviewLoading}
                                          onClick={() =>
                                            setReviewBookingId(null)
                                          }
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </form>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </main>

        {selectedPhoto && (
          <div
            className="customer-photo-modal"
            role="dialog"
            aria-modal="true"
            aria-label={selectedPhoto.title}
            onClick={() => setSelectedPhoto(null)}
          >
            <div
              className="customer-photo-modal-content"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="customer-photo-modal-header">
                <h3>{selectedPhoto.title}</h3>

                <button
                  type="button"
                  className="customer-photo-modal-close"
                  onClick={() => setSelectedPhoto(null)}
                >
                  ✕
                </button>
              </div>

              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.title}
                className="customer-photo-modal-image"
              />

              <a
                href={selectedPhoto.url}
                target="_blank"
                rel="noreferrer"
                className="customer-photo-open-link"
              >
                Open full-size photo
              </a>
            </div>
          </div>
        )}

        <footer className="customer-footer">
          <p>
            © {new Date().getFullYear()} HomeFix. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default CustomerDashboard;
