# Airtable Form Builder (MERN Stack)

A full-stack application that allows users to build custom forms connected directly to their Airtable bases. Features include drag-and-drop field selection, conditional logic, file uploads, and real-time response syncing.

[![Demo Video](https://img.shields.io/badge/Watch%20Demo-Video-red?style=for-the-badge)](https://drive.google.com/file/d/1vmDt0ZglpNSVUggQmiQAgH0YmgoEEHX6/view?usp=sharing)

##  Features
- **Airtable Integration**: OAuth2 authentication and automatic fetching of Bases and Tables.
- **Form Builder**: Select fields from Airtable and customize labels/requirements.
- **Conditional Logic**: Show/Hide fields based on previous answers.
- **File Uploads**: Integrated with Cloudinary for attachment handling.
- **Real-time Sync**: Responses are saved to MongoDB and immediately pushed to Airtable.
- **Dashboard**: Manage multiple forms and export responses (CSV/JSON).



##  Prerequisites
Before running the project, ensure you have the following installed/created:
- [Node.js](https://nodejs.org/) (v14+)
- [MongoDB Atlas](https://www.mongodb.com/atlas) account
- [Airtable](https://airtable.com/) account
- [Cloudinary](https://cloudinary.com/) account (for file uploads)



##  Airtable OAuth Setup
To allow the app to talk to Airtable, you must create an integration.

1. Go to the [Airtable Builder Hub](https://airtable.com/create/oauth).
2. Click **"Create new integration"**.
3. **Name**: `My Form Builder` (or your choice).
4. **Redirect URIs**:
   - For Local Dev: `http://localhost:5000/api/auth/callback`
   - For Production: `https://<your-app>.vercel.app/api/auth/callback`
5. **Scopes** (Add these exactly):
   - `data.records:read`
   - `data.records:write`
   - `schema.bases:read`
   - `webhook:manage`
6. Click **Save**.
7. Copy the **Client ID** and **Client Secret** for the `.env` file below.



##  Configuration (.env)

### 1. Backend Configuration
Create a file named `.env` inside the `/server` folder:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
COOKIE_KEY=some_random_secure_string_xyz

# Airtable Keys (From previous step)
AIRTABLE_CLIENT_ID=your_client_id
AIRTABLE_CLIENT_SECRET=your_client_secret

# URLs (Update these when deploying!)
# Local Development:
CLIENT_URL=http://localhost:5173
REDIRECT_URI=http://localhost:5000/api/auth/callback

# Production Example:
# CLIENT_URL=https://my-app.vercel.app
# REDIRECT_URI=https://my-app.vercel.app/api/auth/callback
```

### 2. Frontend Configuration
Create a file named `.env` inside the `/client` folder:

```env
# URL of your Backend Server
VITE_API_URL=http://localhost:5000
```

> **Note:** In `client/src/pages/Viewer.jsx`, ensure you update the **Cloudinary** `CLOUD_NAME` and `UPLOAD_PRESET` variables with your own Cloudinary credentials.



##  Setup & Installation

### Backend
1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
   *Server runs on http://localhost:5000*

### Frontend
1. Open a new terminal and navigate to the client folder:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *Client runs on http://localhost:5173*



##  Data Model Explanation

The application uses MongoDB to store form schemas and user sessions, while syncing actual data to Airtable.

### 1. User (`models/User.js`)
Stores OAuth tokens to authenticate requests on behalf of the user.
- `airtableId`: The user's unique Airtable ID.
- `accessToken` / `refreshToken`: Used to communicate with Airtable API.

### 2. Form (`models/Form.js`)
Defines the structure of a saved form.
- `baseId` / `tableId`: Which Airtable table this form belongs to.
- `fields`: An array of objects defining the questions.
  - `questionKey`: Unique ID for the input.
  - `type`: Input type (text, select, file, etc.).
  - `conditionalRules`: Logic for showing/hiding the field.

### 3. Response (`models/Response.js`)
Stores the actual submission data.
- `formId`: Link to the Form schema.
- `answers`: JSON object containing user answers `{ "questionKey": "Answer" }`.
- `airtableRecordId`: The ID of the row created in Airtable.



##  Conditional Logic Explanation
The app uses a client-side engine (`client/src/utils/logicEngine.js`) to evaluate visibility rules in real-time.

**Structure:**
Each field has a `conditionalRules` object:
```javascript
{
  logic: "AND", // or "OR"
  conditions: [
    {
      questionKey: "field_123", // The field we are watching
      operator: "equals",       // equals, notEquals, contains
      value: "Yes"              // The value that triggers visibility
    }
  ]
}
```

**How it works:**
1. The `Viewer` component watches the `answers` state.
2. On every render, it passes the rules and current answers to `shouldShowQuestion()`.
3. If the conditions are met, the field renders; otherwise, it returns `null`.



## Webhook Configuration
The app automatically registers a webhook with Airtable when a new form is created.

1. **Registration**: When you click "Save Form", the backend POSTs to `https://api.airtable.com/v0/bases/{baseId}/webhooks`.
2. **Notification**: It tells Airtable to ping `YOUR_BACKEND_URL/api/webhooks/airtable` whenever data in that specific table changes.
3. **Handling**: The server receives the ping, matches the Record ID to the local database, and updates the local `updatedAt` timestamp (Dual-write architecture).



## How to Run
1. Ensure MongoDB is running (or you are connected to Atlas).
2. Start the Backend:
   ```bash
   cd server && npm start
   ```
3. Start the Frontend:
   ```bash
   cd client && npm run dev
   ```
4. Go to `http://localhost:5173` in your browser.
5. Click **"Log in with Airtable"**.
6. Select a Base and Table, add fields, and click **Save**.
7. Share the **Viewer Link** to collect responses!
