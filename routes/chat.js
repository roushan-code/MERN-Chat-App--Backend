import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { addMembers, deleteChat, getChatDetails, getMessages, getMyChats, getMyGroups, leaveGroup, newGroupChat, removeMembers, renameGroup, sendAttachments } from "../controllers/chat.js";
import { attachmentsMulter } from "../middlewares/multer.js";
import { addMemberValidator,  chatIdValidator, newGroupValidator, removeMemberValidator, renameGroupValidator, sendAttachmentsValidator, validate } from "../lib/validators.js";



const router = express.Router();



// After here user must be Logged in to access the routes
router.use(isAuthenticated)

router.post ("/new", newGroupValidator(), validate, newGroupChat);

router.get("/my", getMyChats)

router.get("/my/groups", getMyGroups)

router.put("/addmembers",addMemberValidator(), validate, addMembers)

router.put("/removemember", removeMemberValidator(), validate, removeMembers)

router.delete("/leave/:id", chatIdValidator(), validate, leaveGroup)

// send Attachments
router.post("/message", attachmentsMulter, sendAttachmentsValidator(), validate, sendAttachments);

// get Messages
router.get("/messages/:id", chatIdValidator(), validate, getMessages);

//get ChatDetails, rename, delete
router.route("/:id")
.get(chatIdValidator(), validate, getChatDetails)
.put(renameGroupValidator(), validate, renameGroup)
.delete(chatIdValidator(), validate, deleteChat);

export default router;