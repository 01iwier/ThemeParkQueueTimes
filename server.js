const express = require('express');
const app = express();
const PORT = 3000;
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

const fetchQueueTimes = async (apiUrl) => {
  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }

  return await response.json();
};

app.get('/api/queue-times', async (req, res) => {
  try {
    const disneylandData = await fetchQueueTimes('https://queue-times.com/parks/4/queue_times.json');
    const wdspData = await fetchQueueTimes('https://queue-times.com/parks/28/queue_times.json');
    res.json({ disneylandData, wdspData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
