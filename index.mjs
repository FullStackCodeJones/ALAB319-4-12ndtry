import express from "express";

const PORT = 5050;
const app = express();

// Import your routes
import grades from "./routes/grades.mjs";
import grades_agg from "./routes/grades_agg.mjs";
import statsRoute from "./routes/stats_id.mjs"; // Import stats route
app.use("/stats", statsRoute); // Mount the route

app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to the API.");
});

// CRUD routes
app.use("/grades", grades);

// Aggregation routes
app.use("/grades-agg", grades_agg);

// Stats route
app.use("/api", statsRoute); // Mount stats route under '/api'

// Global error handling
app.use((err, _req, res, next) => {
  console.error(err.stack); // Log the error
  res.status(500).send("Seems like we messed up somewhere...");
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
