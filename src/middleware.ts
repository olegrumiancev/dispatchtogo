import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/operator/:path*",
    "/vendor/:path*",
    "/admin/:path*",
  ],
};
