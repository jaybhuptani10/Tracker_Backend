# DuoTrack Backend API

Welcome to the **DuoTrack Backend** documentation! This RESTful API powers the DuoTrack collaborative productivity platform.

---

## 🛠️ Tech Stack & Setup

- **Base URL:** `http://localhost:8000/api/v1`
- **Authentication:** Bearer Token (JWT) required for most endpoints.

To start the server:

1. `npm install`
2. Create `.env` (see bottom of file)
3. `npm run dev`

---

## � API Reference

### 1. 🔐 User Authentication

#### **Register New User**

- **URL:** `/user/register`
- **Method:** `POST`
- **Auth Required:** ❌ No

**Request Body:**

```json
{
  "name": "Jane Doe", // String, Required
  "email": "jane@a.com", // String, Required, Unique
  "password": "pass" // String, Required
}
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "65a...",
      "name": "Jane Doe",
      "email": "jane@a.com"
    },
    "accessToken": "eyJh..."
  }
}
```

#### **Login User**

- **URL:** `/user/login`
- **Method:** `POST`
- **Auth Required:** ❌ No

**Request Body:**

```json
{
  "email": "jane@a.com", // String, Required
  "password": "pass" // String, Required
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "User logged in successfully",
  "data": {
    "user": { ... },
    "accessToken": "eyJh...",
    "refreshToken": "eyJh..."
  }
}
```

#### **Get Current Profile**

- **URL:** `/user/me`
- **Method:** `GET`
- **Auth Required:** ✅ Yes

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "65a...",
    "name": "Jane Doe",
    "email": "jane@a.com",
    "partnerId": "65b..." // null if no partner
  }
}
```

#### **Send Partner Request**

- **URL:** `/user/partner/request`
- **Method:** `POST`
- **Auth Required:** ✅ Yes

**Request Body:**

```json
{
  "email": "john@a.com" // String, Required (Partner's email)
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Partner request sent successfully"
}
```

#### **Get Pending Requests**

- **URL:** `/user/partner/requests`
- **Method:** `GET`
- **Auth Required:** ✅ Yes

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "req_123",
      "requesterId": {
        "_id": "user_abc",
        "name": "John Doe",
        "email": "john@a.com"
      },
      "status": "pending"
    }
  ]
}
```

#### **Respond to Request**

- **URL:** `/user/partner/respond`
- **Method:** `POST`
- **Auth Required:** ✅ Yes

**Request Body:**

```json
{
  "requestId": "req_123",
  "action": "accept" // String (accept/reject)
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Partner request accepted"
}
```

---

### 2. ✅ Task Management

#### **Get Dashboard (Tasks)**

- **URL:** `/tasks/dashboard`
- **Method:** `GET`
- **Auth Required:** ✅ Yes
- **Query Params:**
  - `date`: `YYYY-MM-DD` (Optional, defaults to today)
  - `viewMode`: `daily` | `weekly` | `monthly` (Optional)

**Note:** When `viewMode` is `daily` and the date is **Today**, the response will automatically include **incomplete tasks from previous days** (Overdue Tasks) to ensure nothing is missed.

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "myTasks": [
      {
        "_id": "task1",
        "content": "Finish report",
        "isCompleted": false,
        "category": "Work",
        "date": "2024-01-20T..." // Might be past date if overdue
      }
    ],
    "partnerTasks": [],
    "sharedTasks": []
  }
}
```

---

### 3. 💰 Expense Tracking

#### **Get/Add Expenses**

- **URL:** `/expenses`
- **Method:** `GET` | `POST`
- **Auth Required:** ✅ Yes
- **GET Params:** `date` (YYYY-MM-DD)
- **POST Body:** `{ "amount": 50, "category": "Food", "description": "Lunch" }`

### 4. 📔 Journaling

#### **Get/Add Journal Entries**

- **URL:** `/journal`
- **Method:** `GET` | `POST`
- **Auth Required:** ✅ Yes
- **GET Params:** `date` (YYYY-MM-DD)
- **POST Body:** `{ "content": "Today was a good day...", "mood": "Happy", "date": "2024-01-20" }`

---

#### **Create Task**

- **URL:** `/tasks`
- **Method:** `POST`
- **Auth Required:** ✅ Yes

**Request Body:**

```json
{
  "content": "Gym Workout", // String, Required
  "category": "Workout", // String, Required (Work, Personal, Workout, Study, Other)
  "date": "2024-01-20", // String (Date), Optional
  "isRecurring": true, // Boolean, Optional
  "recurrence": {
    // Object, Optional (Required if isRecurring=true)
    "type": "daily", // String (daily, weekly)
    "endDate": "2024-02-20"
  },
  "isShared": false // Boolean, Optional
}
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "message": "Task created successfully",
  "data": { ...taskObject }
}
```

#### **Update Task Content**

- **URL:** `/tasks/:id`
- **Method:** `PATCH`
- **Auth Required:** ✅ Yes

**Request Body:**

```json
{
  "content": "Updated Task Name",
  "category": "Personal"
}
```

#### **Update Task Status (Check/Uncheck)**

- **URL:** `/tasks/:id/status`
- **Method:** `PATCH`
- **Auth Required:** ✅ Yes

**Request Body:**

```json
{
  "isCompleted": true // Boolean, Required
}
```

#### **Add Subtask**

- **URL:** `/tasks/:id/subtasks`
- **Method:** `POST`
- **Auth Required:** ✅ Yes

**Request Body:**

```json
{
  "content": "Warm up set" // String, Required
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "task1",
    "subtasks": [
      { "content": "Warm up set", "isCompleted": false, "_id": "sub1" }
    ]
  }
}
```

---

### 5. 🔥 Habit Tracking

#### **Get All Habits**

- **URL:** `/habits`
- **Method:** `GET`
- **Auth Required:** ✅ Yes

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "hab1",
      "name": "Drink Water",
      "completedDates": ["2024-01-19", "2024-01-20"],
      "streak": 2
    }
  ]
}
```

#### **Create Habit**

- **URL:** `/habits`
- **Method:** `POST`
- **Auth Required:** ✅ Yes

**Request Body:**

```json
{
  "name": "Read 10 Pages" // String, Required
}
```

#### **Toggle Habit (Check for specific date)**

- **URL:** `/habits/:id/toggle`
- **Method:** `POST`
- **Auth Required:** ✅ Yes

**Request Body:**

```json
{
  "date": "2024-01-20" // String (YYYY-MM-DD), Required
}
```

---

### 6. 📊 Analytics

#### **Get Heatmap Data**

- **URL:** `/analytics/heatmap`
- **Method:** `GET`
- **Auth Required:** ✅ Yes

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    { "date": "2024-01-01", "count": 5 },
    { "date": "2024-01-02", "count": 8 }
  ]
}
```

#### **Get Category Distribution**

- **URL:** `/analytics/categories`
- **Method:** `GET`
- **Auth Required:** ✅ Yes

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    { "name": "Work", "value": 15, "color": "#60A5FA" },
    { "name": "Workout", "value": 8, "color": "#F87171" }
  ]
}
```

---

### 7. 📧 Email & Notifications

#### **Send Nudge to Partner**

- **URL:** `/user/nudge`
- **Method:** `POST`
- **Auth Required:** ✅ Yes

**Request Body:**

```json
{
  "message": "Let's focus!" // String, Required
}
```

---

## ⚡ Environment Variables (.env)

Ensure your `.env` file contains these keys:

```conf
# Server Configuration
PORT=8000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/duotrack
CORS_ORIGIN=http://localhost:5173

# Security (JWT)
ACCESS_TOKEN_SECRET=your_super_secret_access_key
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_super_secret_refresh_key
REFRESH_TOKEN_EXPIRY=10d

# Email Service (Nodemailer - Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Frontend URL (For email links)
FRONTEND_URL=http://localhost:5173
```
