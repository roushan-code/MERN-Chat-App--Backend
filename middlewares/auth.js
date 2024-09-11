import jwt from "jsonwebtoken";
import { ErrorHandler } from "../utils/utility.js";
import { TryCatch } from "./error.js";
import { User } from "../models/User.js";
import { adminSecretKey } from "../app.js";
import { chatApp_token } from "../constants/config.js";


const isAuthenticated = TryCatch(async (req, res, next) => {
    // console.log(req.cookies["chatApp-token"])
    // const token = req.cookies[chatApp_token];
    const token = req.headers["authorization"];
    // console.log(req.headers["authorization"])

    if (!token) return next(new ErrorHandler("Please login to access this route", 401));

    // console.log(token.split("Bearer ")[1])
    const verifyToken = token.split("Bearer ")[1];
    // console.log(token)

    const decodedData = jwt.verify(verifyToken, process.env.JWT_SECRET);
    req.user = decodedData.id;
    // console.log(req.user)

    next();
})

export const isAdmin = TryCatch(async (req, res, next) => {
    // console.log(req.cookies["chatApp-token"])
    // const token = req.cookies["chatApp-token-admin"];
    const token = req.headers["authorization"];
    if (!token) return next(new ErrorHandler("Only Admin can access this route", 401));

    const verifyToken = token.split("Bearer ")[1];

    const secretKey = jwt.verify(verifyToken, process.env.JWT_SECRET);

    const isMatched = secretKey === adminSecretKey;

    if (!isMatched) return next(new ErrorHandler("Invalid Admin Key", 401));

    next();
})

const socketAuthentication = async ( socket, next) => {
    try {
        
        const authToken = socket.request._query.authorization;

        if (!authToken) return next(new ErrorHandler("Please login to access this route", 401))

        const verifyToken = authToken.split("Bearer ")[1]
        // console.log("Verify Token", verifyToken)

        const decodedData = jwt.verify(verifyToken, process.env.JWT_SECRET);
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