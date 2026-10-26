import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Profile.css";

const API_URL = "http://127.0.0.1:8000/api/accounts/profile/";

const emptyProfile = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  address: "",
};

function Profile() {
  const [profile, setProfile] = useState(emptyProfile);
  const [originalProfile, setOriginalProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Please log in to view your profile.");
        }

        const response = await fetch(API_URL, {
          method: "GET",
          headers: {
            Authorization: `Token ${token}`,
            Accept: "application/json",
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || data.error || "Unable to load profile."
          );
        }

        const loadedProfile = {
          ...emptyProfile,
          ...data,
        };

        if (isMounted) {
          setProfile(loadedProfile);
          setOriginalProfile(loadedProfile);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load profile.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleEdit(event) {
    event.preventDefault();
    event.stopPropagation();

    setProfile({ ...originalProfile });
    setMessage("");
    setError("");
    setEditing(true);
  }

  function handleCancel(event) {
    event.preventDefault();
    event.stopPropagation();

    setProfile({ ...originalProfile });
    setEditing(false);
    setMessage("");
    setError("");
  }

  async function handleSave(event) {
    event.preventDefault();

    if (saving) return;

    setMessage("");
    setError("");

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please log in again.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(API_URL, {
        method: "PUT",
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          first_name: profile.first_name.trim(),
          last_name: profile.last_name.trim(),
          phone: profile.phone.trim(),
          address: profile.address.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.error || "Unable to save profile."
        );
      }

      const updatedProfile = {
        ...profile,
        ...data,
      };

      setProfile(updatedProfile);
      setOriginalProfile(updatedProfile);
      setEditing(false);
      setMessage("Profile updated successfully!");
    } catch (err) {
      setError(err.message || "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  return (
    <div className="profile-page">
      <header className="profile-header">
        <Link to="/dashboard" className="profile-logo">
          HomeFix
        </Link>

        <Link to="/dashboard" className="profile-back-link">
          Back to Dashboard
        </Link>
      </header>

      <main className="profile-container">
        <section className="profile-card">
          <div className="profile-heading">
            <div className="profile-avatar">
              {(profile.first_name || profile.username || "U")
                .charAt(0)
                .toUpperCase()}
            </div>

            <h1>My Profile</h1>
            <p>View and manage your personal details.</p>
          </div>

          {message && (
            <div className="profile-success" role="status">
              {message}
            </div>
          )}

          {error && (
            <div className="profile-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} noValidate>
            <div className="profile-form-grid">
              <div className="profile-field">
                <label htmlFor="first_name">First Name</label>
                <input
                  id="first_name"
                  name="first_name"
                  value={profile.first_name}
                  onChange={handleChange}
                  disabled={!editing || saving}
                  placeholder="Enter first name"
                />
              </div>

              <div className="profile-field">
                <label htmlFor="last_name">Last Name</label>
                <input
                  id="last_name"
                  name="last_name"
                  value={profile.last_name}
                  onChange={handleChange}
                  disabled={!editing || saving}
                  placeholder="Enter last name"
                />
              </div>

              <div className="profile-field">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={profile.email}
                  disabled
                  readOnly
                />
              </div>

              <div className="profile-field">
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={handleChange}
                  disabled={!editing || saving}
                  maxLength={15}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="profile-field profile-address-field">
                <label htmlFor="address">Home Address</label>
                <textarea
                  id="address"
                  name="address"
                  value={profile.address}
                  onChange={handleChange}
                  disabled={!editing || saving}
                  placeholder="Enter your home address"
                  rows={4}
                />
              </div>
            </div>

            <div className="profile-actions">
              {!editing ? (
                <button
                  type="button"
                  className="profile-save-btn"
                  onClick={handleEdit}
                >
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    type="submit"
                    className="profile-save-btn"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Profile"}
                  </button>

                  <button
                    type="button"
                    className="profile-cancel-btn"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

export default Profile;