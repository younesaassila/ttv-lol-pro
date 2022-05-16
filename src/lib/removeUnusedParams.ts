export default function removeUnusedParams(
  params: URLSearchParams,
  unusedParams = ["token", "sig"]
) {
  for (const unusedParam of unusedParams) {
    params.delete(unusedParam);
  }
}
