import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import { NextResponse } from "next/server";

/**
 * Reports the identity the SSR runtime resolves, for verifying the Amplify
 * compute role. GetCallerIdentity needs no IAM permission of its own, so a
 * failure here means credentials never arrived rather than a missing policy.
 *
 * Gated on SPIKE_WHOAMI, and returns no secret material — only which variables
 * are present. Do not rename the directory to `_spike`: App Router treats an
 * underscore prefix as private and drops the route from the build silently.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.SPIKE_WHOAMI !== "1") {
    return new NextResponse("Not found", { status: 404 });
  }

  const env = {
    AWS_ACCESS_KEY_ID: Boolean(process.env.AWS_ACCESS_KEY_ID),
    AWS_SECRET_ACCESS_KEY: Boolean(process.env.AWS_SECRET_ACCESS_KEY),
    AWS_SESSION_TOKEN: Boolean(process.env.AWS_SESSION_TOKEN),
    AWS_REGION: process.env.AWS_REGION ?? null,
    AWS_CONTAINER_CREDENTIALS_FULL_URI: Boolean(
      process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI,
    ),
    AWS_CONTAINER_CREDENTIALS_RELATIVE_URI: Boolean(
      process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI,
    ),
  };

  try {
    const client = new STSClient({
      region: process.env.AWS_REGION ?? "us-east-1",
    });
    const identity = await client.send(new GetCallerIdentityCommand({}));

    return NextResponse.json({
      resolved: true,
      arn: identity.Arn,
      account: identity.Account,
      env,
    });
  } catch (err) {
    return NextResponse.json(
      {
        resolved: false,
        error: err instanceof Error ? err.message : String(err),
        name: err instanceof Error ? err.name : undefined,
        env,
      },
      { status: 500 },
    );
  }
}
