# OpenCLAW Literary Agent

Autonomous, pro-active literary agent engine for Francisco Angulo de Lafuente. This agent manages outreach, social media, and sales analysis for a catalog of 55+ books.

## 🧠 Features

- **Autonomous Decision Loop**: Operates 24/7, making strategic decisions every 30 minutes.
- **Strategy Reflection**: Performs a deep analysis of results and adjusts long-morrow strategy every 24 hours.
- **Bilingual Support**: Generates content and interacts in both Spanish (ES) and English (EN).
- **Tool Integration**:
  - `library_outreach.py`: Automated library contact system.
  - `price_monitor.py`: Competitor price and ranking analysis.
  - `sales_dashboard.py`: KPI tracking and sales projection.
  - `social_content.py`: Multi-platform social media generator.

## 🛠 Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Agnuxo1/OpenCLAW-2-Literary-Agent.git
   cd OpenCLAW-2-Literary-Agent
   ```

2. **Install dependencies**:
   ```bash
   npm install
   pip install -r requirements.txt
   ```

3. **Configure environment**:
   - Copy `.env.example` to `.env`
   - Fill in your `OPENCLAW_GATEWAY_TOKEN` and other API keys.
   - Configure your platforms in `config/platforms.json` (see `config/platforms.json.example`).

4. **Run the agent**:
   ```bash
   npx ts-node src/openclaw-agent.ts run
   ```

## 📂 Project Structure

- `src/`: Core TypeScript agentic engine.
- `scripts/`: Python tools for specific tasks.
- `config/`: Configuration templates and state management.

## ⚖️ License

Private / All Rights Reserved. Used by OpenCLAW Autonomous Network.
