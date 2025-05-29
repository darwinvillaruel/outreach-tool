import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import open from "open";
import dns from "dns";
import bodyParser from "body-parser";

dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const { OUTREACH_CLIENT_ID, OUTREACH_CLIENT_SECRET, OUTREACH_REDIRECT_URI } =
  process.env;

const PORT = process.env.PORT || 3000;
const AUTHORIZE_URL = "https://api.outreach.io/oauth/authorize";
const TOKEN_URL = "https://api.outreach.io/oauth/token";

const scope = ["accounts.all", "prospects.all", "emailAddresses.all"].join(" ");

app.get("/auth", (req, res) => {
  const url = `${AUTHORIZE_URL}?client_id=${OUTREACH_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    OUTREACH_REDIRECT_URI
  )}&response_type=code&scope=${encodeURIComponent(scope)}`;
  res.redirect(url);
});

app.get("/callback", async (req, res) => {
  const authCode = req.query.code;

  try {
    const response = await axios.post(TOKEN_URL, null, {
      params: {
        client_id: OUTREACH_CLIENT_ID,
        client_secret: OUTREACH_CLIENT_SECRET,
        code: authCode,
        grant_type: "authorization_code",
        redirect_uri: OUTREACH_REDIRECT_URI,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const tokens = response.data;
    console.log("Access Token:", tokens.access_token);
    console.log("Refresh Token:", tokens.refresh_token);
    res.send("Authentication successful! You can close this tab.");
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.send("Error retrieving tokens.");
  }
});

app.get("/", (req, res) => {
  res.send(`
    <h2>Check Mail Server</h2>
    <form method="POST" action="/check">
      <input type="email" name="email" required placeholder="Enter email" />
      <button type="submit">Check</button>
    </form>
  `);
});

app.post("/check", (req, res) => {
  const email = req.body.email;
  const domain = email.split("@")[1];

  if (!domain) return res.send("Invalid email address.");

  dns.resolveMx(domain, (err, addresses) => {
    if (err) {
      console.error(err);
      return res.send("Failed to look up MX records.");
    }

    const mxInfo = addresses
      .sort((a, b) => a.priority - b.priority)
      .map((mx) => `${mx.exchange} (priority: ${mx.priority})`)
      .join("<br>");

    res.send(`
      <p><strong>Domain:</strong> ${domain}</p>
      <p><strong>MX Records:</strong><br>${mxInfo}</p>
      <a href="/">Check another</a>
    `);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (process.env.NODE_ENV !== "production") {
    open(`http://localhost:${PORT}`);
  }
});
