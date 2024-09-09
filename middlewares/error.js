import { ErrorHandler } from "../utils/utility.js";

const errorMiddleware= (err, req, res, next)=>{
    const statusCode = err.statusCode || 500;
    const message = err.message ||  "Internal Server Error"

     // Wrong Mongodb id error
     if (err.name === "CastError") {
        const message = `Resource not found, Invalid: ${err.path}`;
        err = new ErrorHandler(message, 400);
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const message = `Duplicate ${Object.keys(err.keyValue)} Entered`;
        err = new ErrorHandler(message, 400);
    }

    // Wrong JWT error
    if (err.name == "JsonWebTokenError") {
        const message = `Json Web Tonken is invalid. Try again`;
        err = new ErrorHandler(message, 400);
    }

    // JWT Expire error
    if (err.name == "TokenExpiredError") {
        const message = `Json Web Tonken is Expired. Try again`;
        err = new ErrorHandler(message, 400);
    }

    res.status(statusCode).json({
        success: false,
        message: err.message,
    })

}

const TryCatch = (passedFunc)=> async(req, res, next)=>{
    try{
        await passedFunc(req, res, next);
    }catch(err){
        next(err);
    }
}

export {errorMiddleware, TryCatch}

// import { ErrorHandler } from "../utils/utility.js";

// const errorMiddleware = (err, req, res, next) => {
//   const statusCode = err.statusCode || 500;
//   const message = err.message || "Internal Server Error";

//   // Wrong Mongodb id error
//   if (err.name === "CastError") {
//     const newError = new ErrorHandler(`Resource not found, Invalid: ${err.path}`, 400);
//     return res.status(newError.statusCode).json({
//       success: false,
//       message: newError.message,
//     });
//   }

//   // Mongoose duplicate key error
//   if (err.code === 11000) {
//     const newError = new ErrorHandler(`Duplicate ${Object.keys(err.keyValue)} Entered`, 400);
//     return res.status(newError.statusCode).json({
//       success: false,
//       message: newError.message,
//     });
//   }

//   // Wrong JWT error
//   if (err.name === "JsonWebTokenError") {
//     const newError = new ErrorHandler("Json Web Token is invalid. Try again", 400);
//     return res.status(newError.statusCode).json({
//       success: false,
//       message: newError.message,
//     });
//   }

//   // JWT Expire error
//   if (err.name === "TokenExpiredError") {
//     const newError = new ErrorHandler("Json Web Token is Expired. Try again", 400);
//     return res.status(newError.statusCode).json({
//       success: false,
//       message: newError.message,
//     });
//   }

//   res.status(statusCode).json({
//     success: false,
//     message: message,
//   });
// };

// const TryCatch = (passedFunc) => async (req, res, next) => {
//   try {
//     await passedFunc(req, res, next);
//   } catch (err) {
//     if (next && typeof next === "function") {
//       next(err);
//     } else {
//       throw err;
//     }
//   }
// };

// export { errorMiddleware, TryCatch };