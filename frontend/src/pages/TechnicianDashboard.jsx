import { useEffect, useState } from "react";
import TechnicianLocation from "../components/TechnicianLocation";
import { Link } from "react-router-dom";
import "../styles/TechnicianDashboard.css";

const API = "http://127.0.0.1:8000/api";
const BACKEND_URL = "http://127.0.0.1:8000";

function TechnicianDashboard() {
  const [technician, setTechnician] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const [selectedPhotos, setSelectedPhotos] = useState({});
  const [uploadingPhoto, setUploadingPhoto] = useState({});

  const [activeSection, setActiveSection] = useState("all");

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      try {
        setTechnician(JSON.parse(savedUser));
      } catch {
        setTechnician(null);
      }
    }

    fetchMyBookings();
  }, []);

  async function readResponse(response) {
    const text = await response.text();

    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        `Invalid server response (HTTP ${response.status}).`
      );
    }
  }

  function getToken() {
    return localStorage.getItem("token");
  }

  async function fetchMyBookings() {
    setLoading(true);
    setError("");

    const token = getToken();

    if (!token) {
      setBookings([]);
      setError("Login token missing. Please log out and log in again.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API}/bookings/technician/`, {
        method: "GET",
        headers: {
          Authorization: `Token ${token}`,
          Accept: "application/json",
        },
      });

      const data = await readResponse(response);

      if (response.status === 401) {
        throw new Error("Login session invalid. Please log in again.");
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.error ||
            data.message ||
            "Unable to load assigned bookings."
        );
      }

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.results)
        ? data.results
        : [];

      setBookings(list);
    } catch (err) {
      setError(err.message || "Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  }

  async function updateBookingStatus(bookingId, newStatus) {
    const token = getToken();

    if (!token) {
      setError("Login token missing. Please log in again.");
      return;
    }

    setUpdatingId(bookingId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API}/bookings/technician/${bookingId}/status/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await readResponse(response);

      if (response.status === 401) {
        throw new Error("Login session invalid. Please log in again.");
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.error ||
            data.message ||
            "Unable to update booking status."
        );
      }

      setMessage(
        data.message ||
          `Booking ${newStatus.toLowerCase()} successfully.`
      );

      await fetchMyBookings();
    } catch (err) {
      setError(err.message || "Unable to update booking status.");
    } finally {
      setUpdatingId(null);
    }
  }

  function handlePhotoSelect(bookingId, photoType, file) {
    setSelectedPhotos((previous) => ({
      ...previous,
      [bookingId]: {
        ...previous[bookingId],
        [photoType]: file,
      },
    }));

    setError("");
    setMessage("");
  }

  function getPhotoUrl(photo) {
    if (!photo || typeof photo !== "string") return "";

    if (photo.startsWith("http://") || photo.startsWith("https://")) {
      return photo;
    }

    return `${BACKEND_URL}${photo.startsWith("/") ? "" : "/"}${photo}`;
  }

  async function uploadBookingPhoto(bookingId, photoType) {
    const token = getToken();
    const file = selectedPhotos[bookingId]?.[photoType];

    if (!token) {
      setError("Login token missing. Please log in again.");
      return;
    }

    if (!file) {
      setError(
        `Please select a ${photoType.replace("_", " ")} before uploading.`
      );
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be 5 MB or less.");
      return;
    }

    const uploadKey = `${bookingId}-${photoType}`;

    setError("");
    setMessage("");

    setUploadingPhoto((previous) => ({
      ...previous,
      [uploadKey]: true,
    }));

    try {
      const formData = new FormData();
      formData.append(photoType, file);

      const response = await fetch(
        `${API}/bookings/technician/${bookingId}/photos/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Token ${token}`,
            Accept: "application/json",
          },
          body: formData,
        }
      );

      const data = await readResponse(response);

      if (response.status === 401) {
        throw new Error("Login session invalid. Please log in again.");
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.error ||
            data.message ||
            "Unable to upload photo."
        );
      }

      setMessage(data.message || "Photo uploaded successfully.");

      setSelectedPhotos((previous) => ({
        ...previous,
        [bookingId]: {
          ...previous[bookingId],
          [photoType]: null,
        },
      }));

      await fetchMyBookings();
    } catch (err) {
      setError(err.message || "Unable to upload photo.");
    } finally {
      setUploadingPhoto((previous) => ({
        ...previous,
        [uploadKey]: false,
      }));
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    window.location.href = "/login";
  }

  function getStatusClass(status) {
    switch ((status || "").toLowerCase()) {
      case "accepted":
        return "tech-status-accepted";
      case "completed":
        return "tech-status-completed";
      case "rejected":
      case "cancelled":
        return "tech-status-cancelled";
      default:
        return "tech-status-pending";
    }
  }

  function getServiceName(booking) {
    if (booking.service_name) return booking.service_name;

    if (booking.service && typeof booking.service === "object") {
      return booking.service.name || "Home Service";
    }

    return "Home Service";
  }

  function getCustomerName(booking) {
    if (booking.customer_name) return booking.customer_name;

    if (booking.customer && typeof booking.customer === "object") {
      return (
        booking.customer.first_name ||
        booking.customer.username ||
        booking.customer.email ||
        "Customer"
      );
    }

    return "Customer";
  }

  function getAdditionalWorks(booking) {
    const details = booking.additional_work_details;

    if (Array.isArray(details) && details.length > 0) {
      return details;
    }

    const works = booking.additional_works;

    if (Array.isArray(works)) {
      return works.map((work) =>
        typeof work === "object" && work !== null
          ? work
          : { id: work }
      );
    }

    return [];
  }

  function getAdditionalWorkName(work) {
    if (typeof work === "string" || typeof work === "number") {
      return `Additional Work #${work}`;
    }

    return (
      work?.name ||
      work?.service_name ||
      work?.title ||
      `Additional Work #${work?.id ?? ""}`
    );
  }

  function getAdditionalWorkPrice(work) {
    if (!work || typeof work !== "object") return null;

    const price = work.estimated_price ?? work.price ?? work.amount ?? null;

    if (price === null || price === "") return null;

    const number = Number(price);

    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  function getServicePrice(booking) {
    const price = booking.service_price ?? booking.service?.price;

    if (price === null || price === undefined || price === "") {
      return null;
    }

    const number = Number(price);

    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  function getEstimatedTotal(booking) {
    const servicePrice = getServicePrice(booking);
    const additionalWorks = getAdditionalWorks(booking);

    const apiTotal =
      booking.estimated_total ??
      booking.total_price ??
      booking.total_amount ??
      booking.estimated_price;

    const numericApiTotal =
      apiTotal !== null && apiTotal !== undefined && apiTotal !== ""
        ? Number(apiTotal)
        : null;

    if (
      numericApiTotal !== null &&
      Number.isFinite(numericApiTotal) &&
      numericApiTotal > 0
    ) {
      return numericApiTotal;
    }

    if (servicePrice !== null) {
      let total = servicePrice;

      for (const work of additionalWorks) {
        const price = getAdditionalWorkPrice(work);

        if (price === null) {
          return numericApiTotal === 0 && additionalWorks.length === 0
            ? servicePrice
            : null;
        }

        total += price;
      }

      return total;
    }

    if (numericApiTotal === 0) return 0;

    return null;
  }

  function formatMoney(value) {
    if (value === null || value === undefined || value === "") {
      return "Not available";
    }

    const amount = Number(value);

    if (!Number.isFinite(amount)) return "Not available";

    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  const pendingCount = bookings.filter(
    (booking) => (booking.status || "").toLowerCase() === "pending"
  ).length;

  const acceptedCount = bookings.filter(
    (booking) => (booking.status || "").toLowerCase() === "accepted"
  ).length;

  const completedCount = bookings.filter(
    (booking) => (booking.status || "").toLowerCase() === "completed"
  ).length;

  const technicianName =
    technician?.name ||
    technician?.username ||
    technician?.first_name ||
    "Technician";

  // Sidebar booking filters
  const filteredBookings = bookings.filter((booking) => {
    const status = (booking.status || "").toLowerCase();

    if (activeSection === "pending") return status === "pending";
    if (activeSection === "accepted") return status === "accepted";
    if (activeSection === "completed") return status === "completed";

    return true;
  });

  function selectSection(section) {
    setActiveSection(section);

    document
      .getElementById("tech-bookings")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="technician-dashboard tech-sidebar-layout">
      {/* LEFT SIDEBAR */}
      <aside className="tech-sidebar">
        <Link to="/technician-dashboard" className="tech-sidebar-brand">
          <span className="tech-sidebar-brand-icon">🔧</span>
          <span>HomeFix</span>
        </Link>

        <p className="tech-sidebar-label">WORKSPACE</p>

        <nav className="tech-sidebar-nav">
          <button
            type="button"
            className={`tech-sidebar-link ${
              activeSection === "all" ? "active" : ""
            }`}
            onClick={() => {
              setActiveSection("all");
              document
                .getElementById("tech-overview")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <span>🏠</span>
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className={`tech-sidebar-link ${
              activeSection === "all" ? "active" : ""
            }`}
            onClick={() => selectSection("all")}
          >
            <span>📋</span>
            <span>My Bookings</span>
            <span className="tech-nav-count">{bookings.length}</span>
          </button>

          <button
            type="button"
            className={`tech-sidebar-link ${
              activeSection === "pending" ? "active" : ""
            }`}
            onClick={() => selectSection("pending")}
          >
            <span>⏳</span>
            <span>Pending</span>
            <span className="tech-nav-count">{pendingCount}</span>
          </button>

          <button
            type="button"
            className={`tech-sidebar-link ${
              activeSection === "accepted" ? "active" : ""
            }`}
            onClick={() => selectSection("accepted")}
          >
            <span>🛠️</span>
            <span>Accepted</span>
            <span className="tech-nav-count">{acceptedCount}</span>
          </button>

          <button
            type="button"
            className={`tech-sidebar-link ${
              activeSection === "completed" ? "active" : ""
            }`}
            onClick={() => selectSection("completed")}
          >
            <span>✅</span>
            <span>Completed</span>
            <span className="tech-nav-count">{completedCount}</span>
          </button>
        </nav>

        <div className="tech-sidebar-bottom">
          <p className="tech-sidebar-label">ACCOUNT</p>

          <div className="tech-sidebar-profile">
            <div className="tech-sidebar-avatar">
              {technicianName.charAt(0).toUpperCase()}
            </div>

            <div className="tech-sidebar-profile-info">
              <strong>{technicianName}</strong>
              <small>Technician</small>
            </div>
          </div>

          <button
            type="button"
            className="tech-sidebar-logout"
            onClick={handleLogout}
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="tech-content">
        <header className="tech-header">
          <div className="tech-header-inner">
            <Link to="/technician-dashboard" className="tech-logo">
              HomeFix
            </Link>

            <TechnicianLocation />

            <div className="tech-header-actions">
              <button
                type="button"
                className="tech-refresh-btn"
                onClick={fetchMyBookings}
                disabled={loading}
              >
                {loading ? "Loading..." : "↻ Refresh"}
              </button>

              <button
                type="button"
                className="tech-logout-btn"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="tech-main">
          <section className="tech-hero" id="tech-overview">
            <div>
              <p className="tech-eyebrow">TECHNICIAN DASHBOARD</p>
              <h1>Welcome, {technicianName}!</h1>
              <p>
                Manage your assigned home service bookings and track your
                work progress.
              </p>
            </div>

            <div className="tech-hero-icon" aria-hidden="true">
              🛠️
            </div>
          </section>

          {error && (
            <div className="tech-alert tech-alert-error" role="alert">
              <span>{error}</span>
              <button type="button" onClick={fetchMyBookings}>
                Try Again
              </button>
            </div>
          )}

          {message && (
            <div className="tech-alert tech-alert-success" role="status">
              {message}
            </div>
          )}

          <section className="tech-stats">
            <article className="tech-stat-card">
              <div className="tech-stat-icon tech-icon-blue">▣</div>
              <p>Total Assigned</p>
              <h2>{bookings.length}</h2>
            </article>

            <article className="tech-stat-card">
              <div className="tech-stat-icon tech-icon-orange">◷</div>
              <p>Pending</p>
              <h2>{pendingCount}</h2>
            </article>

            <article className="tech-stat-card">
              <div className="tech-stat-icon tech-icon-purple">✓</div>
              <p>Accepted</p>
              <h2>{acceptedCount}</h2>
            </article>

            <article className="tech-stat-card">
              <div className="tech-stat-icon tech-icon-green">★</div>
              <p>Completed</p>
              <h2>{completedCount}</h2>
            </article>
          </section>

          <section className="tech-work-section" id="tech-bookings">
            <div className="tech-section-heading">
              <div>
                <h2>
                  {activeSection === "pending"
                    ? "Pending Bookings"
                    : activeSection === "accepted"
                    ? "Accepted Bookings"
                    : activeSection === "completed"
                    ? "Completed Bookings"
                    : "My Assigned Bookings"}
                </h2>

                <p>View customer details and update your work status.</p>
              </div>

              <span className="tech-booking-count">
                {filteredBookings.length} booking
                {filteredBookings.length !== 1 ? "s" : ""}
              </span>
            </div>

            {loading ? (
              <div className="tech-loading">
                <div className="tech-spinner" />
                <p>Loading your assigned bookings...</p>
              </div>
            ) : !error && filteredBookings.length === 0 ? (
              <div className="tech-empty">
                <div className="tech-empty-icon">📋</div>
                <h3>No bookings found</h3>
                <p>
                  {activeSection === "all"
                    ? "When the admin assigns a booking to you, it will appear here."
                    : `There are no ${activeSection} bookings at the moment.`}
                </p>

                {activeSection !== "all" && (
                  <button
                    type="button"
                    className="tech-refresh-btn"
                    onClick={() => setActiveSection("all")}
                  >
                    View All Bookings
                  </button>
                )}

                <button
                  type="button"
                  className="tech-refresh-btn"
                  onClick={fetchMyBookings}
                >
                  Refresh Bookings
                </button>
              </div>
            ) : (
              <div className="tech-booking-grid">
                {filteredBookings.map((booking) => {
                  const isUpdating =
                    String(updatingId) === String(booking.id);

                  const additionalWorks = getAdditionalWorks(booking);
                  const servicePrice = getServicePrice(booking);
                  const estimatedTotal = getEstimatedTotal(booking);

                  const missingWorkPrices = additionalWorks.some(
                    (work) => getAdditionalWorkPrice(work) === null
                  );

                  return (
                    <article
                      className="tech-booking-card"
                      key={booking.id}
                    >
                      <div className="tech-booking-top">
                        <div>
                          <span className="tech-booking-id">
                            BOOKING #{booking.id}
                          </span>
                          <h3>{getServiceName(booking)}</h3>
                        </div>

                        <span
                          className={`tech-status ${getStatusClass(
                            booking.status
                          )}`}
                        >
                          {booking.status || "Pending"}
                        </span>
                      </div>

                      <div className="tech-detail-list">
                        <div className="tech-detail-row">
                          <span className="tech-detail-icon">👤</span>
                          <div>
                            <small>Customer</small>
                            <p>{getCustomerName(booking)}</p>
                          </div>
                        </div>

                        <div className="tech-detail-row">
                          <span className="tech-detail-icon">📞</span>
                          <div>
                            <small>Phone Number</small>
                            <p>{booking.phone || "Not provided"}</p>
                          </div>
                        </div>

                        <div className="tech-detail-row">
                          <span className="tech-detail-icon">📍</span>
                          <div>
                            <small>Service Address</small>
                            <p>{booking.address || "Not provided"}</p>
                          </div>
                        </div>

                        <div className="tech-detail-row">
                          <span className="tech-detail-icon">📅</span>
                          <div>
                            <small>Booking Date</small>
                            <p>{booking.booking_date || "Not provided"}</p>
                          </div>
                        </div>

                        <div className="tech-detail-row">
                          <span className="tech-detail-icon">🕒</span>
                          <div>
                            <small>Time Slot</small>
                            <p>{booking.time_slot || "Not provided"}</p>
                          </div>
                        </div>
                      </div>

                      {booking.issue_description && (
                        <div className="tech-issue-box">
                          <strong>Issue Description</strong>
                          <p>{booking.issue_description}</p>
                        </div>
                      )}

                      {/* BEFORE AND AFTER PHOTOS */}
                      <div className="tech-photos-section">
                        <h4>Before &amp; After Photos</h4>
                        <p className="tech-photos-description">
                          Upload photos to document your service work.
                        </p>

                        <div className="tech-photo-grid">
                          {/* BEFORE PHOTO */}
                          <div className="tech-photo-item">
                            <strong>Before Photo</strong>

                            {booking.before_photo ? (
                              <a
                                href={getPhotoUrl(booking.before_photo)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <img
                                  className="tech-work-photo"
                                  src={getPhotoUrl(booking.before_photo)}
                                  alt={`Before work for booking ${booking.id}`}
                                />
                              </a>
                            ) : (
                              <p className="tech-photo-empty">
                                No before photo uploaded.
                              </p>
                            )}

                            {["Accepted", "Completed"].includes(
                              booking.status
                            ) ? (
                              <>
                                <input
                                  type="file"
                                  accept="image/*"
                                  aria-label={`Select before photo for booking ${booking.id}`}
                                  onChange={(event) =>
                                    handlePhotoSelect(
                                      booking.id,
                                      "before_photo",
                                      event.target.files?.[0] || null
                                    )
                                  }
                                />

                                <button
                                  type="button"
                                  className="tech-photo-upload-btn"
                                  onClick={() =>
                                    uploadBookingPhoto(
                                      booking.id,
                                      "before_photo"
                                    )
                                  }
                                  disabled={
                                    !selectedPhotos[booking.id]
                                      ?.before_photo ||
                                    Boolean(
                                      uploadingPhoto[
                                        `${booking.id}-before_photo`
                                      ]
                                    )
                                  }
                                >
                                  {uploadingPhoto[
                                    `${booking.id}-before_photo`
                                  ]
                                    ? "Uploading..."
                                    : "Upload Before Photo"}
                                </button>
                              </>
                            ) : (
                              <p className="tech-photo-hint">
                                Accept the booking to upload a before photo.
                              </p>
                            )}
                          </div>

                          {/* AFTER PHOTO */}
                          <div className="tech-photo-item">
                            <strong>After Photo</strong>

                            {booking.after_photo ? (
                              <a
                                href={getPhotoUrl(booking.after_photo)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <img
                                  className="tech-work-photo"
                                  src={getPhotoUrl(booking.after_photo)}
                                  alt={`After work for booking ${booking.id}`}
                                />
                              </a>
                            ) : (
                              <p className="tech-photo-empty">
                                No after photo uploaded.
                              </p>
                            )}

                            {booking.status === "Completed" ? (
                              <>
                                <input
                                  type="file"
                                  accept="image/*"
                                  aria-label={`Select after photo for booking ${booking.id}`}
                                  onChange={(event) =>
                                    handlePhotoSelect(
                                      booking.id,
                                      "after_photo",
                                      event.target.files?.[0] || null
                                    )
                                  }
                                />

                                <button
                                  type="button"
                                  className="tech-photo-upload-btn"
                                  onClick={() =>
                                    uploadBookingPhoto(
                                      booking.id,
                                      "after_photo"
                                    )
                                  }
                                  disabled={
                                    !selectedPhotos[booking.id]
                                      ?.after_photo ||
                                    Boolean(
                                      uploadingPhoto[
                                        `${booking.id}-after_photo`
                                      ]
                                    )
                                  }
                                >
                                  {uploadingPhoto[
                                    `${booking.id}-after_photo`
                                  ]
                                    ? "Uploading..."
                                    : "Upload After Photo"}
                                </button>
                              </>
                            ) : (
                              <p className="tech-photo-hint">
                                Complete the booking to upload an after photo.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* PRICE DETAILS */}
                      <div className="tech-price-details">
                        <h4>Booking Price Details</h4>

                        <p>
                          <strong>Service Price:</strong>
                          <span>{formatMoney(servicePrice)}</span>
                        </p>

                        <div className="tech-additional-works">
                          <strong>Additional Works:</strong>

                          {additionalWorks.length > 0 ? (
                            additionalWorks.map((work, index) => {
                              const price = getAdditionalWorkPrice(work);

                              return (
                                <p key={work?.id ?? index}>
                                  <span>{getAdditionalWorkName(work)}</span>
                                  {price !== null && (
                                    <span>{formatMoney(price)}</span>
                                  )}
                                </p>
                              );
                            })
                          ) : (
                            <p>No additional work selected.</p>
                          )}
                        </div>

                        <p className="tech-estimated-total">
                          <strong>Estimated Total:</strong>
                          <strong>{formatMoney(estimatedTotal)}</strong>
                        </p>

                        {booking.final_total !== null &&
                          booking.final_total !== undefined && (
                            <p>
                              <strong>Final Total:</strong>
                              <span>{formatMoney(booking.final_total)}</span>
                            </p>
                          )}

                        {missingWorkPrices && (
                          <p className="tech-price-hint">
                            Additional work prices are missing from the API.
                            Please check the backend serializer.
                          </p>
                        )}

                        {estimatedTotal === null && (
                          <p className="tech-price-hint">
                            Unable to calculate total because some price
                            details are missing from the API response.
                          </p>
                        )}
                      </div>

                      {/* BOOKING ACTIONS */}
                      <div className="tech-booking-actions">
                        {booking.status === "Pending" && (
                          <button
                            type="button"
                            className="tech-accept-btn"
                            onClick={() =>
                              updateBookingStatus(booking.id, "Accepted")
                            }
                            disabled={updatingId !== null}
                          >
                            {isUpdating ? "Updating..." : "✓ Accept Booking"}
                          </button>
                        )}

                        {booking.status === "Accepted" && (
                          <button
                            type="button"
                            className="tech-complete-btn"
                            onClick={() =>
                              updateBookingStatus(booking.id, "Completed")
                            }
                            disabled={updatingId !== null}
                          >
                            {isUpdating
                              ? "Updating..."
                              : "✓ Mark as Completed"}
                          </button>
                        )}

                        {booking.status === "Completed" && (
                          <p className="tech-completed-note">
                            ✓ Work completed successfully
                          </p>
                        )}

                        {["Rejected", "Cancelled"].includes(
                          booking.status
                        ) && (
                          <p className="tech-cancelled-note">
                            This booking is no longer active.
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </main>

        <footer className="tech-footer">
          <p>
            © {new Date().getFullYear()} HomeFix. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default TechnicianDashboard;