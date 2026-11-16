import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import purchaseRoutes from "./routes/purchaseRoutes.js";
import premiumRoutes from "./routes/premiumRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import passwordRoutes from "./routes/passwordRoutes.js";
import logger from "./utils/logger.js";
import { errorHandler } from "./middleware/errorMiddleware.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRoutes);
app.use("/expenses", expenseRoutes);
app.use("/purchase", purchaseRoutes);
app.use("/premium", premiumRoutes);
app.use("/ai", aiRoutes);
app.use("/password", passwordRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Expense Tracker Backend Running" });
});

app.use(errorHandler);

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection", {
    stack: reason?.stack || String(reason),
  });
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", { stack: err.stack });
});

export default app;
