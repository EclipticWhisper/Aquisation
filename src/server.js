import app from './app.js';
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Add this line

// Pass HOST as the second argument to app.listen
app.listen(PORT, HOST, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
