// Script to get an auth token from the auth service
const axios = require("axios");
const fs = require("fs");

// Configuration
const AUTH_SERVICE_URL = "http://localhost:8000"; // Auth service URL
const TOKEN_FILE = "./token.json";

// Login credentials
const credentials = {
  username: "admin", // Replace with your actual credentials
  password: "admin123", // Replace with your actual password
};

const getAuthToken = async () => {
  try {
    console.log("Attempting to login and get auth token...");

    const response = await axios.post(`${AUTH_SERVICE_URL}/login`, credentials);

    if (response.data && response.data.token) {
      console.log("Login successful!");

      // Save token to file for later use
      const tokenData = {
        token: response.data.token,
        refreshToken: response.data.refresh_token || null,
        expiresAt: response.data.expires_at || null,
        obtainedAt: new Date().toISOString(),
      };

      fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));
      console.log(`Token saved to ${TOKEN_FILE}`);

      console.log("\nUse this token in your test scripts:");
      console.log(response.data.token);

      return response.data.token;
    } else {
      throw new Error("No token in response");
    }
  } catch (error) {
    console.error("Failed to get auth token:");

    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error("Response data:", error.response.data);
    } else if (error.request) {
      console.error("No response received");
    } else {
      console.error("Error:", error.message);
    }

    return null;
  }
};

// Run if called directly
if (require.main === module) {
  getAuthToken();
}

module.exports = { getAuthToken };
