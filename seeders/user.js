import { newUser } from "../controllers/user.js";
import { Chat } from "../models/Chat.js";
import { User } from "../models/User.js";
import {faker} from "@faker-js/faker";

export const createUser = async(numUsers)=>{
    try {
        const usersPromise = [];
        for (let i = 0; i < numUsers; i++) {
            const tempUser = User.create({
                name: faker.person.fullName(),
                username: faker.internet.userName(),
                password: "password",
                bio: faker.lorem.sentence(10),
                avatar: {
                    public_id: faker.system.fileName(),
                    url: faker.image.avatar()
                }
            })
            usersPromise.push(tempUser);
        }
        await Promise.all(usersPromise);
        console.log("user created", numUsers)
        process.exit(1)
    } catch (error) {
        console.log(error)
        process.exit(1);
    }
}

export const createSingleChat = async (chatsCount)=>{
    try {
        const chatsPromise = [];
        for (let i = 0; i < chatsCount; i++) {
            const tempChat = Chat.create({
                name: faker.lorem.word(),
                creator: "616f9b3c8c4b3c0c7c7e4a7b",
                members: ["616f9b3c8c4b3c0c7c7e4a7b"]
            })
            chatsPromise.push(tempChat);
        }
        await Promise.all(chatsPromise);
        console.log("chats created", chatsCount)
        process.exit(1)
    } catch (error) {
        console.log(error)
        process.exit(1);
    }
    
}

export const createGroupChat = async (chatsCount)=>{
    try {
        const chatsPromise = [];
        for (let i = 0; i < chatsCount; i++) {
            const tempChat = Chat.create({
                name: faker.lorem.word(),
                creator: "616f9b3c8c4b3c0c7c7e4a7b",
                members: ["616f9b3c8c4b3c0c7c7e4a7b", "616f9b3c8c4b3c0c7c7e4a7b"]
            })
            chatsPromise.push(tempChat);
        }
        await Promise.all(chatsPromise);
        console.log("chats created", chatsCount)
        process.exit(1)
    } catch (error) {
        console.log(error)
        process.exit(1);
    }
}

