import { ALERT, NEW_MESSAGE, NEW_MESSAGE_ALERT, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";
import { TryCatch } from "../middlewares/error.js";
import { Chat } from "../models/Chat.js";
import { Message } from "../models/Message.js";
import { User } from "../models/User.js";
import { deleteFilesFromCloudinary, emitEvent, uploadFilesToCloudinary } from "../utils/features.js";
import { ErrorHandler } from "../utils/utility.js";

export const newGroupChat = TryCatch(async (req, res, next) => {
    const { name, members } = req.body;

    if (!members || members.length < 2) {
        return next(new ErrorHandler("Group chat must have at least 3 members", 400));
    }
    const allMembers = [...members, req.user];

    const chat = await Chat.create({
        name,
        groupChat: true,
        members: allMembers,
        creator: req.user,

    });
    //  console.log(chat)

    emitEvent(req, ALERT, allMembers, {message: `Welcome to ${name} group`, chatId: chat._id});
    emitEvent(req, REFETCH_CHATS, members);

    return res.status(201).json({
        success: true,
        data: "Group Chat Created",
    })
}
);
export const getMyChats = TryCatch(async (req, res, next) => {

    const chats = await Chat.find({ members: req.user }).populate("members", "name avatar");


    const transformedChats = chats.map(({
        _id, name, members, groupChat
    }) => {
        const otherMember = getOtherMember(members, req.user);
        return {
            _id,
            name: groupChat ? name : otherMember.name,
            groupChat,
            avatar: groupChat ? members.slice(0, 3).map(({ avatar }) => avatar.url) : [otherMember.avatar.url],
            members: members.reduce((prev, curr) => {
                if (curr._id.toString() !== req.user.toString()) {
                    prev.push(curr._id);
                }
                return prev;
            }, [])
        };
        // members.filter(i=>i._id.toString() !== req.user.toString()).map(i=>_id); // map me condition nhi lga skte
    })



    return res.status(200).json({
        success: true,
        chat: transformedChats
    })
}
);

export const getMyGroups = TryCatch(async (req, res, next) => {
    const chats = await Chat.find({ members: req.user, groupChat: true, creator: req.user }).populate("members", "name avatar");

    const groups = chats.map(({ members, _id, groupChat, name }) => {
        return {
            _id,
            name,
            groupChat,
            avatar: members.slice(0, 3).map(({ avatar }) => avatar.url)
        }
    })

    return res.status(200).json({
        success: true,
        groups
    })
})
export const addMembers = TryCatch(async (req, res, next) => {
    const { chatId, members } = req.body;

    const chat = await Chat.findById(chatId);

    if (!chat) {
        return next(new ErrorHandler("Chat not found", 404));
    }

    if (!chat.groupChat)
        return next(new ErrorHandler("This is not a group chat", 400));

    if (chat.creator.toString() !== req.user.toString()) {
        return next(new ErrorHandler("You are not allowed to add members", 403));
    }

    const allNewMembersPromise = members.map(i => User.findById(i, "name"))

    const allNewMembers = await Promise.all(allNewMembersPromise);

    const addMembersId = allNewMembers.map((i) => i._id);

    const allMembersId = chat.members.map((i) => i._id)
    // console.log(allMembersId);

    const uniqueMembers = addMembersId.filter(i => !allMembersId.toString().includes(i.toString()))

    chat.members.push(...uniqueMembers);

    if (chat.members.length > 100) {
        return next(new ErrorHandler("Members limit exceed", 400));
    }

    await chat.save();
    
    const allChatMembers = chat.members.map((i)=>i.toString());

    const allUsersName = allNewMembers.map((i) => i.name).join(", ");

    const chatWithNewMembers = await Chat.findById(chatId);

    emitEvent(req, ALERT, chat.members, `${allUsersName} has been added to ${chat.name} group`);
    emitEvent(req, REFETCH_CHATS, chatWithNewMembers.members);

    return res.status(200).json({
        success: true,
        message: "Members Added Successfully"
    })
})

export const removeMembers = TryCatch(async (req, res, next) => {
    const { userId, chatId } = req.body;
    // console.log(userId)
    // console.log(chatId)

    const [chat, userThatWillBeRemoved] = await Promise.all([
        Chat.findById(chatId),
        User.findById(userId, "name")
    ])

    // console.log(chat)
    // console.log(userThatWillBeRemoved)
    
    if (!chat) {
        return next(new ErrorHandler("Chat not found", 404));
    }

    if (!chat.groupChat)
        return next(new ErrorHandler("This is not a group chat", 400));

    if (chat.creator.toString() !== req.user.toString()) {
        return next(new ErrorHandler("You are not allowed to add members", 403));
    }
    if (chat.members.length <= 3) {
        return next(new ErrorHandler("Group must have at least 3 members", 404));
    }

    const allChatMembers = chat.members.map((i)=>i.toString());

    
    chat.members = chat.members.filter((member) => member.toString() !== userId.toString());

    await chat.save();

    emitEvent(
        req,
        ALERT,
        chat.members,
        {message: `${userThatWillBeRemoved.name} has been removed from the group`, chatId}
    );
    
    emitEvent(req, REFETCH_CHATS, allChatMembers);


    return res.status(200).json({
        success: true,
        message: "Member removed successfully",
    })
})

export const leaveGroup = TryCatch(async (req, res, next) => {
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
        return next(new ErrorHandler("Chat not found", 404));
    }

    if (!chat.groupChat)
        return next(new ErrorHandler("This is not a group chat", 400));

    const remainingMembers = chat.members.filter(
        (member) => member.toString() !== req.user.toString()
    );

    if (remainingMembers.length <= 2) {
        return next(new ErrorHandler("Group must have at least 3 members", 404));
    }


    if (chat.creator.toString() === req.user.toString()) {
        const randomElement = Math.floor(Math.random() * remainingMembers.length)
        chat.creator = remainingMembers[randomElement];
    }

    chat.members = chat.members.filter((member) => member.toString() !== req.user.toString());

    const [user] = await Promise.all([
        User.findById(req.user, "name"),
        chat.save()
    ]);

    emitEvent(
        req,
        ALERT,
        chat.members,
        {message: `User ${user.name} has left the group`, chatId}
    );


    return res.status(200).json({
        success: true,
        message: "You have left the group successfully"
    });
})

export const sendAttachments = TryCatch(async (req, res, next) => {
    const { chatId } = req.body;

    const files = req.files || [];

    if(files.length < 1)
        return next(new ErrorHandler("Please provide attachments", 400));
    if(files.length > 5)
        return next(new ErrorHandler("You can upload maximum of 5 files", 400));

    const [chat, me] = await Promise.all([
        Chat.findById(chatId),
        User.findById(req.user, "name")
    ]);


    if (!chat) {
        return next(new ErrorHandler("Chat not found", 404));
    }


    if (files.length < 1) return next(new ErrorHandler("Please provides attachments", 400));

    // Upload files here
    const attachments = await uploadFilesToCloudinary(files);

    const messageForDB = { content: "", attachments, sender: me._id, chat: chatId };

    const messageForRealTime = {
        ...messageForDB,
        sender: {
            _id: me._id,
            name: me.name
        }
    };

    const message = await Message.create(messageForDB);

    emitEvent(req, NEW_MESSAGE, chat.members, {
        message: messageForRealTime, chatId
    });

    emitEvent(req, NEW_MESSAGE_ALERT, chat.members, {chatId});

    return res.status(200).json({
        success: true,
        message
    })
})

export const getChatDetails = TryCatch(async(req,res,next)=>{
    const chatId = req.params.id;
    
    if(req.query.populate){
        const chat = await Chat.findById(chatId).populate("members", "name avatar").lean(); // lean use krne se 
        
        if(!chat) return next(new ErrorHandler("Chat not found", 404));
        
        chat.members = chat.members.map(({_id, name, avatar})=>({ // chat members ab database ka object nh rhega blki javaScript ka object rhega
            _id,
            name,
            avatar: avatar.url
        }))
        
        return res.status(200).json({
            success: true,
            chat
        })

    }else{
        const chat = await Chat.findById(req.params.id);

        if(!chat) return next(new ErrorHandler("Chat not found", 404));

        return res.status(200).json({
            success: true,
            chat
        })

    }

})

export const renameGroup = TryCatch(async(req,res,next)=>{
    const chatId = req.params.id;
    // console.log(chatId)

    const {name} = req.body;

    const chat = await Chat.findById(chatId);

    if(!chat) return next(new ErrorHandler("Chat not found", 404));

    if(!chat.groupChat){
        return next(
            new ErrorHandler("This is not a group chat", 400)
        )
    }
    if(chat.creator.toString() !== req.user.toString()){
        return next(new ErrorHandler("You are not allowed to rename the group", 403));
    }
    chat.name = name;

    await chat.save();

    emitEvent(req, REFETCH_CHATS, chat.members);

    return res.status(200).json({
        success: true,
        message: "Group renamed successfully"
    })
})

export const deleteChat = TryCatch(async(req,res,next)=>{
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);

    if(!chat) return next(new ErrorHandler("Chat not found", 404));

    if(chat.groupChat && chat.creator.toString() !== req.user.toString()){
        return next(new ErrorHandler("You are not allowed to delete this chat", 403));
    }

    if(!chat.groupChat && !chat.members.includes(req.user.toString())){
        return next(new ErrorHandler("You are not allowed to delete this chat", 403));
    }

    // Here we have to delete all messages as well as attachments or files from cloudinary
    
    const messagesWithAttachments = await Message.find({
        chat: chatId,
        attachments: { $exists: true, $ne: [] }
    });
    

    const public_ids = [];
    
    messagesWithAttachments.forEach(({attachments})=>
        attachments.forEach(({public_id})=>{
            public_ids.push(public_id);
        })
    );
    
    await Promise.all([
        // Delete Files From Cloudinary
        deleteFilesFromCloudinary(public_ids),
        // Delete Messages
        Message.deleteMany({chat: chatId}),
        // Delete Chat
        Chat.findByIdAndDelete(chatId)
    ])
    
    emitEvent(req, REFETCH_CHATS, chat.members);
    

    return res.status(200).json({
        success: true,
        message: "Chat deleted successfully"
    })
})

export const getMessages = TryCatch(async(req,res,next)=>{
    const chatId = req.params.id;

    const {page = 1} = req.query;

    const limit = 20;
    const skip = (page -1) * limit; 

    const chat = await Chat.findById(chatId)

    if(!chat) return next(new ErrorHandler("Chat not found", 404));

    if(!chat.members.includes(req.user.toString())){
        return next(new ErrorHandler("You are not allowed to view this chat", 403));
    }

    const [messages, totalMessagesCount] = await Promise.all([
        Message.find({chat: chatId})
        .populate("sender", "name avatar")
        .sort({createdAt: -1})  // sort("-createdAt")
        .skip(skip)
        .limit(limit)
        .lean(),
        Message.countDocuments({chat: chatId})
    ]);

    const totalPages = Math.ceil(totalMessagesCount / limit) || 0;

    return res.status(200).json({
        success: true,
        messages:  messages.reverse(),
        totalPages,
    })
})