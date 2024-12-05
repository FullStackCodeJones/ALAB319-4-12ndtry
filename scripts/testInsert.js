import db from "../db/conn.mjs";

async function testInsert() {
  try {
    const result = await db.collection("grades").insertOne({
      class_id: 400,
      learner_id: -1,
    });
    console.log("Insert result:", result);
  } catch (error) {
    console.error("Error inserting document:", error);
  } finally {
    process.exit();
  }
}

testInsert();
