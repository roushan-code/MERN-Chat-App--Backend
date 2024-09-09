import jwt from "jsonwebtoken";
import { ErrorHandler } from "../utils/utility.js";
import { TryCatch } from "./error.js";
import { User } from "../models/User.js";
import { adminSecretKey } from "../app.js";
import { chatApp_token } from "../constants/config.js";


const isAuthenticated = TryCatch(async (req, res, next) => {
    // console.log(req.cookies["chatApp-token"])
    const token = req.cookies[chatApp_token];
    if (!token) return next(new ErrorHandler("Please login to access this route", 401));

    const decodedData = jwt.verify(token, process.env.JWT_SECRET);
    // console.log(decodedData);
    req.user = decodedData.id;
    // console.log(req.user)

    next();
})

export const isAdmin = TryCatch(async (req, res, next) => {
    // console.log(req.cookies["chatApp-token"])
    const token = req.cookies["chatApp-token-admin"];
    if (!token) return next(new ErrorHandler("Only Admin can access this route", 401));

    const secretKey = jwt.verify(token, process.env.JWT_SECRET);

    const isMatched = secretKey === adminSecretKey;

    if (!isMatched) return next(new ErrorHandler("Invalid Admin Key", 401));

    next();
})

const socketAuthentication = async (err, socket, next) => {
    try {
        if (err) return next(err);
        const authToken = socket.request.cookies[chatApp_token];
        // console.log(authToken)

        if (!authToken) return next(new ErrorHandler("Please login to access this route", 401))

        const decodedData = jwt.verify(authToken, process.env.JWT_SECRET);
        // console.log(decodedData)

        const user = await User.findById(decodedData.id);
        // console.log(user);

        if (!user) return next(new ErrorHandler("User not found", 404));
        socket.user = user;

        return next();
    } catch (error) {
        console.log(error);
        return next(new ErrorHandler("Please login to access this route", 401))


    }
}

export { isAuthenticated, socketAuthentication }