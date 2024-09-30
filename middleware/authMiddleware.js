
export default {
    isAuthenticated: (req, res, next) => {
        if (req.isAuthenticated()) {
            return next();
        } else {
            res.redirect("/login");
        }
    }
};
