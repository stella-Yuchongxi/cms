const fs = require('fs');
const express = require('express');
const router = express.Router();
const Post = require('../../models/Post'); // Ensure this line correctly imports the Post model
const path = require('path');
const {isEmpty, uploadDir} = require('../../helpers/upload-helper');
router.all('/*', (req, res, next) => {
    req.app.locals.layout = 'admin';
    next();
});

router.get('/', (req, res) => {
    // Uncomment the following block to fetch and render posts
    Post.find({}).lean().then(posts => {
        res.render('admin/posts/index', {posts: posts});
    }).catch(err => {
        console.log(err);
    });
    // Temporary line to test the route
    // res.render('admin/posts/create');
});
router.get('/edit/:id', (req, res) => {
    Post.findById(req.params.id).lean().then(post => {
        if (!post) {
            return res.status(404).send('Post not found');
        }
        res.render('admin/posts/edit', {post: post});
    }).catch(err => {
        console.log(err);
        res.redirect('/admin/posts');
    });
});
router.get('/my-posts', (req, res) => {
    // Post.find({ user: req.user.id }).populate('category').lean().then(posts => {
    //     res.render('admin/posts/my-posts', { posts: posts });
    // });
    res.render('admin/posts/my-posts');
});
router.get('/edit', (req, res) => {
})
router.get('/create', (req, res) => {
    res.render('admin/posts/create');
});

router.put('/edit/:id', (req, res) => {
    Post.findById(req.params.id).then(post => {
        if (!post) {
            return res.status(404).send('Post not found');
        }

        let allowComments = req.body.allowComments ? true : false;

        // Update post fields
        post.title = req.body.title;
        post.status = req.body.status;
        post.allowComments = allowComments;
        post.body = req.body.body;
        if(!isEmpty(req.files)){
            let file = req.files.file;
            filename = Date.now() + '_' + file.name;
            post.file = filename;
            file.mv('./public/uploads/' + filename,(err)=>{
                if(err) throw err;
            });
        }
        // Save updated post
        post.save().then(updatedPost => {
            req.flash('success', `Post ${post._id} updated!`);
            res.redirect('/admin/posts');
        }).catch(err => {
            console.log(err);
            res.redirect('/admin/posts/edit/' + req.params.id);
        });
    }).catch(err => {
        console.log(err);
        res.redirect('/admin/posts');
    });
});
router.delete('/:id', (req, res) => {
    Post.findById(req.params.id)
        .then(post => {
            if (!post) {
                req.flash('error', 'Post not found');
                return res.redirect('/admin/posts');
            }

            const uploadDir = './public/uploads/';

            // Unlink the file if it exists
            if (post.file) {
                fs.unlink(uploadDir + post.file, (err) => {
                    if (err) {
                        req.flash('error', `Failed to delete file associated with post ${post._id}`);
                        return res.redirect('/admin/posts');
                    }

                    // Use deleteOne to remove the post after file unlinking
                    Post.deleteOne({ _id: post._id }).then(() => {
                        req.flash('success', `Post ${post._id} was deleted successfully`);
                        res.redirect('/admin/posts');
                    }).catch(err => {
                        req.flash('error', 'Error occurred while deleting the post');
                        res.redirect('/admin/posts');
                    });
                });
            } else {
                // If no file exists, just delete the post
                Post.deleteOne({ _id: post._id }).then(() => {
                    req.flash('success', `Post ${post._id} was deleted successfully`);
                    res.redirect('/admin/posts');
                }).catch(err => {
                    req.flash('error', 'Error occurred while deleting the post');
                    res.redirect('/admin/posts');
                });
            }
        })
        .catch(err => {
            req.flash('error', 'Error occurred while finding the post');
            res.redirect('/admin/posts');
        });
});

router.post('/create', (req, res) => {
    let errors = [];

    let filename = 'default.jpg';  // Default filename if no file is uploaded

    if (!isEmpty(req.files)) {
        if (req.files && req.files.file) {
            let file = req.files.file;

            // Sanitize the filename
            filename = Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');

            // Correct the path to point to the right directory
            const uploadPath = path.join(__dirname, '../../public/uploads');
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, {recursive: true});
            }

            // Move the file to the correct directory
            file.mv(path.join(uploadPath, filename), (err) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send('Failed to upload file.');
                }

                // File upload success
                console.log('File Information:');
                console.log('Name:', file.name);
                console.log('Data:', file.data);
                console.log('Encoding:', file.encoding);
                console.log('Mimetype:', file.mimetype);
            });
        }
    }

    // Creating the new post after file handling is complete
    let allowComments = req.body.allowComments ? true : false;

    const newPost = new Post({
        title: req.body.title,
        status: req.body.status,
        allowComments: allowComments,
        body: req.body.body,
        file: filename  // Save the file name in the database
    });

    newPost.save().then(savedPost => {
        req.flash('success', `Post ${savedPost.id } added successfully!`);
        res.redirect('/admin/posts');
    }).catch(error => {
        console.log(error, 'could not save post');
        // res.redirect('/admin/posts/create');
    });


});

module.exports = router;
