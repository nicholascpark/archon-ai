# Esoteric Astrology Chat - Personal AI Astrologer

A subscription-based astrology chat application that acts as your personal AI astrologer, remembering your birth chart and providing personalized astrological guidance through natural conversation.

## Features

- **Personalized Experience**: Provide birth data once, never asked again
- **Natal Chart Analysis**: Deep insights into your birth chart
- **Transit Forecasting**: Get timing advice for any date
- **Synastry Analysis**: Relationship compatibility insights
- **Conversational Memory**: Agent remembers your chart and past conversations

## Tech Stack

- **Backend**: FastAPI + WebSockets
- **Agent**: Simple LangChain agent with tool calling
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

## Environment Variables

See `.env.example` for required configuration.

Key variables:
- `GROQ_API_KEY`: Get from https://console.groq.com/keys (FREE)
- `OPENAI_API_KEY`: For embeddings (text-embedding-3-small)
- `JWT_SECRET_KEY`: Random secret for authentication

## Project Structure

```
astrology-chat-agent/
├── app/                 # Backend application
│   ├── api/            # FastAPI routes
│   ├── agents/         # Simple LangChain agent
│   ├── core/           # Config, security, logging
│   ├── models/         # Data models
│   └── services/       # LLM, astrology, memory services
├── frontend/           # React frontend
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
