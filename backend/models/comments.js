const mongoose = require ('mongoose');

const {Schema} = mongoose;

const commentSchema = new Schema ({
    content: {type: String, required: true},
    blog: {tyoe: mongoose.SchemaTypes.ObjectId, ref: 'blogs'},
    author: {type: mongoose.SchemaTypes.ObjectId, ref: 'users'}
},
     {timestamps: true}

);


module.exports = mongoose.model('Comment', commentSchema, 'comments');