const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const basePort = Number(process.env.PORT || 4002);

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

function listenOnPort(portToTry) {
  const server = app.listen(portToTry, () => {
    console.log(`Server listening on port ${portToTry}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${portToTry} is in use, trying ${portToTry + 1}`);
      listenOnPort(portToTry + 1);
    } else {
      console.error('Server error', err);
      process.exit(1);
    }
  });
}

listenOnPort(basePort);
