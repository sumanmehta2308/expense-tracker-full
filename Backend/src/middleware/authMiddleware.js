import jwt from "jsonwebtoken";
export function verifyAccessToken(req, res, next) {
  const token = req.cookies?.accessToken;
  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized: Access token missing" });
  }
  try 
  {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) 
  {
    return res.status(401).json({ success: false, message: "Access token expired or invalid" });
  }
}
