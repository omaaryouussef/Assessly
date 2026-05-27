/**
 * Role-based authorization. Use after `authenticate` so `req.user.role` is set.
 *
 * @example
 * coursesRouter.post("/", authenticate, authorize("INSTRUCTOR"), createCourse);
 */
export const authorize = (...allowedRoles)=>{
  return (req, res, next) =>{
    if( !allowedRoles.includes(req.user.role) || !req.user?.role){
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  }
}
