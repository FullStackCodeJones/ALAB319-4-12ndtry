import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";

const router = express.Router();

//* It is not best practice to separate these routes
//* like we have done here. This file was created
//* specifically for educational purposes, to contain
//* all aggregation routes in one place.

//* Grading Weights by Score Type:
//* - Exams: 50%
//* - Quizes: 30%
//* - Homework: 20%

// New route to get stats for learners based on weighted average
router.get("/grades/stats", async (req, res) => {
  let collection = await db.collection("grades");

  try {
    // Aggregation pipeline
    let result = await collection
      .aggregate([
        // Step 1: Unwind and group by class as we did earlier to calculate averages
        { $unwind: { path: "$scores" } },
        {
          $group: {
            _id: "$learner_id", // Group by learner_id
            quiz: {
              $push: {
                $cond: {
                  if: { $eq: ["$scores.type", "quiz"] },
                  then: "$scores.score",
                  else: "$$REMOVE",
                },
              },
            },
            exam: {
              $push: {
                $cond: {
                  if: { $eq: ["$scores.type", "exam"] },
                  then: "$scores.score",
                  else: "$$REMOVE",
                },
              },
            },
            homework: {
              $push: {
                $cond: {
                  if: { $eq: ["$scores.type", "homework"] },
                  then: "$scores.score",
                  else: "$$REMOVE",
                },
              },
            },
          },
        },
        // Step 2: Calculate weighted average for each learner
        {
          $project: {
            _id: 0,
            learner_id: "$_id",
            avg: {
              $sum: [
                { $multiply: [{ $avg: "$exam" }, 0.5] },
                { $multiply: [{ $avg: "$quiz" }, 0.3] },
                { $multiply: [{ $avg: "$homework" }, 0.2] },
              ],
            },
          },
        },
        // Step 3: Filter learners with avg > 70%
        {
          $match: {
            avg: { $gt: 70 },
          },
        },
        // Step 4: Count number of learners with avg > 70%
        {
          $group: {
            _id: null,
            learnersAbove70: { $sum: 1 },
          },
        },
      ])
      .toArray();

    // Return result as response
    res.status(200).send(result);
  } catch (error) {
    console.error("Failed to get stats:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

// Get the weighted average of a specified learner's grades, per class
router.get("/learner/:id/avg-class", async (req, res) => {
  let collection = await db.collection("grades");

  try {
    let result = await collection
      .aggregate([
        {
          $match: { learner_id: Number(req.params.id) },
        },
        {
          $unwind: { path: "$scores" },
        },
        {
          $group: {
            _id: "$class_id",
            quiz: {
              $push: {
                $cond: {
                  if: { $eq: ["$scores.type", "quiz"] },
                  then: "$scores.score",
                  else: "$$REMOVE",
                },
              },
            },
            exam: {
              $push: {
                $cond: {
                  if: { $eq: ["$scores.type", "exam"] },
                  then: "$scores.score",
                  else: "$$REMOVE",
                },
              },
            },
            homework: {
              $push: {
                $cond: {
                  if: { $eq: ["$scores.type", "homework"] },
                  then: "$scores.score",
                  else: "$$REMOVE",
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            class_id: "$_id",
            avg: {
              $sum: [
                { $multiply: [{ $avg: "$exam" }, 0.5] },
                { $multiply: [{ $avg: "$quiz" }, 0.3] },
                { $multiply: [{ $avg: "$homework" }, 0.2] },
              ],
            },
          },
        },
      ])
      .toArray();

    if (!result) {
      res.status(404).send("Not found");
    } else {
      res.status(200).send(result);
    }
  } catch (error) {
    console.error("Error getting learner class average:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

// Aggregate statistics for all learners by class ID
router.get("/stats/:id", async (req, res) => {
  const classId = Number(req.params.id); // Convert class_id to number

  if (isNaN(classId)) {
    return res.status(400).send({ error: "Invalid class ID format" });
  }

  try {
    const stats = await db
      .collection("grades")
      .aggregate([
        { $match: { class_id: classId } }, // Filter by class_id
        {
          $project: {
            learner_id: 1,
            class_id: 1,
            weightedAverage: { $avg: "$scores.score" },
          },
        },
        {
          $group: {
            _id: null,
            totalLearners: { $sum: 1 },
            above70Count: {
              $sum: { $cond: [{ $gt: ["$weightedAverage", 70] }, 1, 0] },
            },
          },
        },
        {
          $project: {
            totalLearners: 1,
            above70Count: 1,
            above70Percentage: {
              $multiply: [
                { $divide: ["$above70Count", "$totalLearners"] },
                100,
              ],
            },
          },
        },
      ])
      .toArray();

    if (!stats.length) {
      return res.status(404).send({ error: "No data found for this class" });
    }

    res.status(200).send(stats[0]);
  } catch (error) {
    console.error("Failed to calculate class stats:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

// Create indexes on fields for better performance
router.post(`/create-indexes`, async (req, res) => {
  try {
    const collection = await db.collection(`grades`);

    // Create single-field index on class_id
    await collection.createIndex({ class_id: 1 });

    // Create single-field index on learner_id
    await collection.createIndex({ learner_id: 1 });

    // Create compound index on learner_id and class_id
    await collection.createIndex({ learner_id: 1, class_id: 1 });

    res.status(200).send({ message: "Indexes created successfully" });
  } catch (error) {
    console.error(`Error creating indexes`, error);
    res.status(500).send({ error: "Failed to create indexes" });
  }
});

export default router;
