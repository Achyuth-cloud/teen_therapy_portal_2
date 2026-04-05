const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = require('./src/app');

const PORT = process.env.PORT || 9000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
