import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/app/login",
  },
});

export const config = {
  matcher: ["/app/:path*"],
};
