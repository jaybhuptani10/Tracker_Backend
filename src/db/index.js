import mongoose from "mongoose";
const DB_NAME = "tracker";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URL}/${DB_NAME}`,
      {
        serverSelectionTimeoutMS: 5000, // Fail after 5s if DB not found
        socketTimeoutMS: 45000,
      },
    );
    console.log(
      "\n MongoDB connection successfull : ",
      connectionInstance.connection.host,
    );
  } catch (error) {
    console.error("MongoDB connection error : ", error);
    // process.exit(1); // Standard for containers, but bad for frequent restarts in Serverless.
    // Letting it throw or just return allows the app to potentially handle the error or log it better via the HTTP response.
    // process.exit(1);
    console.log("Proceeding without DB connection...");
  }
};
export default connectDB;
