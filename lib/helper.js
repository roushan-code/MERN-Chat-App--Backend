import { userSocketIDs } from "../api/index.js";

export const getOtherMember =(member, userId)=>{
    return member.find(m=>m._id.toString() !== userId.toString())
}

export const getSockets = (users=[])=>{ 
    return users.map((user)=> userSocketIDs.get(user.toString()));
}

export const getBase64 = (file) => 
    `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
