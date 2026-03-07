# DocuCharts - Full-Stack AI Document Analytics App

DocuCharts is a full-stack web application with:
- React + Vite frontend
- FastAPI backend
- Supabase PostgreSQL for persistence
- OpenAI Chat Completions API for AI assistant

## Project Structure

```text
DocuCharts/
  backend/
    app/
      core/
      database/
      models/
      routers/
      services/
      utils/
      main.py
    app.py
    requirements.txt
    .env.example
  frontend/
    src/
      api/
      components/
      context/
      pages/
      App.jsx
      main.jsx
      styles.css
    package.json
    vite.config.js
    .env.example
  supabase/
    schema.sql
  .env.example
  README.md
```

## Features Implemented

1. Authentication
- Signup + login APIs via FastAPI
- Password hashing with `passlib` (`pbkdf2_sha256`)
- JWT token-based authentication
- Frontend Login and Signup pages

2. Document Upload
- Multiple document upload from React UI
- Backend metadata + parsed tabular data persistence in `documents` table
- CSV/XLSX uploads are parsed and stored for Explorer/Charts
- Stored fields include `name`, `file_type`, `parse_status`, `row_count`, `parsed_columns`, `parsed_rows`, `uploaded_at`, `user_id`

3. Data Visualization
- Recharts-based charts
- Pie, Bar, and Line chart support
- X/Y axis selection UI
- Works only on selected uploaded documents

4. Custom Table View
- TanStack Table integration
- Global filtering and sorting
- Drag-and-drop column reordering (native HTML5 drag/drop)
- Works only on selected uploaded documents
- Drag a column header into the top filter dropzone to add value-based filters

5. AI Chatbot
- Chat UI in frontend
- Backend OpenAI call using Chat Completions
- Conversation persistence in `chat_history`
- Chat answers are grounded only in selected uploaded documents
- Previous chat history can be shown/hidden in the UI
- Controlled by `users.chat_assistant_enabled`; when false, chat UI is hidden and chat APIs return 403

6. Environment Variables
- Credentials read from `.env` files
- No credentials hardcoded

## Supabase Setup

1. Create a Supabase project.
2. Open SQL Editor in Supabase.
3. Run [`supabase/schema.sql`](./supabase/schema.sql).
4. Copy project credentials from Supabase Settings.

## Backend Setup (FastAPI)

1. Go to backend folder:
```bash
cd backend
```

2. Create and activate virtual environment:
```bash
python -m venv .venv
.venv\\Scripts\\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` in `backend/`:
```env
APP_NAME=DocuCharts API
APP_VERSION=1.0.0
SECRET_KEY=replace_with_a_long_random_secret
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

5. Run backend server:
```bash
uvicorn app.main:app --reload --port 8000
```

Backend will run at `http://localhost:8000`.

## Frontend Setup (React + Vite)

1. Go to frontend folder:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` in `frontend/`:
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

4. Run frontend:
```bash
npm run dev
```

Frontend will run at `http://localhost:5173`.

## API Endpoints

### Authentication
- `POST /api/auth/signup`
- `POST /api/auth/login`

### Documents
- `POST /api/documents/upload` (multipart, token required)
- `GET /api/documents/` (token required)
- `POST /api/documents/data` (selected document IDs, token required)
- `DELETE /api/documents/{document_id}` (token required)

### Chatbot
- `POST /api/chat/query` (question + selected document IDs, token required)
- `GET /api/chat/history` (token required)

## Notes
- Supabase row-level security is not enabled in this scaffold. Enable RLS policies before production use.
- File blobs are not stored yet; parsed CSV/XLSX dataset is stored in Supabase for exploration and charting.
- If you already created tables previously, rerun [`supabase/schema.sql`](./supabase/schema.sql) to apply new `documents`/`chat_history` columns.
