const express = require("express");
const { protect, requireRole } = require("../middleware/authMiddleware");
const { uploadChatAttachment } = require("../middleware/uploadMiddleware");
const controller = require("../controllers/directMessageController");

const router = express.Router();
router.use(protect, requireRole("student"));
router.get("/search", controller.searchUsers);
router.get("/conversations", controller.listConversations);
router.post("/conversations", controller.startConversation);
router.get("/conversations/:conversationId/messages", controller.listMessages);
router.post("/conversations/:conversationId/messages", controller.sendMessage);
router.patch("/conversations/:conversationId/messages/:messageId", controller.editMessage);
router.delete("/conversations/:conversationId/messages/:messageId", controller.deleteMessage);
router.post("/conversations/:conversationId/read", controller.markRead);
router.post("/conversations/:conversationId/attachments", uploadChatAttachment.single("file"), controller.uploadAttachment);
router.post("/conversations/:conversationId/call-token", controller.createCallToken);
router.post("/conversations/:conversationId/call-decline", controller.declineCall);

module.exports = router;
