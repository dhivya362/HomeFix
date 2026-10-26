
import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const API_BASE_URL = "http://127.0.0.1:8000/api";

function MapUpdater({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, 15);
    }
  }, [position, map]);

  return null;
}

export default function TechnicianMap({ bookingId }) {
  const [location, setLocation] = useState(null);
  const [message, setMessage] = useState(
    "Checking technician location..."
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Please log in again. Authentication token is missing.");
      setLoading(false);
      return;
    }

    if (!bookingId) {
      setMessage("Booking ID is missing.");
      setLoading(false);
      return;
    }

    let active = true;

    const fetchLocation = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/bookings/customer/technician-location/${bookingId}/`,
          {
            method: "GET",
            headers: {
              Authorization: `Token ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (!active) return;

        if (response.status === 401) {
          setMessage("Login session expired. Please log in again.");
          setLocation(null);
          return;
        }

        if (response.status === 403) {
          setMessage("You do not have permission to view this location.");
          setLocation(null);
          return;
        }

        if (response.status === 404) {
          setMessage(
            data.message ||
              data.error ||
              "Technician location not shared yet."
          );
          setLocation(null);
          return;
        }

        if (!response.ok) {
          setMessage(
            data.error ||
              data.detail ||
              "Unable to fetch technician location."
          );
          return;
        }

        const latitude = Number(data.latitude);
        const longitude = Number(data.longitude);

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          setMessage("Received invalid GPS coordinates.");
          setLocation(null);
          return;
        }

        setLocation([latitude, longitude]);
        setMessage(
          `Technician location updated. Last update: ${
            data.updated_at
              ? new Date(data.updated_at).toLocaleTimeString()
              : "just now"
          }`
        );
      } catch (error) {
        if (active) {
          setMessage(
            "Cannot connect to the server. Check whether Django is running."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchLocation();

    const intervalId = setInterval(fetchLocation, 5000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [bookingId]);

  return (
    <div
      style={{
        margin: "20px 0",
        padding: "16px",
        border: "1px solid #ddd",
        borderRadius: "12px",
        background: "#fff",
      }}
    >
      <h3>Technician Location</h3>

      <p role="status" aria-live="polite">
        {loading ? "Loading location..." : message}
      </p>

      {location && (
        <>
          <MapContainer
            center={location}
            zoom={15}
            scrollWheelZoom={true}
            style={{
              height: "350px",
              width: "100%",
              borderRadius: "12px",
              zIndex: 1,
            }}
          >
            <MapUpdater position={location} />

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Marker position={location}>
              <Popup>
                Technician's latest GPS location
              </Popup>
            </Marker>
          </MapContainer>

          <p>
            <strong>Latitude:</strong> {location[0].toFixed(6)}
          </p>

          <p>
            <strong>Longitude:</strong> {location[1].toFixed(6)}
          </p>

          <a
            href={`https://www.openstreetmap.org/?mlat=${location[0]}&mlon=${location[1]}#map=16/${location[0]}/${location[1]}`}
            target="_blank"
            rel="noreferrer"
          >
            Open location in OpenStreetMap
          </a>
        </>
      )}
    </div>
  );
}
