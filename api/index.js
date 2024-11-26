import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 as uuid } from 'uuid';
import { CHAT_JOIN, CHAT_LEAVE, NEW_MESSAGE, NEW_MESSAGE_ALERT, ONLINE_USERS, START_TYPING, STOP_TYPING } from "../constants/events.js";
import { getSockets } from "../lib/helper.js";
import { errorMiddleware } from "../middlewares/error.js";
import { Message } from "../models/Message.js";
import adminRoute from "../routes/admin.js";
import chatRouter from "../routes/chat.js";
import userRouter from "../routes/user.js";
import { connectDB } from "../utils/features.js";

import { v2 as cloudinary } from 'cloudinary';
import { corsOptions } from "../constants/config.js";
import { socketAuthentication } from "../middlewares/auth.js";
// import { createGroupChat, createSingleChat, createUser } from "./seeders/user.js";

dotenv.config({
    path: "./.env",
})

const mongoURI = process.env.MONGO_URI;
const port = process.env.PORT || 3000;
const envNode = process.env.NODE_ENV.trim() || "PRODUCTION";
export const adminSecretKey = process.env.ADMIN_SECRET_KEY || "slieflfsklje!if354#@345gsd#";

const userSocketIDs = new Map();
const onlineUsers = new Set();

const app = express();
const server = createServer(app)
const io = new Server(server, {
    cors: corsOptions,
})

app.set("io", io);

// Using Middlewares Here
app.use(express.json());
app.use(cookieParser())
app.use(cors(corsOptions))
app.use(express.urlencoded({ extended: true })); // form data access krne ke liye

connectDB(mongoURI);
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})


app.use('/api/v1/user', userRouter);
app.use('/api/v1/chat', chatRouter);
app.use('/api/v1/admin', adminRoute)

app.get("/", (req, res)=>{
    res.send("hello world");
})

io.use((socket, next)=>{
    socketAuthentication(socket, next)
})

io.on("connection", (socket)=>{

    const user = socket.user;
    userSocketIDs.set(user._id.toString(), socket.id)
    
    // console.log(userSocketIDs)
    socket.on(NEW_MESSAGE, async ({chatId, members, message})=>{
        
        const messageForRealTime = {
            content: message,
            _id: uuid(),
            sender: {
                _id: user._id,
                name: user.name
            },
            chat: chatId,
            createdAt: new Date().toISOString()
            };

            const messageForDB = {
                content: message,
                sender: user._id,
                chat: chatId
            }

            console.log("Emitting message for real time", members)

            const membersSocket = getSockets(members);
            io.to(membersSocket).emit(NEW_MESSAGE,{
                chatId,
                message: messageForRealTime
            })
            io.to(membersSocket).emit(NEW_MESSAGE_ALERT,{chatId})
        
        try {
            await Message.create(messageForDB)
        } catch (error) {
            console.log(error)
        }
    })

    socket.on(START_TYPING, ({members, chatId})=>{
        // console.log("start typing", members, chatId)
        const membersSocket = getSockets(members);
        socket.to(membersSocket).emit(START_TYPING, {chatId})
    })

    socket.on(STOP_TYPING, ({members, chatId})=>{
        // console.log("stop typing", members, chatId)

        const membersSocket = getSockets(members);
        socket.to(membersSocket).emit(STOP_TYPING, {chatId})
    })
    socket.on(CHAT_JOIN, ({userId, members})=>{
        onlineUsers.add(userId.toString());

        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers))
    })
    socket.on(CHAT_LEAVE, ({userId,members})=>{
        onlineUsers.delete(userId.toString());

        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers))
    })

    socket.on("disconnect", ()=>{
        console.log("user disconnected");
        userSocketIDs.delete(user._id.toString());
        onlineUsers.delete(user._id.toString());
        socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
        
    })
})

app.use(errorMiddleware)



server.listen(port, ()=>{
    console.log("Server is running on port 3000")
})

export { envNode, userSocketIDs };