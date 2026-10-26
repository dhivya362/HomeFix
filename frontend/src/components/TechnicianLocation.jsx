
import { useState } from "react";
import "./TechnicianLocation.css";

const API_BASE_URL = "http://127.0.0.1:8000/api";

export default function TechnicianLocation({ bookingId: assignedBookingId }) {
  const [manualBookingId, setManualBookingId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);

  const bookingId = assignedBookingId || manualBookingId;

  const shareLocation = () => {
    if (!bookingId || Number(bookingId) < 1) {
      setMessage("Please select or enter a valid assigned booking ID.");
      return;
    }

    if (!navigator.geolocation) {
      setMessage("Your browser does not support GPS location.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Login token missing. Please log in again.");
      return;
    }

    setLoading(true);
    setMessage("Getting your GPS location...");
    setLocation(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const gps = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        try {
          const response = await fetch(
            `${API_BASE_URL}/bookings/technician-location/update/`,
            {
              method: "POST",
              headers: {
                Authorization: `Token ${token}`,
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({
                booking_id: Number(bookingId),
                latitude: gps.latitude,
                longitude: gps.longitude,
              }),
            }
          );

          const text = await response.text();
          let data = {};

          try {
            data = text ? JSON.parse(text) : {};
          } catch {
            throw new Error(`Invalid server response (HTTP ${response.status}).`);
          }

          if (!response.ok) {
            if (response.status === 401) {
              throw new Error("Session expired. Please log in again.");
            }

            throw new Error(
              data.error || data.detail || "Unable to save location."
            );
          }

          setLocation(gps);
          setMessage("Location shared successfully!");
        } catch (error) {
          setMessage(error.message || "Unable to share location.");
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        if (error.code === 1) {
          setMessage(
            "Location permission denied. Allow location access in browser settings."
          );
        } else if (error.code === 2) {
          setMessage("GPS location unavailable. Check your device location settings.");
        } else {
          setMessage("GPS request timed out. Please try again.");
        }

        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="technician-location-card">
      <h2>Technician Location</h2>

      <p className="location-description">
        Share your current GPS location with the customer for this booking.
      </p>

      {!assignedBookingId && (
        <>
          <label className="location-label" htmlFor="bookingId">
            Assigned Booking ID
          </label>

          <input
            id="bookingId"
            className="location-input"
            type="number"
            min="1"
            value={manualBookingId}
            onChange={(event) => setManualBookingId(event.target.value)}
            placeholder="Enter assigned booking ID"
          />
        </>
      )}

      {bookingId && (
        <p>
          <strong>Booking ID:</strong> #{bookingId}
        </p>
      )}

      <button
        type="button"
        className="location-share-button"
        onClick={shareLocation}
        disabled={loading || !bookingId}
      >
        {loading ? "Sharing location..." : "Share My Location"}
      </button>

      {message && (
        <p className="location-message" role="status">
          {message}
        </p>
      )}

      {location && (
        <div className="location-coordinates">
          <div className="coordinate-box">
            <span>Latitude</span>
            <strong>{location.latitude.toFixed(6)}</strong>
          </div>

          <div className="coordinate-box">
            <span>Longitude</span>
            <strong>{location.longitude.toFixed(6)}</strong>
          </div>
        </div>
      )}

      {location && (
        <a
          className="location-map-link"
          href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`}
          target="_blank"
          rel="noreferrer"
        >
          View Location on Map ↗
        </a>
      )}
    </div>
  );
}
