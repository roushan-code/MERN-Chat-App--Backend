import { compare } from "bcrypt";
import { User } from "../models/User.js";
import { cookieOption, emitEvent, sendToken, uploadFilesToCloudinary } from "../utils/features.js";
import { TryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "../utils/utility.js";
import { Chat } from "../models/Chat.js";
import { Request } from "../models/Request.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";

// Create a new user and save it to the database and save token in cookie
export const newUser = TryCatch(async (req, res,next) => {
    const { name, username, password, bio } = req.body;

    // console.log(req.body);
    const file = req.file;
    if (!file) return next(new ErrorHandler("Please Upload avatar", 400));

    const result = await uploadFilesToCloudinary([file]);
   
    const avatar = {
        public_id: result[0].public_id,
        url: result[0].url
    }

    const user = await User.create({
        name,
        username,
        password,
        bio,
        avatar,
    });
    

    sendToken(res, user, 201, "User created")
})

// Login user and save token in cookie
export const login = TryCatch(async (req, res, next) => {
    const { username, password } = req.body;

    const user = await User.findOne({ username }).select("+password");

    if (!user) return next(new ErrorHandler("Invalid Username or Password", 404));

    const isPasswordMatch = await compare(password, user.password);

    if (!isPasswordMatch) {
        return next(new ErrorHandler("Invalid Username or Password", 404));
    }

    sendToken(res, user, 200, `Welcome Back, ${user.name}`);

})

export const getMyProfile = TryCatch(async (req, res) => {
    const user = await User.findById(req.user);
    

    res.status(200).json({
        success: true,
        data: user
    })

})
export const logout = TryCatch(async (req, res) => {


    res.status(200).cookie("chatApp-token", "", { ...cookieOption, maxAge: 0 }).json({
        success: true,
        data: "Logout Successfully"
    })

})
export const searchUser = TryCatch(async (req, res) => {
    const { name = "" } = req.query;

    // Finding All My Chats
    const myChats = await Chat.find({ groupChat: false, members: req.user });

    // const allUsersFromMyChat = myChats.map(chat => chat.members).flat().filter(member => member != req.user);


    // All Users from my chats means friends or people I have chatted with
    const allUsersFromMyChat = myChats.flatMap(chat => chat.members).filter(member => member != req.user);

    // Finding all users except me and my friends
    const allUserExceptMeAndFriends = await User.find({
        $and: [
            { name: { $regex: name, $options: "i" } },
            { _id: { $nin: allUsersFromMyChat } },
            { _id: { $ne: req.user } }
        ]
    })

    // Modifying the response
    const users = allUserExceptMeAndFriends.map(({ _id, name, avatar }) => ({
        _id, name, avatar: avatar.url
    }))


    res.status(200).json({
        success: true,
        users
    })

})

export const sendFriendRequest = TryCatch(async (req, res, next) => {
    const { userId } = req.body;

    const request = await Request.findOne({
        $or: [
            { sender: req.user, receiver: userId },
            { sender: userId, receiver: req.user }
        ]
    })

    if (request) return next(new ErrorHandler("Request have already sent", 400))

    await Request.create({
        sender: req.user,
        receiver: userId
    })

    emitEvent(req, NEW_REQUEST, [userId])
    
    res.status(200).json({
        success: true,
        message: "Friend Request Sent"
    })

})
export const acceptFriendRequest = TryCatch(async (req, res, next) => {
    const { requestId, accept } = req.body;

    const request = await Request.findById(requestId).populate("sender", "name").populate("receiver", "name");

    if (!request)
        return next(new ErrorHandler("Request not found", 404));

    if (request.receiver._id.toString() !== req.user.toString())
        return next(new ErrorHandler("You are not authorized to accept this request", 401));

    if (!accept) {
        await request.deleteOne();
        return res.status(200).json({
            success: true,
            message: "Friend Request Rejected"
        })
    }

    const members = [request.sender._id, request.receiver._id];

    await Promise.all([Chat.create({
        name: `${request.sender.name} and ${request.receiver.name}`,
        members
    }), request.deleteOne()
    ])


    emitEvent(req, REFETCH_CHATS, members)
    res.status(200).json({
        success: true,
        message: "Friend Request Acceptes",
        sendeId: request.sender._id
    })

})
export const getNotifications = TryCatch(async (req, res, next) => {
    const requests = await Request.find({ receiver: req.user }).populate("sender", "name avatar");

    const allRequests = requests.map(({ _id, sender }) => ({
        _id,
        sender: {
            _id: sender._id,
            name: sender.name,
            avatar: sender.avatar.url
        }
    }))

    res.status(200).json({
        success: true,
        allRequests
    })

})

export const getMyFriends = TryCatch(async (req, res, next) => {
    const chatId = req.query.chatId;


    const chats = await Chat.find({
        members: req.user,
        groupChat: false,
    }).populate("members", "name avatar");

    const friends = chats.map(({ members }) => {
        const otherUser = getOtherMember(members, req.user);
        return {
            _id: otherUser._id,
            name: otherUser.name,
            avatar: otherUser.avatar.url
        }
    })

    if (chatId) {
        const chat = await Chat.findById(chatId);
        const availableFriends = friends.filter(
            (friend) => !chat.members.includes(friend._id)
        );
        console.log(chat)

        return res.status(200).json({
            success: true,
            availableFriends
        })
    } else {
        return res.status(200).json({
            success: true,
            friends
        })
    }

})