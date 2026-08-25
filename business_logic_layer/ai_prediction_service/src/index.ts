/**
 * Module entry for the AI prediction service.
 * The unified server (server.ts) mounts the aggregator router at /api/prediction;
 * this module never starts its own HTTP listener.
 */
export { default } from "./routes/ai-prediction.routes";
