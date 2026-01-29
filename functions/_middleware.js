export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname.startsWith('www.')) {
    url.hostname = url.hostname.replace(/^www\./, '');
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
