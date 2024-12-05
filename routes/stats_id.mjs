import express from "express";
import Grade from "./grades.mjs"; // Ensure the file extension matches your setup

const router = express.Router();

// Route to get stats for a class by class_id
router.get("/:id", async (req, res) => {
  try {
    const classId = req.params.id; // Retrieve class_id from the URL

    // Validate classId (ensure it's a valid format, e.g., string or ObjectId)
    if (!classId) {
      return res.status(400).json({ error: "Class ID is required" });
    }

    // Aggregation pipeline to calculate the average and total learners
    const pipeline = [
      {
        $match: { class_id: classId }, // Filter grades by class_id
      },
      {
        $unwind: "$scores", // Handle individual scores if they are in an array
      },
      {
        $group: {
          _id: "$class_id", // Group results by class_id
          average: {
            $avg: {
              $multiply: ["$scores.value", "$scores.weight"], // Weighted average
            },
          },
          totalLearners: { $sum: 1 }, // Count total number of learners (entries)
        },
      },
      {
        $project: {
          _id: 0, // Exclude _id from the output
          class_id: "$_id", // Rename _id to class_id
          average: { $round: ["$average", 2] }, // Round average to 2 decimal places
          totalLearners: 1, // Include total learners
        },
      },
    ];

    // Execute the aggregation pipeline
    const result = await Grade.aggregate(pipeline);

    // If no data found, return a 404 error
    if (result.length === 0) {
      return res
        .status(404)
        .json({ error: "No data found for the specified class" });
    }

    // Return the result (first item, as aggregation returns an array)
    res.json(result[0]);
  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router; // Use ES Modules syntax
