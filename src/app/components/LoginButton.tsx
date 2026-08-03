import { Button } from "@base-ui/react";
import { signIn } from "next-auth/react";


export default function LoginButton() {
  return (
    <Button
      disabled={status === "loading"}
      onClick={() => signIn("azure-ad", { callbackUrl: "/" })}
    >
      {status === "loading" ? "Checking session..." : "Login"}
    </Button>
  )
}