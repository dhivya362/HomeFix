import { useState } from "react";

function AddTechnician({ onTechnicianAdded }) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    specialization: "Plumber",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setIsError(false);
    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please log in as admin first.");
      }

      const response = await fetch(
        "http://127.0.0.1:8000/api/technicians/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          data.error ||
          Object.values(data).flat().join(" ") ||
          "Unable to create technician.";

        throw new Error(errorMessage);
      }

      setMessage("Technician account created successfully!");

      setForm({
        full_name: "",
        email: "",
        phone: "",
        specialization: "Plumber",
        password: "",
      });

      if (onTechnicianAdded) {
        onTechnicianAdded();
      }
    } catch (error) {
      setIsError(true);
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={styles.container}>
      <h2>Add Technician</h2>
      <p>Create a login account for a new HomeFix technician.</p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <label htmlFor="full_name">Full Name</label>
        <input
          id="full_name"
          name="full_name"
          value={form.full_name}
          onChange={handleChange}
          placeholder="Enter full name"
          required
        />

        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Enter email"
          required
        />

        <label htmlFor="phone">Phone Number</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          pattern="[0-9]{10}"
          maxLength={10}
          value={form.phone}
          onChange={handleChange}
          placeholder="10-digit phone number"
          required
        />

        <label htmlFor="specialization">Specialization</label>
        <select
          id="specialization"
          name="specialization"
          value={form.specialization}
          onChange={handleChange}
        >
          <option value="Plumber">Plumber</option>
          <option value="Electrician">Electrician</option>
          <option value="AC Technician">AC Technician</option>
          <option value="Carpenter">Carpenter</option>
          <option value="Appliance Repair">Appliance Repair</option>
          <option value="General Maintenance">
            General Maintenance
          </option>
        </select>

        <label htmlFor="password">Temporary Password</label>
        <input
          id="password"
          name="password"
          type="password"
          minLength={8}
          value={form.password}
          onChange={handleChange}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
        />

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Creating..." : "Create Technician"}
        </button>
      </form>

      {message && (
        <p
          role="status"
          style={{
            color: isError ? "#b91c1c" : "#15803d",
            marginTop: "15px",
          }}
        >
          {message}
        </p>
      )}
    </section>
  );
}

const styles = {
  container: {
    maxWidth: "600px",
    margin: "30px 0",
    padding: "24px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  button: {
    marginTop: "12px",
    padding: "12px",
    border: "none",
    borderRadius: "6px",
    background: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
  },
};

export default AddTechnician;

