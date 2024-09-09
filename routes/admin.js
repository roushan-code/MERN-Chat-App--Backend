import express from "express";
import { adminLogin, adminLogout, AllChats, allMessages, getAdminProfile, getAllUsers, getDashboardStats } from "../controllers/admin.js";
import { adminLoginValidator, validate } from "../lib/validators.js";
import { isAdmin } from "../middlewares/auth.js";


const router = express.Router();

router.post("/verify", adminLoginValidator(), validate, adminLogin);
router.get("/logout", adminLogout);


// Only Admin Can Access These route
router.use(isAdmin)
router.get("/", getAdminProfile)
router.get("/users", getAllUsers)
router.get("/chats", AllChats)
router.get("/messages", allMessages)
router.get("/stats", getDashboardStats)


export default router;