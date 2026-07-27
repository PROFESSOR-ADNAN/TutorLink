const axios = require("axios");

if (!process.env.CHAPA_SECRET_KEY) {
  console.warn(
    "⚠️  CHAPA_SECRET_KEY is not set — payments will fail until it's added to backend/.env. " +
    "Get it from your Chapa dashboard under Settings > API Keys."
  );
}

// A pre-authenticated client for Chapa's REST API. Every call — initialize,
// verify, subaccount creation, refunds, bank list — goes through this same
// instance, so the Bearer token only needs to be wired up once.
const chapa = axios.create({
  baseURL: "https://api.chapa.co/v1",
  headers: {
    Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
  },
});

module.exports = chapa;
