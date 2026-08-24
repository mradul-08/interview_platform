const express = require("express");
const { protect, requireRole } = require("../middleware/authMiddleware");
const { uploadChatAttachment } = require("../middleware/uploadMiddleware");
const controller = require("../controllers/directMessageController");

const router = express.Router();
const parseChatAttachment = uploadChatAttachment.single("file");
const handleChatAttachmentUpload = (req, res, next) => {
  parseChatAttachment(req, res, (error) => {
    if (error) return res.status(400).json({ success: false, message: error.message || "Invalid attachment" });
    next();
  });
};

router.use(protect, requireRole("student"));
router.get("/search", controller.searchUsers);
router.get("/conversations", controller.listConversations);
router.post("/conversations", controller.startConversation);
router.post("/conversations/:conversationId/accept", (req, res, next) => { req.params.decision = "accept"; next(); }, controller.respondToRequest);
router.post("/conversations/:conversationId/decline", (req, res, next) => { req.params.decision = "decline"; next(); }, controller.respondToRequest);
router.get("/conversations/:conversationId/messages", controller.listMessages);
router.post("/conversations/:conversationId/messages", controller.sendMessage);
router.patch("/conversations/:conversationId/messages/:messageId", controller.editMessage);
router.delete("/conversations/:conversationId/messages/:messageId", controller.deleteMessage);
router.post("/conversations/:conversationId/read", controller.markRead);
router.post("/conversations/:conversationId/attachments", handleChatAttachmentUpload, controller.uploadAttachment);
router.post("/conversations/:conversationId/call-token", controller.createCallToken);
router.post("/conversations/:conversationId/call-decline", controller.declineCall);
router.post("/users/:userId/block", controller.blockUser);
router.post("/users/:userId/unblock", controller.unblockUser);

module.exports = router;

