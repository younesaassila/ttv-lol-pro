export default function stripUnusedParams(
  path: string,
  params = ["token", "sig"]
) {
  let tempUrl = new URL(`https://localhost/${path}`);
  for (const param of params) {
    tempUrl.searchParams.delete(param);
  }
  return `${tempUrl.pathname.substring(1)}${tempUrl.search}`;
}
