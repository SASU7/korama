export function trustedRequestOrigin(request: Request) {
  const supplied =
    request.headers.get("origin") || request.headers.get("referer");
  if (!supplied)
    return Response.json(
      { error: "A same-origin request is required" },
      { status: 403 },
    );
  try {
    const suppliedOrigin = new URL(supplied).origin;
    const requestUrl = new URL(request.url);
    const forwardedHost =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      requestUrl.host;
    const forwardedProto =
      request.headers.get("x-forwarded-proto") ||
      requestUrl.protocol.replace(":", "");
    if (suppliedOrigin === `${forwardedProto}://${forwardedHost}`) return null;
  } catch {
    /* invalid origin */
  }
  return Response.json(
    { error: "A same-origin request is required" },
    { status: 403 },
  );
}
