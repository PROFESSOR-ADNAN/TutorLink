const router = require("express").Router();
const {
  getMessages,
  sendMessage,
  getConversations,
} = require("../controllers/chat.controller");
const { protect } = require("../middleware/auth.middleware");

router.use(protect);

router.get("/conversations", getConversations);
router.get("/:userId", getMessages);
router.post("/", sendMessage);

module.exports = router;
