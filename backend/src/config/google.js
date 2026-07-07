const { google } = require("googleapis");

const createOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};

const oauth2Client = createOAuth2Client();

module.exports = {
  oauth2Client,
  createOAuth2Client,
};