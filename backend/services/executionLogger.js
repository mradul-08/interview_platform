const ExecutionLog = require("../models/ExecutionLog");

async function saveExecutionLog(payload) {
  return ExecutionLog.create(payload);
}

async function getExecutionLogById(executionId) {
  return ExecutionLog.findOne({ executionId }).lean();
}

module.exports = {
  saveExecutionLog,
  getExecutionLogById,
};
