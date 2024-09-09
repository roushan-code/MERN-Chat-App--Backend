import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dotenv from "dotenv"
import { v4 as uuid } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';
import { getBase64, getSockets } from "../lib/helper.js";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

dotenv.config({
    path: "../.env",
})

export const cookieOption = {
    maxAge: 15 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: true,
    sameSite: "none",
}

export const connectDB = (url) => {
    mongoose.connect(url, { dbName: "ChatApp" })
        .then((data) => console.log(`Connected to DataBase: ${data.connection.host}`))
        .catch((err) => { throw err })
}

export const sendToken = (res, user, code, message) => {
    const token = jwt.sign({
        id: user._id,
    }, process.env.JWT_SECRET, {
        expiresIn: "15d"
    })



    return res.status(code)
        .cookie("chatApp-token", token, cookieOption)
        .json({
            success: true,
            message,
            user
        })
}

export const emitEvent = (req, event, users, data) => {
    const io = req.app.get("io");
    const userSocket = getSockets(users);
    io.to(userSocket).emit(event, data)
    console.log("emiting event", event)

}

export const uploadFilesToCloudinary = async (files = []) => {
    const uploadPromises = files.map((file) => {
        return new Promise((resolve, reject) => {

            cloudinary.uploader.upload(getBase64(file), {
                resource_type: "auto",
                public_id: uuid(),
                folder: "chatApp-avatar",
            }, (error, result) => {
                if (error) return reject(error);
                resolve(result);
            })
        })
    })

    try {
        const result = await Promise.all(uploadPromises)

        const formattedResults = result.map((result) => ({
            url: result.secure_url,
            public_id: result.public_id
        }))
        return formattedResults;
    } catch (error) {
        throw new Error("Error uploading files to cloudinary", error);
    }

}

export const deleteFilesFromCloudinary = async (public_id) => {

    if(public_id.length > 0){
        try {
            for (let i = 0; i < public_id.length; i++) {
                // console.log(public_id[i])
                await cloudinary.uploader.destroy(public_id[i]);
            }
        } catch (error) {
            console.log(error)
            throw new Error("Error Deleting files to cloudinary", error);
        }
    }
    return []
}
// export const deleteFilesFromCloudinary = async (public_id) => {
//     if (!Array.isArray(public_id) || public_id.length === 0) {
//         throw new Error("Invalid public_id array");
//     }

//     try {

//         const deletePromises = public_id.map((id) => cloudinary.uploader.destroy(id));
//         await Promise.all(deletePromises);
//         console.log("delete files")
//         return { success: true, message: "Files deleted successfully" };
//     } catch (error) {

//         //   console.log("not delete files", error)
//         return { success: false, message: "Error deleting files" };
//     }
// };


