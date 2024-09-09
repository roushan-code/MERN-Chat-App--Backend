import express from "express"
import { acceptFriendRequest,  getMyFriends, getMyProfile, getNotifications, login, logout, newUser, searchUser, sendFriendRequest } from "../controllers/user.js";
import { singleAvatar } from "../middlewares/multer.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { acceptRequestValidator, loginValidator, registerValidator, sendRequestValidator, validate } from "../lib/validators.js";


const router = express.Router();

router.post("/new",  singleAvatar, registerValidator(), validate, newUser)
router.post("/login",loginValidator(), validate, login)

// After here user must be Logged in to access the routes
router.use(isAuthenticated)
router.get("/me",  getMyProfile);
router.get("/logout",  logout);
router.get("/search",  searchUser);
router.put("/send-request", 
    sendRequestValidator(), 
validate,  
sendFriendRequest);

router.put("/accept-request", 
    acceptRequestValidator(), 
validate,  
acceptFriendRequest);

router.get("/notifications", getNotifications);
router.get("/friends", getMyFriends);

export default router;