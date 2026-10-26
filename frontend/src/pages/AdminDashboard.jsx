
import { useEffect, useState, useCallback } from "react";
import AddTechnician from "../components/AddTechnician";
import "../styles/AdminDashboard.css";

const API = "http://127.0.0.1:8000";

async function readApiResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid server response (HTTP ${response.status}).`);
  }
}

const getList = (data) =>
  Array.isArray(data)
    ? data
    : Array.isArray(data?.results)
    ? data.results
    : [];

function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnicians, setSelectedTechnicians] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingTechnician, setUpdatingTechnician] = useState(null);
  const [updatingBooking, setUpdatingBooking] = useState(null);
  const [showAddTechnician, setShowAddTechnician] = useState(false);

  // Services
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState("");
  const [serviceMessage, setServiceMessage] = useState("");
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceAvailable, setServiceAvailable] = useState(true);
  const [savingService, setSavingService] = useState(false);

  // Booking filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");

  // Support tickets
  const [supportTickets, setSupportTickets] = useState([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportError, setSupportError] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [updatingTicket, setUpdatingTicket] = useState(null);
  const [ticketReplies, setTicketReplies] = useState({});
  const [ticketStatuses, setTicketStatuses] = useState({});

  const token = localStorage.getItem("token");

  const headers = useCallback(
    (extra = {}) => ({
      Authorization: `Token ${token}`,
      Accept: "application/json",
      ...extra,
    }),
    [token]
  );

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    if (!token) {
      setError("Please log in with your admin account.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API}/api/bookings/`, {
        headers: headers(),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.detail || data.error || "Unable to load bookings.");
      }

      setBookings(getList(data));
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load bookings.");
    } finally {
      setLoading(false);
    }
  }, [token, headers]);

  // Fetch technicians
  const fetchTechnicians = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API}/api/technicians/`, {
        headers: headers(),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.detail || data.error || "Unable to load technicians.");
      }

      const list = getList(data);
      setTechnicians(list);

      const availableIds = new Set(
        list
          .filter((technician) => technician.is_available === true)
          .map((technician) => Number(technician.id))
      );

      setSelectedTechnicians((previous) => {
        const updated = { ...previous };

        Object.keys(updated).forEach((bookingId) => {
          if (!availableIds.has(Number(updated[bookingId]))) {
            delete updated[bookingId];
          }
        });

        return updated;
      });
    } catch (err) {
      setError(err.message || "Unable to load technicians.");
    }
  }, [token, headers]);

  // Fetch services
  const fetchServices = useCallback(async () => {
    if (!token) return;

    setServicesLoading(true);
    setServicesError("");

    try {
      const response = await fetch(`${API}/api/services/`, {
        headers: headers(),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.detail || data.error || "Unable to load services.");
      }

      setServices(getList(data));
    } catch (err) {
      setServicesError(
        `${err.message || "Unable to load services."} Check your Django services URL.`
      );
    } finally {
      setServicesLoading(false);
    }
  }, [token, headers]);

  // Fetch support tickets
  const fetchSupportTickets = useCallback(async () => {
    if (!token) return;

    setSupportLoading(true);
    setSupportError("");

    try {
      const response = await fetch(`${API}/api/support/`, {
        headers: headers(),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.detail || data.error || "Unable to load support tickets.");
      }

      const list = getList(data);
      setSupportTickets(list);

      setTicketStatuses((previous) => {
        const next = { ...previous };

        list.forEach((ticket) => {
          next[ticket.id] = previous[ticket.id] ?? ticket.status ?? "open";
        });

        return next;
      });

      setTicketReplies((previous) => {
        const next = { ...previous };

        list.forEach((ticket) => {
          next[ticket.id] = previous[ticket.id] ?? ticket.admin_reply ?? "";
        });

        return next;
      });
    } catch (err) {
      setSupportError(err.message || "Unable to load support tickets.");
    } finally {
      setSupportLoading(false);
    }
  }, [token, headers]);

  // Load dashboard data
  useEffect(() => {
    fetchBookings();
    fetchTechnicians();
    fetchServices();
    fetchSupportTickets();
  }, [fetchBookings, fetchTechnicians, fetchServices, fetchSupportTickets]);

  // Refresh dashboard
  async function refreshDashboard() {
    setLoading(true);

    await Promise.all([
      fetchBookings(),
      fetchTechnicians(),
      fetchServices(),
      fetchSupportTickets(),
    ]);
  }

  // Update booking status
  async function updateStatus(bookingId, newStatus) {
    if (!token) return alert("Please log in again.");

    setUpdatingBooking(bookingId);

    try {
      const response = await fetch(
        `${API}/api/bookings/${bookingId}/status/`,
        {
          method: "PATCH",
          headers: headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.detail || data.error || "Booking update failed.");
      }

      alert(data.message || "Booking status updated.");
      await fetchBookings();
    } catch (err) {
      alert(err.message || "Unable to update booking.");
    } finally {
      setUpdatingBooking(null);
    }
  }

  // Assign technician
  async function assignTechnician(bookingId) {
    if (!token) return alert("Please log in again.");

    const technicianId = Number(selectedTechnicians[bookingId]);

    if (!technicianId) {
      return alert("Please select an available technician.");
    }

    const technician = technicians.find(
      (item) => Number(item.id) === technicianId
    );

    if (!technician || technician.is_available !== true) {
      alert("This technician is unavailable.");
      await fetchTechnicians();
      return;
    }

    setUpdatingBooking(bookingId);

    try {
      const response = await fetch(
        `${API}/api/bookings/${bookingId}/assign-technician/`,
        {
          method: "PATCH",
          headers: headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({ assigned_technician: technicianId }),
        }
      );

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.detail || data.error || "Assignment failed.");
      }

      alert(data.message || "Technician assigned.");

      await Promise.all([fetchBookings(), fetchTechnicians()]);
    } catch (err) {
      alert(err.message || "Unable to assign technician.");
    } finally {
      setUpdatingBooking(null);
    }
  }

  // Toggle technician availability
  async function toggleAvailability(technician) {
    if (!token || updatingTechnician !== null) return;

    const newAvailability = !technician.is_available;
    setUpdatingTechnician(technician.id);

    try {
      const response = await fetch(
        `${API}/api/technicians/${technician.id}/availability/`,
        {
          method: "PATCH",
          headers: headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({ is_available: newAvailability }),
        }
      );

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          data.detail || data.error || "Availability update failed."
        );
      }

      await fetchTechnicians();

      alert(
        newAvailability
          ? "Technician is available."
          : "Technician is unavailable."
      );
    } catch (err) {
      alert(err.message || "Unable to update availability.");
    } finally {
      setUpdatingTechnician(null);
    }
  }

  // Get technician name
  function getTechnicianName(id) {
    const technician = technicians.find(
      (item) => Number(item.id) === Number(id)
    );

    return technician
      ? `${technician.username} (${technician.specialization})`
      : "Not assigned";
  }

  // Logout
  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    window.location.href = "/login";
  }

  // Reset service form
  function resetServiceForm() {
    setEditingServiceId(null);
    setServiceName("");
    setServiceDescription("");
    setServicePrice("");
    setServiceAvailable(true);
    setShowServiceForm(false);
    setServiceMessage("");
  }

  // Edit service
  function editService(service) {
    setEditingServiceId(service.id);
    setServiceName(service.name || service.title || "");
    setServiceDescription(service.description || "");
    setServicePrice(service.price ?? "");
    setServiceAvailable(
      service.is_available ?? service.available ?? true
    );

    setShowServiceForm(true);
    setServiceMessage("");

    document
      .getElementById("services-section")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  // Add or update service
  async function saveService(event) {
    event.preventDefault();

    if (
      !serviceName.trim() ||
      servicePrice === "" ||
      Number(servicePrice) < 0
    ) {
      setServiceMessage("Enter a service name and valid price.");
      return;
    }

    setSavingService(true);
    setServiceMessage("");

    const payload = {
      name: serviceName.trim(),
      description: serviceDescription.trim(),
      price: Number(servicePrice),
      is_available: serviceAvailable,
    };

    try {
      const url = editingServiceId
        ? `${API}/api/services/${editingServiceId}/`
        : `${API}/api/services/`;

      const response = await fetch(url, {
        method: editingServiceId ? "PATCH" : "POST",
        headers: headers({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        const detail =
          data.detail ||
          data.error ||
          Object.entries(data)
            .map(([key, value]) =>
              `${key}: ${Array.isArray(value) ? value.join(", ") : value}`
            )
            .join(" | ");

        throw new Error(detail || "Unable to save service.");
      }

      setServiceMessage(
        editingServiceId
          ? "Service updated successfully."
          : "Service added successfully."
      );

      resetServiceForm();
      await fetchServices();
    } catch (err) {
      setServiceMessage(err.message || "Unable to save service.");
    } finally {
      setSavingService(false);
    }
  }

  // Delete service
  async function deleteService(service) {
    const name = service.name || service.title || `Service #${service.id}`;

    if (!window.confirm(`Delete "${name}"?`)) return;

    try {
      const response = await fetch(`${API}/api/services/${service.id}/`, {
        method: "DELETE",
        headers: headers(),
      });

      if (!response.ok) {
        const data = await readApiResponse(response);
        throw new Error(data.detail || data.error || "Unable to delete service.");
      }

      setServiceMessage("Service deleted successfully.");
      await fetchServices();
    } catch (err) {
      setServiceMessage(
        `${err.message || "Delete failed."} If bookings use this service, make it unavailable instead.`
      );
    }
  }

  // Toggle service availability
  async function toggleServiceAvailability(service) {
    const current = service.is_available ?? service.available ?? true;

    try {
      const response = await fetch(`${API}/api/services/${service.id}/`, {
        method: "PATCH",
        headers: headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({ is_available: !current }),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          data.detail || data.error || "Availability update failed."
        );
      }

      setServiceMessage("Service availability updated.");
      await fetchServices();
    } catch (err) {
      setServiceMessage(err.message || "Unable to update availability.");
    }
  }

  // Update support ticket
  async function updateSupportTicket(ticketId) {
    if (!token) {
      setSupportError("Please log in with your admin account.");
      return;
    }

    setUpdatingTicket(ticketId);
    setSupportError("");
    setSupportMessage("");

    try {
      const response = await fetch(`${API}/api/support/${ticketId}/`, {
        method: "PATCH",
        headers: headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          status: ticketStatuses[ticketId],
          admin_reply: ticketReplies[ticketId] || "",
        }),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        const detail =
          data.detail ||
          data.error ||
          Object.entries(data)
            .map(([key, value]) =>
              `${key}: ${Array.isArray(value) ? value.join(", ") : value}`
            )
            .join(" | ");

        throw new Error(detail || "Unable to update support ticket.");
      }

      setSupportTickets((previous) =>
        previous.map((ticket) =>
          ticket.id === ticketId ? { ...ticket, ...data } : ticket
        )
      );

      setSupportMessage(`Ticket #${ticketId} updated successfully.`);
    } catch (err) {
      setSupportError(err.message || "Unable to update support ticket.");
    } finally {
      setUpdatingTicket(null);
    }
  }

  // Filter bookings
  const filteredBookings = bookings.filter((booking) => {
    const search = searchTerm.trim().toLowerCase();

    const technicianName = booking.assigned_technician
      ? getTechnicianName(booking.assigned_technician)
      : "";

    const searchableText = [
      booking.id,
      booking.service_name,
      booking.service,
      booking.customer_name,
      booking.phone,
      booking.address,
      booking.issue_description,
      technicianName,
    ]
      .filter((value) => value !== null && value !== undefined)
      .join(" ")
      .toLowerCase();

    return (
      (search === "" || searchableText.includes(search)) &&
      (statusFilter === "All" || booking.status === statusFilter) &&
      (dateFilter === "" || booking.booking_date === dateFilter)
    );
  });

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("All");
    setDateFilter("");
  }

  return (
    <div className="admin-layout">
      {/* LEFT SIDEBAR */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">H</span>
          <div>
            <h2>HomeFix</h2>
            <p>Admin Panel</p>
          </div>
        </div>

        <p className="sidebar-label">MAIN MENU</p>

        <nav className="sidebar-nav">
          <a href="#admin-overview" className="sidebar-link">
            <span>▦</span> Dashboard
          </a>
          <a href="#all-bookings" className="sidebar-link">
            <span>▤</span> All Bookings
          </a>
          <a href="#technicians-section" className="sidebar-link">
            <span>♙</span> Technicians
          </a>
          <a href="#services-section" className="sidebar-link">
            <span>⚙</span> Services
          </a>
          <a href="#support-tickets" className="sidebar-link">
            <span>✉</span> Support Tickets
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="admin-profile">
            <div className="admin-avatar">A</div>
            <div>
              <strong>Administrator</strong>
              <p>HomeFix Admin</p>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
          >
            ↪ Logout
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT */}
      <main className="admin-main">
        <div className="admin-page">
          {/* Header */}
          <header className="admin-header" id="admin-overview">
            <div>
              <p className="admin-breadcrumb">Home / Dashboard</p>
              <h1>HomeFix Admin</h1>
              <p>Manage customer bookings, services, technicians and support tickets.</p>
            </div>

            <div className="admin-header-actions">
              <button
                type="button"
                className="refresh-button"
                onClick={refreshDashboard}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "↻ Refresh"}
              </button>
              <button
                type="button"
                className="reject-button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </header>

          {/* General error */}
          {error && (
            <div className="admin-error" role="alert">
              <p>{error}</p>
              <button type="button" onClick={refreshDashboard}>
                Try Again
              </button>
            </div>
          )}

          {/* Add Technician */}
          <section className="admin-bookings">
            <div className="admin-section-heading">
              <div>
                <h2>Technician Management</h2>
                <p>Add a technician to your team.</p>
              </div>

              <button
                type="button"
                className="add-technician-toggle"
                onClick={() => setShowAddTechnician((previous) => !previous)}
              >
                {showAddTechnician ? "Close Form" : "+ Add Technician"}
              </button>
            </div>

            {showAddTechnician && (
              <div className="add-technician-form-wrapper">
                <AddTechnician
                  onTechnicianAdded={async () => {
                    await refreshDashboard();
                    setShowAddTechnician(false);
                  }}
                />
              </div>
            )}
          </section>

          {/* Booking Summary */}
          <section className="booking-summary">
            <div className="summary-card">
              <h3>Total Bookings</h3>
              <p>{bookings.length}</p>
            </div>
            <div className="summary-card">
              <h3>Pending</h3>
              <p>{bookings.filter((b) => b.status === "Pending").length}</p>
            </div>
            <div className="summary-card">
              <h3>Accepted</h3>
              <p>{bookings.filter((b) => b.status === "Accepted").length}</p>
            </div>
            <div className="summary-card">
              <h3>Completed</h3>
              <p>{bookings.filter((b) => b.status === "Completed").length}</p>
            </div>
          </section>

          {/* Services */}
          <section className="admin-bookings" id="services-section">
            <div className="admin-section-heading">
              <div>
                <h2>Manage Services ({services.length})</h2>
                <p>Add, edit and manage service availability.</p>
              </div>

              <button
                type="button"
                className="add-technician-toggle"
                onClick={() => {
                  if (showServiceForm && editingServiceId === null) {
                    resetServiceForm();
                  } else {
                    setEditingServiceId(null);
                    setServiceName("");
                    setServiceDescription("");
                    setServicePrice("");
                    setServiceAvailable(true);
                    setServiceMessage("");
                    setShowServiceForm(true);
                  }
                }}
              >
                + Add Service
              </button>
            </div>

            {serviceMessage && (
              <p className="service-message" role="status">{serviceMessage}</p>
            )}

            {servicesError && (
              <div className="admin-error" role="alert">
                <p>{servicesError}</p>
                <button type="button" onClick={fetchServices}>Retry Services</button>
              </div>
            )}

            {showServiceForm && (
              <form className="admin-service-form" onSubmit={saveService}>
                <h3>{editingServiceId ? "Edit Service" : "Add New Service"}</h3>

                <label>
                  Service Name *
                  <input
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    required
                    maxLength={120}
                    placeholder="e.g. Fan Repair"
                  />
                </label>

                <label>
                  Description
                  <textarea
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                    rows={3}
                    placeholder="Describe this service"
                  />
                </label>

                <label>
                  Price (₹) *
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    required
                    placeholder="299"
                  />
                </label>

                <label className="service-availability-label">
                  <input
                    type="checkbox"
                    checked={serviceAvailable}
                    onChange={(e) => setServiceAvailable(e.target.checked)}
                  />
                  Service is available
                </label>

                <div className="booking-actions">
                  <button type="submit" className="accept-button" disabled={savingService}>
                    {savingService ? "Saving..." : editingServiceId ? "Save Changes" : "Add Service"}
                  </button>
                  <button type="button" className="refresh-button" onClick={resetServiceForm}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {servicesLoading ? (
              <p>Loading services...</p>
            ) : services.length === 0 ? (
              !servicesError && <p>No services found. Add a service above.</p>
            ) : (
              <div className="admin-booking-list">
                {services.map((service) => {
                  const available = service.is_available ?? service.available ?? true;

                  return (
                    <article className="admin-booking-card" key={service.id}>
                      <div className="booking-card-top">
                        <h3>{service.name || service.title || `Service #${service.id}`}</h3>
                        <span className={`status-badge ${available ? "accepted" : "cancelled"}`}>
                          {available ? "Available" : "Unavailable"}
                        </span>
                      </div>

                      <p><strong>Description:</strong> {service.description || "No description"}</p>
                      <p><strong>Price:</strong> ₹{service.price ?? "Not set"}</p>

                      <div className="booking-actions">
                        <button type="button" className="accept-button" onClick={() => editService(service)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className={available ? "reject-button" : "accept-button"}
                          onClick={() => toggleServiceAvailability(service)}
                        >
                          {available ? "Make Unavailable" : "Make Available"}
                        </button>
                        <button type="button" className="reject-button" onClick={() => deleteService(service)}>
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Technicians */}
          <section className="admin-bookings" id="technicians-section">
            <h2>Technicians ({technicians.length})</h2>

            {technicians.length === 0 ? (
              <p>No technicians created yet.</p>
            ) : (
              <div className="admin-booking-list">
                {technicians.map((technician) => (
                  <article className="admin-booking-card" key={technician.id}>
                    <h3>{technician.username} — {technician.specialization}</h3>
                    <p><strong>Email:</strong> {technician.email || "Not provided"}</p>
                    <p><strong>Phone:</strong> {technician.phone || "Not provided"}</p>
                    <p>
                      <strong>Availability:</strong>{" "}
                      <span className={technician.is_available ? "availability-yes" : "availability-no"}>
                        {technician.is_available ? "Available" : "Unavailable"}
                      </span>
                    </p>

                    <button
                      type="button"
                      className={technician.is_available ? "reject-button" : "accept-button"}
                      disabled={updatingTechnician !== null}
                      onClick={() => toggleAvailability(technician)}
                    >
                      {updatingTechnician === technician.id
                        ? "Updating..."
                        : technician.is_available
                        ? "Make Unavailable"
                        : "Make Available"}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Support Tickets */}
          <section className="admin-bookings" id="support-tickets">
            <div className="admin-section-heading">
              <div>
                <h2>Support Tickets ({supportTickets.length})</h2>
                <p>Reply to customers and update ticket status.</p>
              </div>

              <button
                type="button"
                className="refresh-button"
                onClick={fetchSupportTickets}
                disabled={supportLoading}
              >
                {supportLoading ? "Loading..." : "↻ Refresh Tickets"}
              </button>
            </div>

            {supportMessage && (
              <p className="service-message" role="status">{supportMessage}</p>
            )}

            {supportError && (
              <div className="admin-error" role="alert">
                <p>{supportError}</p>
                <button type="button" onClick={fetchSupportTickets}>Retry</button>
              </div>
            )}

            {supportLoading && <p>Loading support tickets...</p>}

            {!supportLoading && supportTickets.length === 0 && !supportError && (
              <p>No support tickets found.</p>
            )}

            <div className="admin-booking-list">
              {supportTickets.map((ticket) => {
                const status = ticketStatuses[ticket.id] || ticket.status || "open";

                const statusClass =
                  status === "resolved" || status === "closed"
                    ? "accepted"
                    : status === "in_progress"
                    ? "pending"
                    : "cancelled";

                const displayStatus = status
                  .replace("_", " ")
                  .replace(/\b\w/g, (letter) => letter.toUpperCase());

                return (
                  <article className="admin-booking-card" key={ticket.id}>
                    <div className="booking-card-top">
                      <h3>Ticket #{ticket.id} — {ticket.subject}</h3>
                      <span className={`status-badge ${statusClass}`}>{displayStatus}</span>
                    </div>

                    <p><strong>Customer:</strong> {ticket.customer_email || "Email not available"}</p>
                    <p><strong>Category:</strong> {ticket.category}</p>
                    <p><strong>Description:</strong> {ticket.description}</p>
                    <p>
                      <strong>Submitted:</strong>{" "}
                      {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : "Date unavailable"}
                    </p>

                    <label>
                      Ticket Status
                      <select
                        value={status}
                        onChange={(event) =>
                          setTicketStatuses((previous) => ({
                            ...previous,
                            [ticket.id]: event.target.value,
                          }))
                        }
                        disabled={updatingTicket === ticket.id}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </label>

                    <label>
                      Admin Reply
                      <textarea
                        rows={4}
                        value={ticketReplies[ticket.id] ?? ""}
                        onChange={(event) =>
                          setTicketReplies((previous) => ({
                            ...previous,
                            [ticket.id]: event.target.value,
                          }))
                        }
                        placeholder="Type your reply to the customer..."
                        disabled={updatingTicket === ticket.id}
                      />
                    </label>

                    <div className="booking-actions">
                      <button
                        type="button"
                        className="accept-button"
                        disabled={updatingTicket === ticket.id}
                        onClick={() => updateSupportTicket(ticket.id)}
                      >
                        {updatingTicket === ticket.id ? "Saving..." : "Save Reply & Status"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* All Bookings */}
          <section className="admin-bookings" id="all-bookings">
            <div className="admin-section-heading">
              <div>
                <h2>All Bookings ({bookings.length})</h2>
                <p>Review bookings and assign technicians.</p>
              </div>
            </div>

            <div className="booking-filters">
              <input
                type="search"
                placeholder="Search ID, customer, service, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search bookings"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter bookings by status"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                aria-label="Filter bookings by date"
              />

              <button type="button" className="refresh-button" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>

            <p className="booking-results-count">
              Showing {filteredBookings.length} of {bookings.length} bookings
            </p>

            {loading && <p>Loading bookings...</p>}

            {!loading && !error && filteredBookings.length === 0 && (
              <p>No bookings match your search or filters.</p>
            )}

            {!loading && filteredBookings.length > 0 && (
              <div className="admin-booking-list">
                {filteredBookings.map((booking) => (
                  <article className="admin-booking-card" key={booking.id}>
                    <div className="booking-card-top">
                      <h3>Booking #{booking.id} — {booking.service_name || booking.service}</h3>
                      <span className={`status-badge ${(booking.status || "").toLowerCase()}`}>
                        {booking.status}
                      </span>
                    </div>

                    <p><strong>Customer:</strong> {booking.customer_name || "Customer"}</p>
                    <p><strong>Phone:</strong> {booking.phone || "Not provided"}</p>
                    <p><strong>Address:</strong> {booking.address || "Not provided"}</p>
                    <p><strong>Issue:</strong> {booking.issue_description || "Not provided"}</p>
                    <p><strong>Date:</strong> {booking.booking_date || "Not provided"}</p>
                    <p><strong>Time:</strong> {booking.time_slot || "Not provided"}</p>
                    <p>
                      <strong>Assigned Technician:</strong>{" "}
                      {booking.assigned_technician
                        ? getTechnicianName(booking.assigned_technician)
                        : "Not assigned"}
                    </p>

                    <div className="booking-actions">
                      <select
                        aria-label={`Select technician for booking ${booking.id}`}
                        value={selectedTechnicians[booking.id] || ""}
                        onChange={(e) =>
                          setSelectedTechnicians((previous) => ({
                            ...previous,
                            [booking.id]: e.target.value,
                          }))
                        }
                        disabled={updatingBooking === booking.id}
                      >
                        <option value="">Select Available Technician</option>
                        {technicians
                          .filter((item) => item.is_available === true)
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.username} — {item.specialization}
                            </option>
                          ))}
                      </select>

                      <button
                        type="button"
                        className="accept-button"
                        disabled={updatingBooking === booking.id}
                        onClick={() => assignTechnician(booking.id)}
                      >
                        {updatingBooking === booking.id ? "Updating..." : "Assign Technician"}
                      </button>
                    </div>

                    {booking.status === "Pending" && (
                      <div className="booking-actions">
                        <button
                          type="button"
                          className="accept-button"
                          disabled={updatingBooking === booking.id}
                          onClick={() => updateStatus(booking.id, "Accepted")}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="reject-button"
                          disabled={updatingBooking === booking.id}
                          onClick={() => updateStatus(booking.id, "Rejected")}
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {booking.status === "Accepted" && (
                      <div className="booking-actions">
                        <button
                          type="button"
                          className="complete-button"
                          disabled={updatingBooking === booking.id}
                          onClick={() => updateStatus(booking.id, "Completed")}
                        >
                          Mark as Completed
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <footer className="admin-footer">
            © {new Date().getFullYear()} HomeFix Admin Dashboard
          </footer>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
