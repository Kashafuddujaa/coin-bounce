const Joi = require('joi');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const UserDTO = require('../dto/user');
const JWTService = require('../services/JWTService');
const RefreshToken = require('../models/token');
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*_=+-]).{8,16}$/;

const authController = {

    async register(req , res , next) {
         
        // 1. validate user input
        const userRegisterSchema = Joi.object({
            username: Joi.string().min(5).max(30).required(),
            name: Joi.string().max(30).required(),
            email: Joi.string().email().required(),
            password: Joi.string().pattern(passwordPattern).required(),
            confirmPassword: Joi.ref('password')
        });

const {error} =  userRegisterSchema.validate(req.body);

        // 2. if error in validation -> return error via middleware
        if(error){
            return next(error);
        }

        // 3. if email or username is already registered -> return an error
        const {username , name , email , password} = req.body;

        try{

            const emailInUse = await User.exists({email});
            const usernameInUse = await User.exists({username});

            if(emailInUse){
               const error = {
                status: 409,
                message: 'Email already registerd, use another email!'
               }
               return next(error);
            }

            if(usernameInUse){
                const error = {
                    status: 409,
                    message: 'Username not available, choose a different one.'
                }
                return next(error);
            }
        }
        catch(error){
            return next (error);
        }

        // 4. password hash
      const hashedPassword = await bcrypt.hash(password, 10);


        // 5. store user data in db

         let accessToken;
         let refreshToken;
         let user;
         try {
                const userToRegister = new User({
                username,
                email,
                name,
                password: hashedPassword
            });
            user =  await userToRegister.save();
      
           // token generation
            accessToken = JWTService.signAccessToken({_id: user._id} , '30m');

            refreshToken = JWTService.signRefreshToken({_id: user._id} , '60m');
        } 
         
          catch (error) {
            return next(error);
         }
        // store refresh token in db
        await JWTService.storeRefreshToken(refreshToken, user._id)

        // send tokens in cookie
       res.cookie('accessToken', accessToken, {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true
       });

       res.cookie('refreshToken', refreshToken, {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true
       });

        // 6. response send

        const userDto = new UserDTO(user);
        return res.status(201).json({user: userDto, auth: true});
    },


     async login(req,res,next) {
        // 1.validate user input
        //2.if validation error, return error
        //3.Match username and password
        //4.Return Response



        // we expect input data to be in such shape:
        const userLoginSchema = Joi.object({
            username: Joi.string().min(5).max(30).required(),
            password: Joi.string().pattern(passwordPattern)
        });
       const {error} = userLoginSchema.validate(req.body);

       if (error) {
        return next (error);
       }


       const {username,password} = req.body;


       let user;
       try {
        // match username
           user =  await User.findOne({username: username});

         if(!user){
         const error = {
            status: 401,
            message: 'Invalid Username'
         }
          return next(error);
       }


       // match password
       // req.body.password ->hash->match

       const match = await bcrypt.compare(password, user.password);

       if(!match) {
        const error = {
            status: 401,
            message: 'Invalid Password'
        }
        return next(error);
       }


       }
        catch (error) {
        return next(error);
       }



       const accessToken = JWTService.signAccessToken({_id: user._id}, '30m');
       const refreshToken = JWTService.signRefreshToken({_id: user._id}, '60m');


       // update refresh token in db
     try{
     await RefreshToken.updateOne({
        _id: user._id
      },
            {token: refreshToken} ,
            {upsert: true}
             )
           }

             catch(error){
                return next(error);
             }


       res.cookie('accessToken', accessToken , {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true
       });

       res.cookie('refreshToken', refreshToken, {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true
       });

        const userDto = new UserDTO(user);


       return res.status(200).json({user: userDto, auth: true});
     },

     // logout
     async logout(req,res,next){
        console.log(req);
        // 1. Delete refresh token from database
        const {refreshToken} = req.cookies;

        try {
           await RefreshToken.deleteOne({token: refreshToken});
        } catch (error) {
            return next(error);
        }

        // delete cookies
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');


            // 2. Send response to user
           res.status(200).json({user: null, auth: false});
     },
     async refresh (req, res, next){

        // 1. get refresh token from cookies
        const orignalRefreshToken = req.cookies.refreshToken;

        // 2. verify refresh token
        let id;
        try {
           id = JWTService.verifyRefreshToken(orignalRefreshToken)._id;
        }
         catch (e) {
            const error = {
                status: 401,
                message: 'unauthorized'
            }
            return next (error);
        }


        try {
          const match = RefreshToken.findOne({_id: id, token: orignalRefreshToken});

          if (!match){
            const error = {
                status: 401,
                message: 'unauthorized'
            }

            return next(error);
          }
        } 
        catch(e) {
            return next (e);
        }


        // 3. generate new tokens

             try {
            const accessToken = JWTService.signAccessToken({_id: id}, '30m');
            const refreshToken = JWTService.signRefreshToken({_id: id}, '60m');

           await RefreshToken.updateOne({_id: id}, {token: refreshToken});

           res.cookies('accessToken', accessToken, {
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true
           })

           
           res.cookies('refreshToken', refreshToken, {
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true
           });
        } 
        catch (e) {
            return next(e);
        }

        const user = await User.findOne({_id: id});
        const userDto = new UserDTO(user);

        return res.status(200).json({user: userDto, auth: true});
        // 4. update db, return response

     

       
     }


}

module.exports = authController;