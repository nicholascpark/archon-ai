# Archon AI - Personal AI Astrologer

A subscription-based astrology chat application that acts as your personal AI astrologer, remembering your birth chart and providing personalized astrological guidance through natural conversation.

## Features

- **Personalized Experience**: Provide birth data once, never asked again
- **Natal Chart Analysis**: Deep insights into your birth chart
- **Transit Forecasting**: Get timing advice for any date
- **Synastry Analysis**: Relationship compatibility insights
- **Conversational Memory**: Agent remembers your chart and past conversations

## Tech Stack

- **Backend**: FastAPI + WebSockets
- **Agent**: LangGraph agent with StateGraph orchestration
- **LLM**: Groq (free tier - llama3-70b)
- **Embeddings**: OpenAI text-embedding-3-small
- **Vector DB**: Chroma DB
- **Astrology**: Kerykeion (open-source Python library)
- **Database**: SQLite
- **Frontend**: React + TypeScript + Vite

## Cost

- Extremely low cost: ~$0.0001 per 30-message conversation
- Groq LLM: FREE (with rate limits)
- Only cost: embeddings (~$0.00009 per conversation)

## Quick Start

### Backend Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Run database migrations
python run.py --init-db

# Start backend
python run.py
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## CLI Testing Guide

### Prerequisites

1. **Get API Keys:**
   - Groq API: https://console.groq.com/keys (FREE - no credit card required)
   - OpenAI API: https://platform.openai.com/api-keys (for embeddings)

2. **Set up environment:**
```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your keys
nano .env  # or use your preferred editor
```

Required changes in `.env`:
```bash
GROQ_API_KEY=gsk_your_actual_groq_key_here
OPENAI_API_KEY=sk-your_actual_openai_key_here
JWT_SECRET_KEY=your-random-secret-here-use-openssl-rand-hex-32
SECRET_KEY=another-random-secret-here
```

### Step 1: Install Dependencies

```bash
# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install all dependencies
pip install -r requirements.txt
```

### Step 2: Initialize Database

```bash
# Initialize the SQLite database schema
python run.py --init-db
```

You should see:
```
INFO:app.core.logging_config:Initializing database...
INFO:app.core.logging_config:Database initialized successfully!
```

### Step 3: Start the Server

```bash
# Start the FastAPI server
python run.py
```

You should see:
```
INFO:app.core.logging_config:Starting Archon AI
INFO:app.core.logging_config:Environment: development
INFO:app.core.logging_config:Server: http://0.0.0.0:8000
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 4: Test with CLI (using curl or httpie)

#### Option A: Using curl

**1. Health Check:**
```bash
curl http://localhost:8000/api/health
```

Expected response:
```json
{"status":"healthy","version":"1.0.0"}
```

**2. Register a New User:**
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "securepass123",
    "birth_date": "1990-05-15",
    "birth_time": "14:30:00",
    "birth_location": "New York, USA"
  }'
```

Expected response:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "...",
    "email": "test@example.com",
    "username": "testuser"
  }
}
```

**3. Login:**
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=securepass123"
```

**4. Get User Profile (with JWT token):**
```bash
# Replace YOUR_TOKEN with the access_token from registration/login
curl http://localhost:8000/api/user/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**5. Get Natal Chart:**
```bash
curl http://localhost:8000/api/user/chart \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Option B: Using httpie (more readable)

Install httpie: `pip install httpie`

```bash
# Health check
http GET localhost:8000/api/health

# Register
http POST localhost:8000/auth/register \
  email=test@example.com \
  username=testuser \
  password=securepass123 \
  birth_date=1990-05-15 \
  birth_time=14:30:00 \
  birth_location="New York, USA"

# Login
http -f POST localhost:8000/auth/login \
  username=test@example.com \
  password=securepass123

# Get profile (replace TOKEN)
http GET localhost:8000/api/user/me \
  Authorization:"Bearer TOKEN"

# Get natal chart
http GET localhost:8000/api/user/chart \
  Authorization:"Bearer TOKEN"
```

### Step 5: Test WebSocket Chat (using websocat)

Install websocat: `brew install websocat` (macOS) or download from https://github.com/vi/websocat

```bash
# Replace YOUR_TOKEN with your JWT token
websocat "ws://localhost:8000/ws/chat?token=YOUR_TOKEN"
```

Once connected, type messages:
```
What's my Sun sign?
What should I focus on today?
Tell me about my Moon placement
```

The agent will respond with personalized astrological insights!

### Troubleshooting

**Database locked error:**
```bash
# Reset the database
python run.py --reset-db
```

**Import errors:**
```bash
# Reinstall dependencies
pip install --upgrade -r requirements.txt
```

**API key errors:**
- Check `.env` file has correct keys
- Ensure no extra spaces around `=` in `.env`
- Groq key starts with `gsk_`
- OpenAI key starts with `sk-`

## Environment Variables

See `.env.example` for required configuration.

Key variables:
- `GROQ_API_KEY`: Get from https://console.groq.com/keys (FREE)
- `OPENAI_API_KEY`: For embeddings (text-embedding-3-small)
- `JWT_SECRET_KEY`: Random secret for authentication

## Project Structure

```
archon-ai/
├── app/                 # Backend application
│   ├── api/            # FastAPI routes
│   ├── agents/         # LangGraph agents
│   ├── core/           # Config, security, logging
│   ├── models/         # Data models
│   └── services/       # LLM, astrology, memory services
├── frontend/           # React frontend (planned)
├── data/               # SQLite DB + Chroma vector store
└── tests/              # Tests
```

## License

MIT

## Pricing Model

- Free tier: 10 messages/day
- Basic: $5/month (unlimited messages)
- Premium: $15/month (advanced features)

With profit margins > 95% due to extremely low infrastructure costs!
