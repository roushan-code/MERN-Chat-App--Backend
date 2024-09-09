import { adminSecretKey } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { Chat } from "../models/Chat.js";
import { Message } from "../models/Message.js";
import { User } from "../models/User.js";
import { cookieOption } from "../utils/features.js";
import { ErrorHandler } from "../utils/utility.js";
import jwt from "jsonwebtoken";

export const adminLogin = TryCatch(async(req, res, next)=>{
    const {secretKey} = req.body;

    const isMatched = secretKey === adminSecretKey;

    if(!isMatched) return next(new ErrorHandler("Invalid Admin Key", 401));

    const token = jwt.sign(secretKey, process.env.JWT_SECRET);

    return res.status(200).cookie("chatApp-token-admin", token, {...cookieOption, maxAge: 1000*60*15}).json({
        success: true,
        message: "Admin Logged In, Welcome Boss"
    });
})

export const adminLogout = TryCatch(async(req, res, next)=>{
    return res.status(200).clearCookie("chatApp-token-admin","", {...cookieOption, maxAge: 0}).json({
        success: true,
        message: "Admin Logged Out Successfully"
    })
})

export const getAdminProfile = TryCatch(async(req, res, next)=>{
    return res.status(200).json({
        success: true,
        message: "Admin True"
    })
})


export const getAllUsers = TryCatch(async (req, res) => {
    const allUsers = await User.find({})

    const transformUsers = await Promise.all(allUsers.map(async ({ name, username, avatar, _id }) => {
        const [groups, friends] = await Promise.all([
            Chat.countDocuments({ members: _id, groupChat: true }),
            Chat.countDocuments({ members: _id, groupChat: false })
        ])
        return {
            name,
            username,
            avatar: avatar.url,
            _id,
            groups,
            friends
        }
    }))

    res.status(200).json({
        success: true,
        users: transformUsers
    });
})

export const AllChats = TryCatch(async (req, res) => {
    const allChats = await Chat.aggregate([
        // {
        //     $lookup: {
        //         from: 'chats',
        //         localField: '_id',
        //         foreignField: '_id',
        //         as: 'chats',
        //     }
        // },
        {
            $lookup: {
                from: 'users',
                localField: 'members',
                foreignField: '_id',
                as: 'members',
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'creator',
                foreignField: '_id',
                as: 'creator',
                pipeline: [
                    {
                        $project: {
                            name: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: 'messages',
                localField: '_id',
                foreignField: 'chat',
                as: 'messages'
            },
        },
        {
            $group: {
                _id: '$_id',
                // groupChat: {$first: '$chats.groupChat'},
                name: { $first: '$name' },
                members: { $first: '$members' },
                totalMembers: { $sum: { $size: '$members' } },
                creator: { $first: '$creator' },
                totalMessages: { $sum: { $size: '$messages' } }
            }
        }
    ])

    const transformChats = allChats.map(({
        name,
        members,
        _id,
        creator,
        totalMessages,
        totalMembers,

    }) => ({
        name,
        _id,
        avatar: members.slice(0, 3).map((i ) => i.avatar.url),
        members: members.map(({ _id, avatar }) => ({
            _id,
            avatar: avatar.url
        })),
        creator: creator.map(({ _id, name, avatar }) => ({
            _id, name,
            avatar: avatar.url
        })),
        totalMessages,
        totalMembers
    }))

    res.status(200).json({
        success: true,
        transformChats
    })
})

export const allMessages = TryCatch(async (req, res) => {
    const messages = await Message.find({})
      .populate("sender", "name avatar")
      .populate("chat", "groupChat");


  
    const transformedMessages = messages.map(
      ({ _id, content, attachments,  sender, createdAt, chat }) => ({
        _id,
        attachments,
        content,
        createdAt,
        chat: chat ? chat._id : null,
        groupChat: chat ? chat.groupChat : false,
        sender: {
          _id: sender._id,
          name: sender.name,
          avatar: sender.avatar.url,
        },
      })
    );
  
    return res.status(200).json({
      success: true,
      messages: transformedMessages,
    });
  });

export const getDashboardStats = TryCatch(async (req, res) => {
    const [groupsCount, totalUsers, totalChats, totalMessages] = await Promise.all([
        Chat.countDocuments({groupChat: true}),
        User.countDocuments({}),
        Chat.countDocuments({}),
        Message.countDocuments({}),
    ])

    const today = new Date();

    const last7Days = new Date();

    last7Days.setDate(last7Days.getDate()-7);

    const last7DaysMessages = await Message.find({
        createdAt: {
            $gte: last7Days,
            $lt: today
        }
    }).select("createdAt");

    const messages = new Array(7).fill(0)

    // last7DaysMessages.forEach(({createdAt})=>{
        // const index = Math.floor((today - createdAt) / (1000 * 60 * 60 * 24));
        // messages[index] = messages[index] + 1;
    // })
        
    last7DaysMessages.forEach((message)=>{
        const indexApprox = (today.getTime() - message.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        const index = Math.floor(indexApprox);
        messages[6 - index]++;
    }
    )

    res.status(200).json({
        success: true,
        groupsCount,
        totalUsers,
        totalChats,
        totalMessages,
        messagesChart: messages,

    })
})

