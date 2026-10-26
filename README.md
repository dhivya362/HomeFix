# 🏠 HomeFix – Home Services Booking Platform

## 📌 Project Overview

HomeFix is a web-based home services booking platform that allows customers to book professional home services such as AC repair, plumbing, electrical work, home cleaning, and appliance repair.

Customers can browse available services, book time slots, track booking status, view technician work photos, manage bookings, and access payment and invoice options.

The platform includes separate dashboards for customers, technicians, and administrators to manage the service booking process efficiently.

## ✨ Features

- 🔐 User Registration and Login
- 👤 Role-Based Access for Customers, Technicians, and Admins
- 🛠️ Browse and View Available Home Services
- 📅 Book Services with Date and Time Slot Selection
- 📋 View and Manage My Bookings
- 🔄 Reschedule or Cancel Bookings
- 📍 Technician Location Tracking
- 📸 View Technician Work Photos
- 💳 Payment Options and Invoice Download
- ⭐ Service Rating and Reviews
- ⚙️ Admin Dashboard for Service and Booking Management

## 🧑‍💻 Technologies Used

**Frontend**
- React.js
- JavaScript
- HTML5
- CSS3

**Backend**
- Python
- Django
- Django REST Framework

**Database**
- PostgreSQL

**Tools**
- Git
- GitHub
- Visual Studio Code
- pgAdmin

## 📂 Project Structure

```text
HomeFix/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── styles/
│   │   └── App.jsx
│   └── package.json
│
├── backend/
│   ├── config/
│   ├── accounts/
│   ├── services/
│   ├── bookings/
│   └── manage.py
│
└── README.md
```

*Note: Update the folder names above if your actual project structure is different.*

## ⚙️ Installation and Setup

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd HomeFix
```

### 2. Backend Setup

Open a terminal and navigate to the backend folder:

```bash
cd backend
python -m venv venv
```

Activate the virtual environment on Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install django djangorestframework psycopg2-binary
```

Configure your PostgreSQL database settings in Django's `settings.py`.

Run migrations:

```bash
python manage.py migrate
```

Start the backend server:

```bash
python manage.py runserver
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

## 🎯 Project Objective

The objective of HomeFix is to simplify home service bookings by connecting customers with technicians through a convenient online platform. It helps organize service requests, manage appointments, and improve communication between customers and service providers.

## 👩‍💻 Developer

**Dhivya F.**

- GitHub: [dhivya362](https://github.com/dhivya362)

---

⭐ If you find this project useful, feel free to explore the repository.
