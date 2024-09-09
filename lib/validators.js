

// export const registerValidator = () => [
//   body("name", "Please Enter Name ").notEmpty().isString(),
//   body("username", "Please Enter Username ").notEmpty().isString().isLength({ min: 3, max: 20 }),
//   body("password", "Please Enter Password ").notEmpty().isString().isLength({ min: 8 }),
//     body("bio", "Please Enter bio ").notEmpty().isString(),
// ];

import { body, param, validationResult } from "express-validator";
import { ErrorHandler } from "../utils/utility.js";

export const validate = (req, res, next) => {
    const errors = validationResult(req);
    const errorMessage = errors.array().map((error) => error.msg);
    if (errors.isEmpty()) {
        return next()
    } else {
        next(new ErrorHandler(errorMessage, 400))
    }
};

export const registerValidator = () => [
    body("name", "Please Enter Name").notEmpty(),
    body("username", "Please Enter Username ").notEmpty(),
    body("password", "Please Enter Password ").notEmpty(),
    body("bio", "Please Enter Bio ").notEmpty(),
];


export const loginValidator = () => [
    body("username", "Please Enter Username ").notEmpty(),
    body("password", "Please Enter Password ").notEmpty(),
];

export const newGroupValidator = () => [
    body("name", "Please Enter Group Name").notEmpty(),
    body("members")
        .notEmpty()
        .withMessage("Please Enter Members")
        .isArray({ min: 2, max: 100 })
        .withMessage("minimum of 2 members and max: 100"),
]

export const addMemberValidator = () => [
    body("chatId", "Please Enter chatId").notEmpty(),
    body("members")
        .notEmpty()
        .withMessage("Please Enter Members")
        .isArray({ min: 1, max: 97 })
        .withMessage("minimum of 1 members and max: 97"),
]

export const removeMemberValidator = () => [
    body("chatId", "Please Enter chatId").notEmpty(),
    body("userId", "Please Enter userId").notEmpty(),
]

export const sendAttachmentsValidator = () => [
    body("chatId", "Please Enter chatId").notEmpty(),
    // check("files")
    // .notEmpty()
    // .withMessage("Please Upload Attachments")
    // .isArray({min: 1, max: 5})
    // .withMessage("minimum of 1 attachment and max: 5"),
]

export const chatIdValidator = () => [
    param("id", "Please Enter id").notEmpty(),
]
export const renameGroupValidator = () => [
    param("id", "Please Enter chatId").notEmpty(),
    body("name", "Please Enter Group New Name").notEmpty(),
]
export const sendRequestValidator = () => [
    body("userId", "Please Enter userId").notEmpty(),   
]
export const acceptRequestValidator = () => [
    body("requestId", "Please Enter requestId").notEmpty(),
    body("accept")
    .notEmpty()
    .withMessage("Please Add Accept")
    .isBoolean()
    .withMessage("Accept must be boolean"),
]

export const adminLoginValidator = () => [
    body("secretKey", "Please Enter secretKey").notEmpty(),
]


